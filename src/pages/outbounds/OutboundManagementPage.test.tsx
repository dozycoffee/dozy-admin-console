import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions } from '../../features/auth/model/permissions'
import type { Outbound } from '../../features/outbound/model/outboundSchemas'
import * as outboundHooks from '../../features/outbound/model/useOutbounds'
import { OutboundManagementPage } from './OutboundManagementPage'

vi.mock('../../features/outbound/model/useOutbounds')
const hooks = vi.mocked(outboundHooks)

const counts = { REQUESTED: 1, PICKING: 1, INSPECTING: 0, COMPLETED: 2, CANCEL_REQUESTED: 1, CANCELED: 1 }
const outbound = (outboundId: number, status: Outbound['status'], extra: Partial<Outbound> = {}): Outbound => ({ outboundId, warehouseId: 1, status, reservationId: 9, channel: 'APP', externalOrderId: 'ORD-7', ...extra })
const item = { outboundItemId: 1, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: null, shortageQuantity: null, productName: '에티오피아', productCode: 'BEAN-1' }
const allocation = (id: number, lot: string, quantity: number) => ({ outboundAllocationId: id, outboundItemId: 1, productId: 2, inventoryId: 30 + id, lotNumber: lot, expirationDate: '2026-12-01', quantity, pickedQuantity: null })

const mutate = { startPicking: vi.fn(), startInspecting: vi.fn(), complete: vi.fn(), cancel: vi.fn(), shortage: vi.fn() }
const idle = (fn: ReturnType<typeof vi.fn>) => ({ mutate: fn, isPending: false, isError: false, error: null }) as never

