import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { useAllMaterials } from '../../features/material/model/useMaterials'
import type { ReconciliationProposal } from '../../features/reconciliation/model/reconciliationSchemas'
import { useApproveReconciliation, useReconciliationProposals, useRejectReconciliation } from '../../features/reconciliation/model/useReconciliations'
import { useWarehouseList } from '../../features/warehouse/model/useWarehouses'
import { ApiError } from '../../shared/api/ApiError'
import { ReconciliationsPage } from './ReconciliationsPage'

vi.mock('../../features/reconciliation/model/useReconciliations', () => ({ useReconciliationProposals: vi.fn(), useApproveReconciliation: vi.fn(), useRejectReconciliation: vi.fn() }))
vi.mock('../../features/material/model/useMaterials', () => ({ useAllMaterials: vi.fn() }))
vi.mock('../../features/warehouse/model/useWarehouses', () => ({ useWarehouseList: vi.fn() }))

const proposal = (overrides: Partial<ReconciliationProposal> = {}): ReconciliationProposal => ({
  stockAdjustmentId: 31, warehouseId: 10, reconciliationRunId: 4, status: 'PENDING', productId: 100, lotId: 7, lotNumber: 'LOT-A', qualityStatus: 'NORMAL',
  inventoryQuantity: 10, wmsQuantity: 8, quantityChange: -2, requiresAdmin: false, inventoryId: 500, approvedBy: null, approvedAt: null, ...overrides,
})
const materials = [{ productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE' }]
const warehouses = [{ warehouseId: 10, warehouseName: '서울 본사 창고', address: '서울', latitude: 37.5, longitude: 127, warehouseStatus: 'AVAILABLE' }]
const stubUser: AuthContextValue['user'] = { id: 'u1', name: '재고 담당', actorModes: [], permissions: [], scope: { warehouseIds: [] } }

const approve = vi.fn()
const reject = vi.fn()

function setup(items: ReconciliationProposal[], { granted = [permissions.inventoryRead, permissions.inventoryWrite], page = { page: 0, size: 20, totalElements: items.length, totalPages: 1 }, state = {}, path = '/reconciliations', warehouseData = warehouses, approving = false }: { granted?: Permission[]; page?: object; state?: object; path?: string; warehouseData?: unknown; approving?: boolean } = {}) {
  vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: false, isError: false, data: { items, ...page }, ...state } as never)
  vi.mocked(useAllMaterials).mockReturnValue({ data: materials } as never)
  vi.mocked(useWarehouseList).mockReturnValue({ data: warehouseData } as never)
  vi.mocked(useApproveReconciliation).mockReturnValue({ mutate: approve, isPending: approving } as never)
  vi.mocked(useRejectReconciliation).mockReturnValue({ mutate: reject, isPending: false } as never)
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={[path]}><ReconciliationsPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ReconciliationsPage', () => {
  it('보정안을 상품·창고·Lot·두 수량·변동량·상태와 함께 보여준다', () => {
    setup([proposal()])

    const row = within(screen.getByRole('table')).getByText('에티오피아 원두').closest('tr')!
    expect(within(row).getByText('BEAN-1')).toBeInTheDocument()
    expect(within(row).getByText('서울 본사 창고')).toBeInTheDocument()
    expect(within(row).getByText('LOT-A')).toBeInTheDocument()
    expect(within(row).getByText('정상')).toBeInTheDocument()
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent)
    expect(cells.slice(3, 6)).toEqual(['10', '8', '-2']) // inventory, WMS, 변동량
    expect(within(row).getByText('승인 대기')).toBeInTheDocument()
    expect(screen.getByText('1건')).toBeInTheDocument()
  })

  it('이름을 못 읽으면 id로 보여주고 창고는 id 입력으로 거른다', () => {
    setup([proposal({ productId: 999 })], { warehouseData: [] })

    expect(screen.getByText('상품 999')).toBeInTheDocument()
    expect(screen.getByLabelText('창고 id')).toBeInTheDocument()
  })

  it('늘어난 변동은 +로, 임계치를 넘은 건은 표시한다', () => {
    setup([proposal({ quantityChange: 5, wmsQuantity: 15, requiresAdmin: true })])

    expect(screen.getByText('+5')).toBeInTheDocument()
    expect(screen.getByText('임계치 초과')).toBeInTheDocument()
  })

  it('처리된 보정안은 상태와 처리 시각만 보이고 승인·거절 버튼이 없다', () => {
    setup([proposal({ status: 'APPLIED', approvedBy: 'u1', approvedAt: '2026-10-15T09:00:00' })])

    expect(within(screen.getByRole('table')).getByText('반영됨')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /승인$/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /거절$/ })).not.toBeInTheDocument()
  })

  it('보정안이 없으면 안내하고 목록을 못 불러오면 오류 문구를 보여준다', () => {
    const { unmount } = setup([])
    expect(screen.getByText('조건에 맞는 보정안이 없습니다.')).toBeInTheDocument()
    unmount()

    setup([], { state: { isError: true, data: undefined, error: new ApiError('x', { status: 502, code: 'INV_WMS_UNAVAILABLE' }) } })
    expect(screen.getByRole('alert')).toHaveTextContent('WMS')
  })

  describe('필터', () => {
    it('처음에는 승인 대기 보정안을 보여준다', () => {
      setup([proposal()])

      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ status: 'PENDING', page: 0, size: 20 })
      expect(screen.getByLabelText('상태')).toHaveValue('PENDING')
    })

    it('주소의 status로 처음 상태를 정하고 알 수 없는 값은 승인 대기로 대신한다', () => {
      const { unmount } = setup([proposal()], { path: '/reconciliations?status=REJECTED' })
      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ status: 'REJECTED', page: 0, size: 20 })
      unmount()

      setup([proposal()], { path: '/reconciliations?status=BOGUS' })
      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ status: 'PENDING', page: 0, size: 20 })
    })

    it('창고와 상태를 골라 조회하고 초기화하면 조건을 모두 푼다', async () => {
      const user = userEvent.setup()
      setup([proposal()])

      await user.selectOptions(screen.getByLabelText('창고'), '10')
      await user.selectOptions(screen.getByLabelText('상태'), '')
      await user.click(screen.getByRole('button', { name: '조회' }))
      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ warehouseId: 10, page: 0, size: 20 })

      await user.click(screen.getByRole('button', { name: '초기화' }))
      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ page: 0, size: 20 })
    })

    it('창고 id가 양의 정수가 아니면 조회하지 않고 안내한다', async () => {
      const user = userEvent.setup()
      setup([proposal()], { warehouseData: [] })

      await user.type(screen.getByLabelText('창고 id'), '0')
      await user.click(screen.getByRole('button', { name: '조회' }))

      expect(screen.getByRole('alert')).toHaveTextContent('창고 id는 양의 정수여야 합니다.')
    })

    it('여러 페이지면 다음 페이지를 요청한다', async () => {
      const user = userEvent.setup()
      setup([proposal()], { page: { page: 0, size: 20, totalElements: 45, totalPages: 3 } })

      await user.click(screen.getByRole('button', { name: '다음' }))

      expect(vi.mocked(useReconciliationProposals)).toHaveBeenLastCalledWith({ status: 'PENDING', page: 1, size: 20 })
    })
  })

  describe('쓰기 권한(inventory.write)', () => {
    it('권한이 없으면 목록은 보이고 승인·거절 버튼과 처리 열이 없다', () => {
      setup([proposal()], { granted: [permissions.inventoryRead] })

      expect(screen.getByText('에티오피아 원두')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /승인$/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /거절$/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: '처리' })).not.toBeInTheDocument()
    })
  })

  describe('승인·거절', () => {
    it('승인은 수량 비교를 보여주는 확인을 거친 뒤에만 요청한다', async () => {
      const user = userEvent.setup()
      setup([proposal()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 승인' }))
      expect(approve).not.toHaveBeenCalled()
      expect(screen.getByText(/inventory 10 → WMS 8 \(-2\)/)).toBeInTheDocument()
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '승인' }))

      expect(approve).toHaveBeenCalledWith(31, expect.anything())
      expect(reject).not.toHaveBeenCalled()
    })

    it('거절도 확인을 거치며 승인 요청은 보내지 않는다', async () => {
      const user = userEvent.setup()
      setup([proposal()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 거절' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '거절' }))

      expect(reject).toHaveBeenCalledWith(31, expect.anything())
      expect(approve).not.toHaveBeenCalled()
    })

    it('확인창에서 취소하면 요청하지 않는다', async () => {
      const user = userEvent.setup()
      setup([proposal()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 승인' }))
      await user.click(screen.getByRole('button', { name: '취소' }))

      expect(approve).not.toHaveBeenCalled()
      expect(reject).not.toHaveBeenCalled()
    })

    it('승인 중 수량이 바뀌어 409가 오면 새 값을 확인하고 다시 승인하라고 안내한다', async () => {
      const user = userEvent.setup()
      approve.mockImplementation((_id: number, options: { onError: (error: unknown) => void }) => options.onError(new ApiError('changed', { status: 409, code: 'INV_RECONCILIATION_CHANGED' })))
      setup([proposal()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 승인' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '승인' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('다시 승인해 주세요')
    })

    it('요청하는 동안 승인·거절 버튼을 잠근다', () => {
      setup([proposal()], { approving: true })

      expect(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 승인' })).toBeDisabled()
      expect(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 거절' })).toBeDisabled()
    })
  })
})
