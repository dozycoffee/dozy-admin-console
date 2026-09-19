import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useActiveProducts } from '../../features/product/model/useActiveProducts'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { DashboardPage } from './DashboardPage'

vi.mock('../../features/inventory/model/useZoneInventorySummary')
vi.mock('../../features/product/model/useActiveProducts')
vi.mock('../../features/warehouse/model/useWarehouses')

const mockedUseZoneInventorySummary = vi.mocked(useZoneInventorySummary)
const mockedUseActiveProducts = vi.mocked(useActiveProducts)
const mockedUseWarehouses = vi.mocked(useWarehouses)

function renderWithUser(warehouseIds: number[]) {
  const user: AuthContextValue['user'] = { id: 'user-test', name: '테스트 사용자', permissions: [], scope: { warehouseIds } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, can: () => true, login: vi.fn(), logout: vi.fn() }}>
      <DashboardPage />
    </AuthContext.Provider>,
  )
}

describe('DashboardPage', () => {
  it('로딩 중에는 통계 카드에 자리표시자를 보여준다', () => {
    mockedUseActiveProducts.mockReturnValue({ isLoading: true, isSuccess: false, isError: false, data: undefined } as never)
    mockedUseWarehouses.mockReturnValue({ isLoading: true, isError: false, data: [] })
    mockedUseZoneInventorySummary.mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)

    renderWithUser([1])

    const placeholders = screen.getAllByText('-')
    expect(placeholders.length).toBeGreaterThan(0)
  })

  it('성공 시 활성 상품 수, 가동 창고 수, 평균 가동률을 보여준다', () => {
    mockedUseActiveProducts.mockReturnValue({
      isLoading: false,
      isSuccess: true,
      isError: false,
      data: [{ productId: 1 }, { productId: 2 }],
    } as never)
    mockedUseWarehouses.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { warehouseId: 1, warehouseName: '창고1', address: '', latitude: 0, longitude: 0, warehouseStatus: 'AVAILABLE' },
        { warehouseId: 2, warehouseName: '창고2', address: '', latitude: 0, longitude: 0, warehouseStatus: 'UNAVAILABLE' },
      ],
    })
    mockedUseZoneInventorySummary.mockReturnValue({
      isLoading: false,
      isError: false,
      data: [
        { zoneId: 1, zoneCode: 'A', warehouseId: 1, maxCapacity: 100, usedCapacity: 50, usageRate: 0.5, quantityByQualityStatus: {} },
        { zoneId: 2, zoneCode: 'B', warehouseId: 1, maxCapacity: 100, usedCapacity: 90, usageRate: 0.9, quantityByQualityStatus: {} },
      ],
    } as never)

    renderWithUser([1, 2])

    expect(screen.getByText('2')).toBeInTheDocument()
    expect(screen.getByText('1 / 2')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })
})
