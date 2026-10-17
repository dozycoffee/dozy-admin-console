import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { useLocationStocks } from '../../features/inventory/model/useLocationStocks'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useProducts } from '../../features/product/model/useProducts'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { useZoneLocations } from '../../features/warehouse/model/useZoneLocations'
import { InventoryPage } from './InventoryPage'

vi.mock('../../features/inventory/model/useZoneInventorySummary')
vi.mock('../../features/inventory/model/useLocationStocks')
vi.mock('../../features/product/model/useProducts')
vi.mock('../../features/warehouse/model/useWarehouses')
vi.mock('../../features/warehouse/model/useZoneLocations')

const mockedUseZoneInventorySummary = vi.mocked(useZoneInventorySummary)
const mockedUseLocationStocks = vi.mocked(useLocationStocks)
const mockedUseProducts = vi.mocked(useProducts)
const mockedUseWarehouses = vi.mocked(useWarehouses)
const mockedUseZoneLocations = vi.mocked(useZoneLocations)

const zones = [
  { zoneId: 1, zoneCode: 'A', warehouseId: 1, maxCapacity: 180, usedCapacity: 90, usageRate: 0.5, quantityByQualityStatus: { NORMAL: 90 } },
  { zoneId: 2, zoneCode: 'B', warehouseId: 1, maxCapacity: 100, usedCapacity: 96, usageRate: 0.96, quantityByQualityStatus: { NORMAL: 96 } },
]
const locations = [
  { locationId: 11, zoneId: 1, locationCode: 'A-01', maxCapacity: 100, usedCapacity: 90, locationStatus: 'AVAILABLE' },
  { locationId: 12, zoneId: 1, locationCode: 'A-02', maxCapacity: 80, usedCapacity: 0, locationStatus: 'AVAILABLE' },
  { locationId: 21, zoneId: 2, locationCode: 'B-01', maxCapacity: 100, usedCapacity: 96, locationStatus: 'AVAILABLE' },
]
const stock = (locationStockId: number, locationId: number, productId: number, lotNumber: string, qualityStatus: string, quantity: number) =>
  ({ locationStockId, warehouseId: 1, zoneId: 1, zoneCode: 'A', locationId, locationCode: 'A-01', productId, lotNumber, qualityStatus, quantity, heldQuantity: 0, availableQuantity: quantity, updatedAt: '2026-10-16T10:24:00' })
const stocks = [stock(1, 11, 100, 'LOT-1', 'NORMAL', 60), stock(2, 11, 101, 'LOT-2', 'DEFECTIVE', 30), stock(3, 21, 100, 'LOT-3', 'NORMAL', 96)]

function renderWithUser(warehouseIds: number[]) {
  const user: AuthContextValue['user'] = { id: 'user-test', name: '테스트 사용자', actorModes: [], permissions: [], scope: { warehouseIds } }
  return render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <InventoryPage />
    </AuthContext.Provider>,
  )
}

