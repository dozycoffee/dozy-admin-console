import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import * as outboundHooks from '../../features/outbound/model/useOutbounds'
import { OutboundHistoryPage } from './OutboundHistoryPage'

vi.mock('../../features/outbound/model/useOutbounds')
const hooks = vi.mocked(outboundHooks)
const counts = { REQUESTED: 0, PICKING: 0, INSPECTING: 0, COMPLETED: 1, CANCEL_REQUESTED: 0, CANCELED: 1 }

function renderPage() {
  const user: AuthContextValue['user'] = { id: 'u', name: '테스트', actorModes: [], permissions: [], scope: { warehouseIds: [1] } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter><OutboundHistoryPage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  hooks.useOutboundItems.mockReturnValue({ data: [], isLoading: false, isError: false, error: null } as never)
})

describe('OutboundHistoryPage', () => {
  it('완료와 취소된 출고를 함께 조회하고 상태 뱃지로 구분한다', () => {
    hooks.useOutbounds.mockReturnValue({ isLoading: false, isError: false, data: { items: [{ outboundId: 2, warehouseId: 1, status: 'CANCELED' }, { outboundId: 1, warehouseId: 1, status: 'COMPLETED' }], total: 2, page: 1, size: 20, statusCounts: counts } } as never)

    renderPage()

    expect(hooks.useOutbounds).toHaveBeenCalledWith([1], ['COMPLETED', 'CANCELED'], 1, 20)
    expect(screen.getByRole('heading', { name: '완료·취소 이력' })).toBeInTheDocument()
    expect(screen.getAllByText('취소됨').length).toBeGreaterThan(0)
    expect(screen.getAllByText('출고 완료').length).toBeGreaterThan(0)
  })

  it('이력이 없으면 안내를 보여준다', () => {
    hooks.useOutbounds.mockReturnValue({ isLoading: false, isError: false, data: { items: [], total: 0, page: 1, size: 20, statusCounts: counts } } as never)

    renderPage()

    expect(screen.getByText('표시할 이력이 없습니다')).toBeInTheDocument()
  })
})
