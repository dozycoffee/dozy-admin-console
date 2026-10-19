import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { ZodError } from 'zod'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions } from '../../features/auth/model/permissions'
import type { Inbound } from '../../features/inbound/model/inboundSchemas'
import * as inboundHooks from '../../features/inbound/model/useInbounds'
import { useProducts } from '../../features/product/model/useProducts'
import { RESPONSE_SHAPE_MESSAGE } from '../../shared/api/displayMessage'
import { InboundManagementPage } from './InboundManagementPage'

vi.mock('../../features/inbound/model/useInbounds')
vi.mock('../../features/product/model/useProducts')
const hooks = vi.mocked(inboundHooks)

const counts = { EXPECTED: 0, WAITING: 0, PROCESSING: 1, COMPLETED: 0 }
const inbound = (status: Inbound['status']): Inbound => ({ inboundId: 1, warehouseId: 1, expectedArrivalDate: '2026-10-19', status })
const baseItem = { inboundId: 1, zoneId: 1, expectedLotNumber: null, expectedExpirationDate: null, productCode: 'P', zoneCode: 'A' as const, shelfLifeDays: null }
const pendingItem = { ...baseItem, inboundItemId: 11, productId: 2, expectedQuantity: 30, actualQuantity: null, inspectionStatus: 'PENDING' as const, quantityDiscrepancy: null, receipts: [], productName: '브라질' }
const doneItem = { ...baseItem, inboundItemId: 12, productId: 3, expectedQuantity: 50, actualQuantity: 48, inspectionStatus: 'INSPECTED' as const, quantityDiscrepancy: -2, productName: '에티오피아',
  receipts: [{ inboundReceiptId: 1, lotNumber: 'LOT-A', manufactureDate: null, expirationDate: '2027-01-01', quantity: 46, inspectionResult: 'NORMAL' as const, defectReason: null }, { inboundReceiptId: 2, lotNumber: 'LOT-A', manufactureDate: null, expirationDate: '2027-01-01', quantity: 2, inspectionResult: 'DEFECTIVE' as const, defectReason: 'DAMAGED' as const }] }

const mutate = { start: vi.fn(), inspect: vi.fn(), complete: vi.fn() }
const idle = (fn: ReturnType<typeof vi.fn>, error: unknown = null) => ({ mutate: fn, isPending: false, isError: error !== null, error }) as never

function setup(status: Inbound['status'], items: unknown[], itemsState: Record<string, unknown> = {}, inspectError: unknown = null) {
  hooks.useInbounds.mockReturnValue({ isLoading: false, isError: false, data: { items: [inbound(status)], total: 1, page: 1, size: 4, statusCounts: counts } } as never)
  hooks.useInboundItems.mockReturnValue({ data: items, isLoading: false, isError: false, error: null, ...itemsState } as never)
  vi.mocked(useProducts).mockReturnValue({ data: [] } as never)
  hooks.useRegisterInbound.mockReturnValue(idle(vi.fn()))
  hooks.useStartInboundProcessing.mockReturnValue(idle(mutate.start))
  hooks.useInspectInboundItem.mockReturnValue(idle(mutate.inspect, inspectError))
  hooks.useCompleteInbound.mockReturnValue(idle(mutate.complete))
  const user: AuthContextValue['user'] = { id: 'u', name: '테스트', actorModes: [], permissions: [permissions.inboundRead, permissions.inboundWrite], scope: { warehouseIds: [1] } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: (permission) => user.permissions.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter><InboundManagementPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.resetAllMocks())

describe('InboundManagementPage 검수·완료', () => {
  it('검수 전 품목은 수령 라인 입력을 보여주고 Lot 확정 단계는 없다', () => {
    setup('PROCESSING', [pendingItem])

    expect(screen.getByLabelText('Lot 번호')).toBeInTheDocument()
    expect(screen.queryByText('Lot 확정')).not.toBeInTheDocument()
    expect(screen.getByText('모든 품목의 검수를 저장하면 입고를 완료할 수 있습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '입고 완료 · 재고 등록' })).not.toBeInTheDocument()
  })

  it('검수 저장은 확인 뒤 수령 라인 본문으로 요청한다', async () => {
    setup('PROCESSING', [pendingItem])

    await userEvent.type(screen.getByLabelText('Lot 번호'), 'LOT-1')
    await userEvent.click(screen.getByRole('button', { name: '검수 저장' }))
    expect(screen.getByText('브라질 검수를 저장할까요?')).toBeInTheDocument()
    expect(mutate.inspect).not.toHaveBeenCalled()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '검수 저장' }))

    expect(mutate.inspect).toHaveBeenCalledWith({ inboundItemId: 11, body: { receipts: [{ lotNumber: 'LOT-1', quantity: 30, inspectionResult: 'NORMAL' }] } })
  })

  it('검수가 끝난 품목은 수령 라인과 예정 대비 차이를 보여준다', () => {
    setup('PROCESSING', [pendingItem, doneItem])

    const done = screen.getByText('에티오피아').closest('article') as HTMLElement
    expect(within(done).getAllByText(/Lot LOT-A/)).toHaveLength(2)
    expect(within(done).getByText('46 ea')).toBeInTheDocument()
    expect(within(done).getByText('불량 · 파손')).toBeInTheDocument()
    expect(within(done).getByText('예정 대비 -2 ea')).toBeInTheDocument()
  })

  it('모든 품목을 검수하면 확인 뒤 본문 없이 입고를 완료한다', async () => {
    setup('PROCESSING', [doneItem])

    await userEvent.click(screen.getByRole('button', { name: '입고 완료 · 재고 등록' }))
    expect(screen.getByText('입고를 완료할까요?')).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '입고 완료' }))

    expect(mutate.complete).toHaveBeenCalledWith(1)
  })

  it('미도착으로 검수한 품목은 그렇게 표시한다', () => {
    setup('PROCESSING', [{ ...doneItem, actualQuantity: 0, quantityDiscrepancy: -50, receipts: [] }])

    expect(screen.getByText('미도착 (수령 0)')).toBeInTheDocument()
  })

  it('품목 응답이 계약과 달라 검증에 실패하면 JSON 대신 안내 문구를 보여준다', () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = new ZodError([{ code: 'invalid_value', values: ['PENDING'], path: [0, 'inspectionResult'], message: 'Invalid option' }])
    setup('COMPLETED', undefined as never, { data: undefined, isError: true, error: failure })

    expect(screen.getByText(RESPONSE_SHAPE_MESSAGE)).toBeInTheDocument()
    expect(screen.queryByText(/invalid_value/)).not.toBeInTheDocument()
  })

  it('검수 저장이 서버 오류로 실패하면 서버 메시지를 보여준다', () => {
    setup('PROCESSING', [pendingItem], {}, new Error('수령 수량이 예정 수량을 초과했습니다.'))

    expect(screen.getByText('수령 수량이 예정 수량을 초과했습니다.')).toBeInTheDocument()
  })
})