function mockLoaded() {
  mockedUseZoneInventorySummary.mockReturnValue({ isLoading: false, isError: false, data: zones } as never)
  mockedUseZoneLocations.mockReturnValue({ data: locations, isLoading: false, isError: false, error: null } as never)
  mockedUseLocationStocks.mockReturnValue({ isLoading: false, isError: false, data: stocks } as never)
  mockedUseProducts.mockReturnValue({ data: [
    { productId: 100, productCode: 'BEAN-1', productName: '에티오피아', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' },
    { productId: 101, productCode: 'BEAN-2', productName: '브라질', category: 'BEAN', unit: 'ea', shelfLifeDays: null, productStatus: 'ACTIVE' },
  ] } as never)
  mockedUseWarehouses.mockReturnValue({ isLoading: false, isError: false, data: [{ warehouseId: 1, warehouseName: '서울 중앙 창고', address: '', latitude: 0, longitude: 0, warehouseStatus: 'AVAILABLE' }] })
}

beforeEach(() => {
  vi.resetAllMocks()
  mockedUseProducts.mockReturnValue({ data: undefined } as never)
  mockedUseLocationStocks.mockReturnValue({ isLoading: false, isError: false, data: undefined } as never)
  mockedUseZoneLocations.mockReturnValue({ data: [], isLoading: false, isError: false, error: null } as never)
})

describe('InventoryPage', () => {
  it('접근 가능한 창고가 없으면 안내 문구를 보여준다', () => {
    mockedUseZoneInventorySummary.mockReturnValue({ isLoading: false, isError: false, data: [] } as never)
    mockedUseWarehouses.mockReturnValue({ isLoading: false, isError: false, data: [] })

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
    mockedUseZoneInventorySummary.mockReturnValue({ isLoading: false, isError: true, error: new Error('서버에 연결할 수 없습니다.'), data: undefined } as never)
    mockedUseWarehouses.mockReturnValue({ isLoading: false, isError: false, data: [] })

    renderWithUser([1])

    expect(screen.getByText('서버에 연결할 수 없습니다.')).toBeInTheDocument()
  })

  it('Location 재고 조회가 실패하면 에러 메시지를 보여준다', () => {
    mockLoaded()
    mockedUseLocationStocks.mockReturnValue({ isLoading: false, isError: true, error: new Error('재고 조회 실패'), data: undefined } as never)

    renderWithUser([1])

    expect(screen.getByText('재고 조회 실패')).toBeInTheDocument()
  })

  it('Zone 적재율을 보여주고 재고 요약 카드는 보여주지 않는다', () => {
    mockLoaded()

    renderWithUser([1])

    expect(screen.getByText('서울 중앙 창고')).toBeInTheDocument()
    expect(screen.getByText('원두')).toBeInTheDocument()
    expect(screen.getByText('사용률 50%')).toBeInTheDocument()
    expect(screen.queryByText('전체 재고')).not.toBeInTheDocument()
    expect(screen.queryByText(/정상 90/)).not.toBeInTheDocument()
  })

  it('Location마다 용량·적재율·품질 요약을 보여준다', () => {
    mockLoaded()

    renderWithUser([1])

    const row = screen.getByRole('button', { name: 'A-01 상품 상세 펼치기' }).closest('tr') as HTMLElement
    expect(within(row).getByText('2개 재고')).toBeInTheDocument()
    expect(within(row).getByText('90%')).toBeInTheDocument()
    expect(within(row).getByText('확인 필요')).toBeInTheDocument()
    const full = screen.getByRole('button', { name: 'B-01 상품 상세 펼치기' }).closest('tr') as HTMLElement
    expect(within(full).getByText('포화 임박')).toBeInTheDocument()
    const empty = screen.getByRole('button', { name: 'A-02 상품 상세 펼치기' }).closest('tr') as HTMLElement
    expect(within(empty).getByText('0개 재고')).toBeInTheDocument()
  })

  it('Location을 펼치면 상품명·Lot·수량·품질을 보여준다', async () => {
    mockLoaded()
    renderWithUser([1])

    await userEvent.click(screen.getByRole('button', { name: 'A-01 상품 상세 펼치기' }))

    expect(screen.getByText('에티오피아')).toBeInTheDocument()
    expect(screen.getByText('LOT-1')).toBeInTheDocument()
    expect(screen.getByText('60 ea')).toBeInTheDocument()
    expect(screen.getByText('브라질')).toBeInTheDocument()
    expect(screen.getByText('불량')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A-01 상품 상세 접기' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('행을 눌러도 펼쳐지고 빈 Location은 안내 문구를 보여준다', async () => {
    mockLoaded()
    renderWithUser([1])

    await userEvent.click(screen.getByText('0개 재고'))

    expect(screen.getByText('적재된 재고가 없습니다.')).toBeInTheDocument()
  })

  it('검색어와 Zone·상태 필터로 Location을 거른다', async () => {
    mockLoaded()
    renderWithUser([1])

    await userEvent.type(screen.getByPlaceholderText('Location, 상품, Lot 검색'), '브라질')
    expect(screen.getByText('1개 Location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A-01 상품 상세 펼치기' })).toBeInTheDocument()

    await userEvent.clear(screen.getByPlaceholderText('Location, 상품, Lot 검색'))
    await userEvent.selectOptions(screen.getByLabelText('Zone 필터'), 'B')
    expect(screen.getByText('1개 Location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'B-01 상품 상세 펼치기' })).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByLabelText('Zone 필터'), 'ALL')
    await userEvent.selectOptions(screen.getByLabelText('적재 상태 필터'), 'ok')
    expect(screen.getByText('1개 Location')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'A-02 상품 상세 펼치기' })).toBeInTheDocument()
  })

  it('조건에 맞는 Location이 없으면 안내 문구를 보여준다', async () => {
    mockLoaded()
    renderWithUser([1])

    await userEvent.type(screen.getByPlaceholderText('Location, 상품, Lot 검색'), '없는상품')

    expect(screen.getByText('조건에 맞는 Location이 없습니다.')).toBeInTheDocument()
  })
})
