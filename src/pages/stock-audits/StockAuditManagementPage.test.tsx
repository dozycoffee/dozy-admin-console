import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { StockAudit } from '../../features/stock-audit/model/stockAuditSchemas'
import {
  useAssignStockAudit, useCloseStockAudit, useCompleteStockAudit, useCountStockAuditItem, useRegisterStockAudit, useStockAuditItems, useStockAudits, type StockAuditItemView,
} from '../../features/stock-audit/model/useStockAudits'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { ApiError } from '../../shared/api/ApiError'
import { StockAuditManagementPage } from './StockAuditManagementPage'

vi.mock('../../features/stock-audit/model/useStockAudits', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../features/stock-audit/model/useStockAudits')>()),
  useStockAudits: vi.fn(), useStockAuditItems: vi.fn(), useRegisterStockAudit: vi.fn(), useAssignStockAudit: vi.fn(), useCountStockAuditItem: vi.fn(), useCompleteStockAudit: vi.fn(), useCloseStockAudit: vi.fn(),
}))
vi.mock('../../features/inventory/model/useZoneInventorySummary', () => ({ useZoneInventorySummary: vi.fn() }))

const audit = (status: StockAudit['status'], overrides: Partial<StockAudit> = {}): StockAudit => ({ stockAuditId: 7, warehouseId: 543, zoneId: 3, status, assignee: null, approvedBy: null, ...overrides })
const item = (overrides: Partial<StockAuditItemView> = {}): StockAuditItemView => ({
  stockAuditItemId: 70, stockAuditId: 7, locationStockId: 9, snapshotQuantity: 5, countedQuantity: null, discrepancy: null, hasUncommittedMovement: false, locationCode: 'A-01', productName: '에티오피아 원두', lotNumber: 'LOT-1', ...overrides,
})
const stubUser: AuthContextValue['user'] = { id: 'u1', name: '창고 담당', actorModes: [], permissions: [], scope: { warehouseIds: [543] } }
const counts = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 }

const assign = vi.fn()
const count = vi.fn()
const complete = vi.fn()
const close = vi.fn()
const mutation = (mutate: () => void, error: unknown = null) => ({ mutate, isPending: false, error }) as never

function setup(target: StockAudit, items: StockAuditItemView[], { granted = [permissions.stockAuditRead, permissions.stockAuditWrite], closeError = null }: { granted?: Permission[]; closeError?: unknown } = {}) {
  vi.mocked(useStockAudits).mockReturnValue({ isLoading: false, isError: false, data: { items: [target], total: 1, page: 1, size: 4, statusCounts: { ...counts, [target.status]: 1 } } } as never)
  vi.mocked(useStockAuditItems).mockReturnValue({ data: items, isLoading: false, isError: false, error: null })
  vi.mocked(useZoneInventorySummary).mockReturnValue({ data: [{ zoneId: 3, zoneCode: 'A', warehouseId: 543 }], isError: false } as never)
  vi.mocked(useRegisterStockAudit).mockReturnValue(mutation(vi.fn()))
  vi.mocked(useAssignStockAudit).mockReturnValue(mutation(assign))
  vi.mocked(useCountStockAuditItem).mockReturnValue(mutation(count))
  vi.mocked(useCompleteStockAudit).mockReturnValue(mutation(complete))
  vi.mocked(useCloseStockAudit).mockReturnValue(mutation(close, closeError))
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <StockAuditManagementPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('StockAuditManagementPage', () => {
  it('실사 예정 건은 항목 스냅샷을 보여주고 확인 후 시작(배정)한다', async () => {
    setup(audit('SCHEDULED'), [item()])

    expect(screen.getByText('에티오피아 원두')).toBeInTheDocument()
    expect(screen.getByText(/A-01 · LOT-1 · 스냅샷 5 ea/)).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '실사 시작' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '실사 시작' }))

    expect(assign).toHaveBeenCalledWith(7)
  })

  it('쓰기 권한이 없으면 등록·시작 버튼이 잠긴다', () => {
    setup(audit('SCHEDULED'), [item()], { granted: [permissions.stockAuditRead] })

    expect(screen.getByRole('button', { name: '실사 시작' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '실사 등록' })).toBeDisabled()
  })

  it('실사 진행 중에는 항목별 실사 수량을 저장하고, 모두 입력해야 완료할 수 있다', async () => {
    setup(audit('IN_PROGRESS', { assignee: '창고 담당' }), [item(), item({ stockAuditItemId: 71, locationStockId: 10, countedQuantity: 3, discrepancy: -2, productName: '우유' })])

    expect(screen.getByRole('button', { name: '실사 완료' })).toBeDisabled()
    const saveButtons = screen.getAllByRole('button', { name: '저장' })
    expect(saveButtons[0]).toBeDisabled()
    await userEvent.type(screen.getAllByLabelText('실사 수량')[0], '4')
    await userEvent.click(saveButtons[0])

    expect(count).toHaveBeenCalledWith({ stockAuditItemId: 70, countedQuantity: 4 })
  })

  it('모든 항목을 입력하면 확인 후 실사를 완료한다', async () => {
    setup(audit('IN_PROGRESS'), [item({ countedQuantity: 5, discrepancy: 0 })])

    await userEvent.click(screen.getByRole('button', { name: '실사 완료' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '실사 완료' }))

    expect(complete).toHaveBeenCalledWith(7)
  })

  it('완료된 실사는 차이와 스냅샷 이후 변동 표시를 보여주고 확인 후 조정을 확정한다', async () => {
    setup(audit('COMPLETED'), [item({ countedQuantity: 3, discrepancy: -2, hasUncommittedMovement: true })])

    expect(screen.getByText('-2')).toBeInTheDocument()
    expect(screen.getByText('스냅샷 이후 재고가 변동되었습니다')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: '조정 확정' }))
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '조정 확정' }))

    expect(close).toHaveBeenCalledWith(7)
  })

  it('임계치 초과로 확정이 거부되면 승인자(admin) 확정이 필요하다고 안내한다', () => {
    setup(audit('COMPLETED'), [item({ countedQuantity: 30, discrepancy: 25 })], { closeError: new ApiError('x', { status: 409, code: 'STOCK_AUDIT_APPROVAL_REQUIRED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('상위 승인자(admin)')
  })

  it('확정된 실사에는 작업 버튼이 없다', () => {
    setup(audit('CLOSED', { approvedBy: '박관리' }), [item({ countedQuantity: 5, discrepancy: 0 })])

    expect(screen.queryByRole('button', { name: '조정 확정' })).not.toBeInTheDocument()
    expect(screen.getByText('박관리')).toBeInTheDocument()
  })
})