function setup(selected: Outbound, allocations = [allocation(5, 'LOT-1', 8), allocation(6, 'LOT-2', 2)], writable = true) {
  hooks.useOutbounds.mockReturnValue({ isLoading: false, isError: false, data: { items: [selected], total: 1, page: 1, size: 4, statusCounts: counts } } as never)
  hooks.useOutboundItems.mockReturnValue({ data: [item], isLoading: false, isError: false, error: null } as never)
  hooks.useOutboundAllocations.mockReturnValue({ data: allocations, isLoading: false, isError: false } as never)
  hooks.useStartOutboundPicking.mockReturnValue(idle(mutate.startPicking))
  hooks.useStartOutboundInspecting.mockReturnValue(idle(mutate.startInspecting))
  hooks.useCompleteOutbound.mockReturnValue(idle(mutate.complete))
  hooks.useRequestOutboundCancel.mockReturnValue(idle(mutate.cancel))
  hooks.useReportPickingShortage.mockReturnValue(idle(mutate.shortage))
  const user: AuthContextValue['user'] = { id: 'u', name: '테스트', actorModes: [], permissions: writable ? [permissions.outboundRead, permissions.outboundWrite] : [permissions.outboundRead], scope: { warehouseIds: [1] } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: (permission) => user.permissions.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter><OutboundManagementPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => { vi.resetAllMocks() })

describe('OutboundManagementPage', () => {
  it('요약에 취소 승인 대기 건수를 보여주고 수동 등록 폼은 없다', () => {
    setup(outbound(1, 'REQUESTED'))

    const summary = screen.getByLabelText('출고 작업 요약')
    expect(within(summary).getByText('취소 승인 대기')).toBeInTheDocument()
    expect(within(summary).getByText('취소 승인 대기').parentElement).toHaveTextContent('1')
    expect(screen.queryByText('출고 등록')).not.toBeInTheDocument()
    expect(screen.queryByText(/우선 출고 권고/)).not.toBeInTheDocument()
  })

  it('작업 큐에 취소 탭이 있다', () => {
    setup(outbound(1, 'REQUESTED'))

    expect(screen.getByRole('tab', { name: /취소/ })).toBeInTheDocument()
  })

  it('출고 상세에 채널·주문·예약과 Lot별 피킹 계획을 보여준다', () => {
    setup(outbound(1, 'REQUESTED'))

    expect(screen.getByText('APP')).toBeInTheDocument()
    expect(screen.getByText('ORD-7')).toBeInTheDocument()
    expect(screen.getByText('#9')).toBeInTheDocument()
    expect(screen.getByText('Lot LOT-1 · 유통기한 2026-12-01')).toBeInTheDocument()
    expect(screen.getByText('8 ea')).toBeInTheDocument()
  })

  it('피킹 전 출고는 출고 취소 확인 뒤 바로 취소를 요청한다', async () => {
    setup(outbound(1, 'REQUESTED'))

    await userEvent.click(screen.getByRole('button', { name: '출고 취소' }))
    expect(screen.getByText('출고를 취소할까요?')).toBeInTheDocument()
    expect(screen.getByText(/바로 취소되고 예약이 해제됩니다/)).toBeInTheDocument()
    await userEvent.click(within(screen.getByRole('dialog')).getByRole('button', { name: '출고 취소' }))

    expect(mutate.cancel).toHaveBeenCalledWith(1)
  })

  it('피킹 중 출고는 취소 요청이 관리자 승인을 기다린다는 안내를 보여준다', async () => {
    setup(outbound(1, 'PICKING'))

    await userEvent.click(screen.getByRole('button', { name: '취소 요청' }))

    expect(screen.getByText('취소를 요청할까요?')).toBeInTheDocument()
    expect(screen.getByText(/관리자가 상품 원위치를 확인하고 승인해야 취소됩니다/)).toBeInTheDocument()
  })

  it('취소 승인 대기 출고는 대기 안내만 보여주고 취소·부족 보고 버튼은 없다', () => {
    setup(outbound(1, 'CANCEL_REQUESTED'))

    expect(screen.getByText('관리자 승인을 기다립니다', { exact: false })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /취소 요청|출고 취소/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '부족 보고 · 재할당' })).not.toBeInTheDocument()
  })

  it('취소된 출고는 취소됨 안내를 보여준다', () => {
    setup(outbound(1, 'CANCELED'))

    expect(screen.getByRole('heading', { name: '취소됨' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /취소 요청|출고 취소/ })).not.toBeInTheDocument()
  })

  it('피킹 중이면 Lot별 부족 수량을 입력해 보고한다', async () => {
    setup(outbound(1, 'PICKING'))

    const submit = screen.getByRole('button', { name: '부족 보고 · 재할당' })
    expect(submit).toBeDisabled()
    const inputs = screen.getAllByLabelText('부족 수량')
    await userEvent.type(inputs[0], '3')
    expect(submit).toBeEnabled()
    await userEvent.click(submit)
    await userEvent.click(screen.getByRole('button', { name: '부족 보고' }))

    expect(mutate.shortage).toHaveBeenCalledTimes(1)
    expect(mutate.shortage.mock.calls[0][0]).toEqual({ outboundId: 1, shortages: [{ outboundAllocationId: 5, shortageQuantity: 3 }] })
  })

  it('할당 수량을 넘는 부족 수량은 보고할 수 없다', async () => {
    setup(outbound(1, 'PICKING'))

    await userEvent.type(screen.getAllByLabelText('부족 수량')[1], '5')

    expect(screen.getByRole('button', { name: '부족 보고 · 재할당' })).toBeDisabled()
    expect(screen.getByText('부족 수량은 할당 수량 이하의 정수여야 합니다.')).toBeInTheDocument()
  })

  it('예약이 없는 출고는 부족 보고 입력이 없다', () => {
    setup(outbound(1, 'PICKING', { reservationId: null }))

    expect(screen.queryByLabelText('부족 수량')).not.toBeInTheDocument()
  })

  it('쓰기 권한이 없으면 취소 요청과 부족 보고를 할 수 없다', () => {
    setup(outbound(1, 'PICKING'), undefined, false)

    expect(screen.getByRole('button', { name: '취소 요청' })).toBeDisabled()
    expect(screen.queryByLabelText('부족 수량')).not.toBeInTheDocument()
  })
})
