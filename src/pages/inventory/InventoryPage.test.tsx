import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { InventoryPage } from './InventoryPage'

vi.mock('../../features/inventory/model/useZoneInventorySummary')
vi.mock('../../features/warehouse/model/useWarehouses')

const mockedUseZoneInventorySummary = vi.mocked(useZoneInventorySummary)
const mockedUseWarehouses = vi.mocked(useWarehouses)

function renderWithUser(warehouseIds: number[]) {
  const user: AuthContextValue['user'] = { id: 'user-test', name: '테스트 사용자', actorModes: [], permissions: [], scope: { warehouseIds } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <InventoryPage />
    </AuthContext.Provider>,
  )
}

describe('InventoryPage', () => {
  it('접근 가능한 창고가 없으면 안내 문구를 보여준다', () => {
    renderWithUser([])

    expect(screen.getByText('접근 가능한 창고가 없습니다')).toBeInTheDocument()
  })

  it('로딩 중에는 로딩 문구를 보여준다', () => {
    mockedUseZoneInventorySummary.mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    mockedUseWarehouses.mockReturnValue({ isLoading: true, isError: false, data: [] })

    renderWithUser([1])

    expect(screen.getByText('재고 현황을 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('에러 발생 시 에러 메시지를 보여준다', () => {
    mockedUseZoneInventorySummary.mockReturnValue({
      isLoading: false,
      isError: true,
      error: new Error('서버에 연결할 수 없습니다.'),
      data: undefined,
    } as never)
    mockedUseWarehouses.mockReturnValue({ isLoading: false, isError: false, data: [] })

    renderWithUser([1])

    expect(screen.getByText('서버에 연결할 수 없습니다.')).toBeInTheDocument()
  })

  it('창고별로 zone 카드를 그룹핑해서 보여준다', () => {
    mockedUseZoneInventorySummary.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        {
          zoneId: 1,
          zoneCode: 'A',
          warehouseId: 1,
          maxCapacity: 180,
          usedCapacity: 90,
          usageRate: 0.5,
          quantityByQualityStatus: { NORMAL: 90 },
        },
      ],
    } as never)
    mockedUseWarehouses.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [{ warehouseId: 1, warehouseName: '서울 중앙 창고', address: '', latitude: 0, longitude: 0, warehouseStatus: 'AVAILABLE' }],
    })

    renderWithUser([1])

    expect(screen.getByText('서울 중앙 창고')).toBeInTheDocument()
    expect(screen.getByText('원두')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument()
    expect(screen.getByText('정상 90')).toBeInTheDocument()
  })
})
