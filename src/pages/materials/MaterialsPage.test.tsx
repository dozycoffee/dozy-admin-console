import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { Material } from '../../features/material/model/materialSchemas'
import { useChangeMaterialStatus, useMaterials, useRegisterMaterial } from '../../features/material/model/useMaterials'
import { ApiError } from '../../shared/api/ApiError'
import { MaterialsPage } from './MaterialsPage'

vi.mock('../../features/material/model/useMaterials', () => ({ useMaterials: vi.fn(), useChangeMaterialStatus: vi.fn(), useRegisterMaterial: vi.fn() }))

const material = (overrides: Partial<Material> = {}): Material => ({
  productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE', shelfLifeDays: 180, ...overrides,
})

const stubUser: AuthContextValue['user'] = { id: 'u1', name: '재고 담당', actorModes: [], permissions: [], scope: { warehouseIds: [] } }

const mutate = vi.fn()

function setup(items: Material[], { granted = [permissions.inventoryRead, permissions.inventoryWrite], total = items.length, state = {} }: { granted?: Permission[]; total?: number; state?: object } = {}) {
  vi.mocked(useMaterials).mockReturnValue({ isLoading: false, isError: false, data: { items, page: 0, size: 20, totalElements: total }, ...state } as never)
  vi.mocked(useChangeMaterialStatus).mockReturnValue({ mutate, isPending: false } as never)
  vi.mocked(useRegisterMaterial).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false, reset: vi.fn() } as never)
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MaterialsPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('MaterialsPage', () => {
  it('원자재를 코드·이름·카테고리·단위·유통기한·상태와 함께 보여준다', () => {
    setup([material(), material({ productId: 101, productCode: 'SUP-1', productName: '종이컵', category: 'SUPPLY', unit: 'EA', shelfLifeDays: null, productStatus: 'INACTIVE' })])

    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('BEAN-1')).toBeInTheDocument()
    expect(within(rows[0]).getByText('원두')).toBeInTheDocument()
    expect(within(rows[0]).getByText('180일')).toBeInTheDocument()
    expect(within(rows[0]).getByText('사용 중')).toBeInTheDocument()
    expect(within(rows[1]).getByText('소모품')).toBeInTheDocument()
    expect(within(rows[1]).getByText('없음')).toBeInTheDocument()
    expect(within(rows[1]).getByText('사용 중지')).toBeInTheDocument()
    expect(screen.getByText('2건')).toBeInTheDocument()
  })

  it('조건에 맞는 원자재가 없으면 안내한다', () => {
    setup([])

    expect(screen.getByText('조건에 맞는 원자재가 없습니다.')).toBeInTheDocument()
  })

  it('목록을 못 불러오면 오류 문구를 보여준다', () => {
    setup([], { state: { isError: true, data: undefined, error: new ApiError('denied', { status: 403 }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('코드를 대문자로 맞춰 카테고리·상태와 함께 조회한다', async () => {
    const user = userEvent.setup()
    setup([material()])

    await user.type(screen.getByLabelText('원자재 코드'), ' bean-1 ')
    await user.selectOptions(screen.getByLabelText('카테고리'), 'BEAN')
    await user.selectOptions(screen.getByLabelText('상태'), 'ACTIVE')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(vi.mocked(useMaterials)).toHaveBeenLastCalledWith({ code: 'BEAN-1', category: 'BEAN', status: 'ACTIVE', page: 0, size: 20 })
    expect(screen.getByLabelText('원자재 코드')).toHaveValue('BEAN-1')
  })

  it('초기화하면 조건을 모두 비우고 다시 조회한다', async () => {
    const user = userEvent.setup()
    setup([material()])

    await user.type(screen.getByLabelText('원자재 코드'), 'bean-1')
    await user.click(screen.getByRole('button', { name: '조회' }))
    await user.click(screen.getByRole('button', { name: '초기화' }))

    expect(vi.mocked(useMaterials)).toHaveBeenLastCalledWith({ page: 0, size: 20 })
    expect(screen.getByLabelText('원자재 코드')).toHaveValue('')
  })

  it('20건을 넘으면 페이지를 넘길 수 있다', async () => {
    const user = userEvent.setup()
    setup([material()], { total: 45 })

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(vi.mocked(useMaterials)).toHaveBeenLastCalledWith({ page: 1, size: 20 })
  })

  describe('쓰기 권한(inventory.write)', () => {
    it('권한이 있으면 등록 버튼과 상태 변경 버튼을 보여준다', () => {
      setup([material()])

      expect(screen.getByRole('button', { name: '원자재 등록' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '에티오피아 원두 사용 중지' })).toBeInTheDocument()
    })

    it('권한이 없으면 목록은 보이고 등록·상태 변경 버튼과 관리 열은 없다', () => {
      setup([material()], { granted: [permissions.inventoryRead] })

      expect(screen.getByText('에티오피아 원두')).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '원자재 등록' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /사용 중지$/ })).not.toBeInTheDocument()
      expect(screen.queryByRole('columnheader', { name: '관리' })).not.toBeInTheDocument()
    })

    it('등록 버튼을 누르면 등록 폼 모달을 연다', async () => {
      const user = userEvent.setup()
      setup([material()])

      await user.click(screen.getByRole('button', { name: '원자재 등록' }))

      expect(screen.getByRole('dialog', { name: '원자재 등록' })).toBeInTheDocument()
    })
  })

  describe('상태 변경', () => {
    it('사용 중지는 확인을 거친 뒤에만 요청한다', async () => {
      const user = userEvent.setup()
      setup([material()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 사용 중지' }))
      expect(mutate).not.toHaveBeenCalled()
      expect(screen.getByText('에티오피아 원두은(는) 새 예약에 쓸 수 없게 됩니다.')).toBeInTheDocument()
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '사용 중지' }))

      expect(mutate).toHaveBeenCalledWith({ productId: 100, productStatus: 'INACTIVE' }, expect.anything())
    })

    it('확인창에서 취소하면 요청하지 않는다', async () => {
      const user = userEvent.setup()
      setup([material()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 사용 중지' }))
      await user.click(screen.getByRole('button', { name: '취소' }))

      expect(mutate).not.toHaveBeenCalled()
    })

    it('사용 중지한 원자재는 사용 재개로 ACTIVE로 되돌린다', async () => {
      const user = userEvent.setup()
      setup([material({ productStatus: 'INACTIVE' })])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 사용 재개' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '사용 재개' }))

      expect(mutate).toHaveBeenCalledWith({ productId: 100, productStatus: 'ACTIVE' }, expect.anything())
    })

    it('요청이 실패하면 오류 문구를 보여준다', async () => {
      const user = userEvent.setup()
      mutate.mockImplementation((_variables: unknown, options: { onError: (error: unknown) => void }) => options.onError(new ApiError('nf', { status: 404, code: 'INV_PRODUCT_NOT_FOUND' })))
      setup([material()])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 사용 중지' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '사용 중지' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('원자재를 찾을 수 없습니다')
    })
  })
})
