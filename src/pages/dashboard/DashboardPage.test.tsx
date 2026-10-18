import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { useDisposals } from '../../features/disposal/model/useDisposals'
import { useInbounds } from '../../features/inbound/model/useInbounds'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useOutbounds } from '../../features/outbound/model/useOutbounds'
import { useReturns } from '../../features/return-request/model/useReturns'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { DashboardPage } from './DashboardPage'

vi.mock('../../features/disposal/model/useDisposals')
vi.mock('../../features/inbound/model/useInbounds')
vi.mock('../../features/inventory/model/useZoneInventorySummary')
vi.mock('../../features/outbound/model/useOutbounds')
vi.mock('../../features/return-request/model/useReturns')
vi.mock('../../features/warehouse/model/useWarehouses')

const loaded = <T,>(statusCounts: T) => ({ isLoading: false, isError: false, data: { items: [], total: 0, page: 1, size: 1, statusCounts } }) as never
const zones = [
  { zoneId: 1, zoneCode: 'A', warehouseId: 1, maxCapacity: 100, usedCapacity: 71, usageRate: 0.71, quantityByQualityStatus: {} },
  { zoneId: 2, zoneCode: 'B', warehouseId: 1, maxCapacity: 100, usedCapacity: 92, usageRate: 0.92, quantityByQualityStatus: {} },
]

function renderDashboard() {
  const user: AuthContextValue['user'] = { id: 'user-test', name: '테스트 사용자', actorModes: [], permissions: [], scope: { warehouseIds: [1] } }
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
        <MemoryRouter><DashboardPage /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
}

function mockLoaded() {
  vi.mocked(useWarehouses).mockReturnValue({ isLoading: false, isError: false, data: [{ warehouseId: 1, warehouseName: '서울 중앙 창고', address: '', latitude: 0, longitude: 0, warehouseStatus: 'AVAILABLE' }] })
  vi.mocked(useZoneInventorySummary).mockReturnValue({ isLoading: false, isError: false, data: zones } as never)
  vi.mocked(useInbounds).mockReturnValue(loaded({ EXPECTED: 2, WAITING: 3, PROCESSING: 4, COMPLETED: 9 }))
  vi.mocked(useOutbounds).mockReturnValue(loaded({ REQUESTED: 6, PICKING: 1, INSPECTING: 1, COMPLETED: 5 }))
  vi.mocked(useDisposals).mockReturnValue(loaded({ REQUESTED: 7, APPROVED: 1, COMPLETED: 2 }))
  vi.mocked(useReturns).mockReturnValue(loaded({ RECEIVED: 8, INSPECTING: 1, COMPLETED: 3 }))
}

beforeEach(() => vi.resetAllMocks())

describe('DashboardPage', () => {
  it('담당 창고 이름과 Zone별 적재율을 보여주고 Location 재고·평면도로 연결한다', () => {
    mockLoaded()

    renderDashboard()

    expect(screen.getByText('서울 중앙 창고')).toBeInTheDocument()
    expect(screen.getByText('71%')).toBeInTheDocument()
    expect(screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/inventory?zone=A')).toBeTruthy()
    expect(screen.getByRole('link', { name: /Location 재고/ })).toHaveAttribute('href', '/inventory')
    expect(screen.getByRole('link', { name: /평면도 보기/ })).toHaveAttribute('href', '/warehouse-map')
  })

  it('업무 카드는 입고·출고·폐기·반품 목록의 실제 건수를 보여준다', () => {
    mockLoaded()

    renderDashboard()

    expect(screen.getByRole('link', { name: /입고 대기/ })).toHaveTextContent('5')
    expect(screen.getByRole('link', { name: /출고 요청/ })).toHaveTextContent('6')
    expect(screen.getByRole('link', { name: /폐기 승인 대기/ })).toHaveTextContent('7')
    expect(screen.getByRole('link', { name: /반품 접수/ })).toHaveTextContent('8')
    expect(screen.getByRole('link', { name: /입고 대기/ })).toHaveAttribute('href', '/inbounds')
  })

  it('목록 조회에 실패한 카드는 건수 대신 안내를 보여준다', () => {
    mockLoaded()
    vi.mocked(useReturns).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never)

    renderDashboard()

    expect(screen.getByRole('link', { name: /반품 접수/ })).toHaveTextContent('불러오지 못했습니다')
    expect(screen.getByRole('link', { name: /입고 대기/ })).toHaveTextContent('5')
  })

  it('Zone 현황을 불러오지 못하면 오류를 알린다', () => {
    mockLoaded()
    vi.mocked(useZoneInventorySummary).mockReturnValue({ isLoading: false, isError: true, data: undefined } as never)

    renderDashboard()

    expect(screen.getByRole('alert')).toHaveTextContent('Zone 현황을 불러오지 못했습니다.')
  })

  it('불러오는 동안에는 카드에 대기 표시를 한다', () => {
    mockLoaded()
    vi.mocked(useInbounds).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    vi.mocked(useZoneInventorySummary).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)

    renderDashboard()

    expect(screen.getByRole('link', { name: /입고 대기/ })).toHaveTextContent('…')
    expect(screen.getByText('Zone 현황을 불러오는 중입니다...')).toBeInTheDocument()
  })
})
