import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { OutboxEvent } from '../../features/outbox/model/outboxSchemas'
import { useOutboxEvents, useRequeueOutboxEvent } from '../../features/outbox/model/useOutboxEvents'
import { ApiError } from '../../shared/api/ApiError'
import { OutboxEventsPage } from './OutboxEventsPage'

vi.mock('../../features/outbox/model/useOutboxEvents', () => ({ useOutboxEvents: vi.fn(), useRequeueOutboxEvent: vi.fn() }))

const event = (overrides: Partial<OutboxEvent> = {}): OutboxEvent => ({
  outboxEventId: 7, aggregateType: 'INVENTORY', aggregateId: 500, eventType: 'inventory.quantity.increased', partitionKey: 'inventory-500',
  payload: '{"eventId":"e1","quantity":5}', status: 'DEAD', attemptCount: 20, lastError: 'serialization failed: bad value', createdAt: '2026-10-15T01:00:00', deadAt: '2026-10-15T02:00:00', ...overrides,
})
const stubUser: AuthContextValue['user'] = { id: 'u1', name: '재고 담당', actorModes: [], permissions: [], scope: { warehouseIds: [] } }
const mutate = vi.fn()

function setup(items: OutboxEvent[], { granted = [permissions.inventoryRead, permissions.inventoryWrite], page = { page: 0, size: 20, totalElements: items.length, totalPages: 1 }, state = {}, requeuing = false }: { granted?: Permission[]; page?: object; state?: object; requeuing?: boolean } = {}) {
  vi.mocked(useOutboxEvents).mockReturnValue({ isLoading: false, isError: false, data: { items, ...page }, ...state } as never)
  vi.mocked(useRequeueOutboxEvent).mockReturnValue({ mutate, isPending: requeuing } as never)
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <OutboxEventsPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('OutboxEventsPage', () => {
  it('격리된 이벤트를 집계·유형·키·시도 횟수·오류와 함께 보여준다', () => {
    setup([event()])

    const row = within(screen.getByRole('table')).getByText('inventory.quantity.increased').closest('tr')!
    expect(within(row).getByText('재고')).toBeInTheDocument()
    expect(within(row).getByText('id 500')).toBeInTheDocument()
    expect(within(row).getByText('inventory-500')).toBeInTheDocument()
    expect(within(row).getByText('serialization failed: bad value')).toBeInTheDocument()
    expect(Array.from(row.querySelectorAll('td'))[3].textContent).toBe('20')
    expect(screen.getByText('1건')).toBeInTheDocument()
  })

  it('긴 오류는 앞부분만 보이고 오류가 없으면 -로 표시한다', () => {
    setup([event({ lastError: 'x'.repeat(100) }), event({ outboxEventId: 8, lastError: null, deadAt: null })])

    expect(screen.getByText(`${'x'.repeat(60)}…`)).toBeInTheDocument()
    expect(screen.getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('격리된 이벤트가 없으면 안내하고 목록을 못 불러오면 오류를 보여준다', () => {
    const { unmount } = setup([])
    expect(screen.getByText('격리된 이벤트가 없습니다.')).toBeInTheDocument()
    unmount()

    setup([], { state: { isError: true, data: undefined, error: new ApiError('x', { status: 403 }) } })
    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('여러 페이지면 다음 페이지를 요청한다', async () => {
    const user = userEvent.setup()
    setup([event()], { page: { page: 0, size: 20, totalElements: 45, totalPages: 3 } })

    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(useOutboxEvents).toHaveBeenLastCalledWith(1, 20)
  })

  describe('상세', () => {
    it('보기를 누르면 파티션 키·오류 전문·들여쓴 payload를 모달로 보여준다', async () => {
      const user = userEvent.setup()
      setup([event({ lastError: 'full error '.repeat(10) })])

      await user.click(screen.getByRole('button', { name: '이벤트 7 상세 보기' }))

      const dialog = screen.getByRole('dialog', { name: '이벤트 상세' })
      expect(within(dialog).getByText('inventory-500')).toBeInTheDocument()
      expect(within(dialog).getByText('격리됨')).toBeInTheDocument()
      expect(within(dialog).getByText(/full error full error/)).toBeInTheDocument()
      expect(dialog.querySelector('pre.outbox-pre:last-of-type')?.textContent).toBe('{\n  "eventId": "e1",\n  "quantity": 5\n}')
    })

    it('JSON이 아닌 payload는 받은 그대로 보여준다', async () => {
      const user = userEvent.setup()
      setup([event({ payload: 'raw-text' })])

      await user.click(screen.getByRole('button', { name: '이벤트 7 상세 보기' }))

      expect(within(screen.getByRole('dialog')).getByText('raw-text')).toBeInTheDocument()
    })
  })

  describe('재발행(inventory.write)', () => {
    it('권한이 없으면 목록과 상세는 보이고 재발행 버튼은 없다', async () => {
      const user = userEvent.setup()
      setup([event()], { granted: [permissions.inventoryRead] })

      expect(screen.getByRole('button', { name: '이벤트 7 상세 보기' })).toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /재발행/ })).not.toBeInTheDocument()
      await user.click(screen.getByRole('button', { name: '이벤트 7 상세 보기' }))
      expect(within(screen.getByRole('dialog')).queryByRole('button', { name: '재발행' })).not.toBeInTheDocument()
    })

    it('확인창에서 후속 이벤트보다 늦게 도착한다고 안내하고, 확인한 뒤에만 요청한다', async () => {
      const user = userEvent.setup()
      setup([event()])

      await user.click(screen.getByRole('button', { name: '이벤트 7 재발행' }))
      expect(mutate).not.toHaveBeenCalled()
      const confirm = within(screen.getByRole('dialog', { name: '이벤트를 재발행할까요?' }))
      expect(confirm.getByText(/후속 이벤트보다 늦게 도착합니다/)).toHaveTextContent('inventory-500')
      await user.click(confirm.getByRole('button', { name: '재발행' }))

      expect(mutate).toHaveBeenCalledWith(7, expect.anything())
    })

    it('확인창에서 취소하면 요청하지 않는다', async () => {
      const user = userEvent.setup()
      setup([event()])

      await user.click(screen.getByRole('button', { name: '이벤트 7 재발행' }))
      await user.click(screen.getByRole('button', { name: '취소' }))

      expect(mutate).not.toHaveBeenCalled()
    })

    it('상세 모달에서도 재발행할 수 있다', async () => {
      const user = userEvent.setup()
      setup([event()])

      await user.click(screen.getByRole('button', { name: '이벤트 7 상세 보기' }))
      await user.click(within(screen.getByRole('dialog', { name: '이벤트 상세' })).getByRole('button', { name: '재발행' }))
      await user.click(within(screen.getByRole('dialog', { name: '이벤트를 재발행할까요?' })).getByRole('button', { name: '재발행' }))

      expect(mutate).toHaveBeenCalledWith(7, expect.anything())
    })

    it('이미 처리된 이벤트(409)이면 오류를 안내한다', async () => {
      const user = userEvent.setup()
      mutate.mockImplementation((_id: number, options: { onError: (error: unknown) => void }) => options.onError(new ApiError('x', { status: 409, code: 'INV_INVALID_OUTBOX_STATE' })))
      setup([event()])

      await user.click(screen.getByRole('button', { name: '이벤트 7 재발행' }))
      await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '재발행' }))

      expect(await screen.findByRole('alert')).toHaveTextContent('이미 발행 대기 중이거나 발행된')
    })

    it('요청하는 동안 재발행 버튼을 잠근다', () => {
      setup([event()], { requeuing: true })

      expect(screen.getByRole('button', { name: '이벤트 7 재발행' })).toBeDisabled()
    })
  })
})
