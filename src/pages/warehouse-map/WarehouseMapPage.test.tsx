import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { useWorkAreas } from '../../features/warehouse/model/useWorkAreas'
import { useZoneLocations } from '../../features/warehouse/model/useZoneLocations'
import { WarehouseMapPage } from './WarehouseMapPage'

vi.mock('../../features/inventory/model/useZoneInventorySummary')
vi.mock('../../features/warehouse/model/useWarehouses')
vi.mock('../../features/warehouse/model/useWorkAreas')
vi.mock('../../features/warehouse/model/useZoneLocations')

function renderPage(warehouseIds = [1]) {
  const user: AuthContextValue['user'] = { id: 'user-test', name: '테스트 사용자', actorModes: [], permissions: [], scope: { warehouseIds } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <WarehouseMapPage />
    </AuthContext.Provider>,
  )
}

function mockLoaded() {
  vi.mocked(useWarehouses).mockReturnValue({ isLoading: false, isError: false, data: [{ warehouseId: 1, warehouseName: '서울 중앙 창고', address: '', latitude: 0, longitude: 0, warehouseStatus: 'AVAILABLE' }] })
  vi.mocked(useZoneInventorySummary).mockReturnValue({ isLoading: false, isError: false, data: [{ zoneId: 1, zoneCode: 'A', warehouseId: 1, maxCapacity: 100, usedCapacity: 50, usageRate: 0.5, quantityByQualityStatus: {} }] } as never)
  vi.mocked(useZoneLocations).mockReturnValue({ data: [{ locationId: 11, zoneId: 1, locationCode: 'A-01', maxCapacity: 100, usedCapacity: 50, locationStatus: 'AVAILABLE' }], isLoading: false, isError: false, error: null })
  vi.mocked(useWorkAreas).mockReturnValue({ data: [{ workAreaId: 1, warehouseId: 1, areaCode: 'INBOUND', areaName: '입고 처리장', maxCapacity: 230, usedCapacity: 30, workAreaStatus: 'AVAILABLE' }], isLoading: false, isError: false })
}

beforeEach(() => vi.resetAllMocks())

describe('WarehouseMapPage', () => {
  it('접근 가능한 창고가 없으면 안내 문구를 보여준다', () => {
    mockLoaded()

    renderPage([])

    expect(screen.getByText('접근 가능한 창고가 없습니다')).toBeInTheDocument()
  })

  it('불러오는 동안에는 로딩 문구를 보여준다', () => {
    mockLoaded()
    vi.mocked(useWorkAreas).mockReturnValue({ data: [], isLoading: true, isError: false })

    renderPage()

    expect(screen.getByText('평면도를 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('조회에 실패하면 오류 문구를 보여준다', () => {
    mockLoaded()
    vi.mocked(useZoneLocations).mockReturnValue({ data: [], isLoading: false, isError: true, error: new Error('실패') })

    renderPage()

    expect(screen.getByText('평면도를 불러오지 못했습니다')).toBeInTheDocument()
  })

  it('창고 이름과 실제 용량으로 평면도를 그린다', () => {
    mockLoaded()

    renderPage()

    expect(screen.getByText('서울 중앙 창고 평면도')).toBeInTheDocument()
    expect(screen.getByText('총 Capacity')).toBeInTheDocument()
    // A-01(100)과 입고 처리장(230)만 내려온 경우의 합계
    expect(screen.getByText('330')).toBeInTheDocument()
    expect(screen.getByText('80')).toBeInTheDocument()
  })
})
