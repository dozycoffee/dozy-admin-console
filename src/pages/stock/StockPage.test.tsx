import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { StockItem } from '../../features/stock/model/stockSchemas'
import { useAllMaterials } from '../../features/material/model/useMaterials'
import { useStockHistories, useStocks } from '../../features/stock/model/useStocks'
import { useWarehouseList } from '../../features/warehouse/model/useWarehouses'
import { StockPage } from './StockPage'

vi.mock('../../features/stock/model/useStocks', () => ({ useStocks: vi.fn(), useStockHistories: vi.fn() }))
vi.mock('../../features/material/model/useMaterials', () => ({ useAllMaterials: vi.fn() }))
vi.mock('../../features/warehouse/model/useWarehouses', () => ({ useWarehouseList: vi.fn() }))

const item = (overrides: Partial<StockItem> = {}): StockItem => ({
  inventoryId: 500, warehouseId: 10, productId: 100, lotId: 7, lotNumber: 'LOT-A', manufactureDate: '2026-09-01', expirationDate: '2027-01-01', lotStatus: 'NORMAL', qualityStatus: 'NORMAL',
  quantity: 10, reservedQuantity: 4, availableQuantity: 6, allocationHold: false, holdReason: null, heldAt: null, createdAt: '2026-10-14T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z', ...overrides,
})
const warehouses = [{ warehouseId: 10, warehouseName: '서울 본사 창고', address: '서울', latitude: 37.5, longitude: 127, warehouseStatus: 'AVAILABLE' }]
const products = [{ productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE' }]

function setup(items: StockItem[], { warehouseData = warehouses, page = { page: 0, size: 20, totalElements: items.length, totalPages: 1 }, state = {}, path = '/stock' }: { warehouseData?: unknown; page?: object; state?: object; path?: string } = {}) {
  vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { items, ...page }, ...state } as never)
  vi.mocked(useAllMaterials).mockReturnValue({ data: products } as never)
  vi.mocked(useWarehouseList).mockReturnValue({ data: warehouseData } as never)
  vi.mocked(useStockHistories).mockReturnValue({ isLoading: false, isError: false, data: { items: [], page: 0, size: 10, totalElements: 0, totalPages: 1 } } as never)
  return render(<MemoryRouter initialEntries={[path]}><StockPage /></MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())

describe('StockPage', () => {
  it('재고 행을 상품 이름·창고·Lot·수량과 함께 보여준다', () => {
    setup([item()])

    const row = within(screen.getByRole('table')).getByText('에티오피아 원두').closest('tr')!
    expect(within(row).getByText('BEAN-1')).toBeInTheDocument()
    expect(within(row).getByText('LOT-A')).toBeInTheDocument()
    expect(within(row).getByText('유통기한 2027-01-01')).toBeInTheDocument()
    expect(within(row).getByText('정상')).toBeInTheDocument()
    const cells = Array.from(row.querySelectorAll('td')).map((cell) => cell.textContent)
    expect(cells[1]).toBe('서울 본사 창고id 10') // 창고 이름과 id
    expect(cells.slice(4, 7)).toEqual(['10', '4', '6']) // 총, 예약, 가용
    expect(screen.getByText('1건')).toBeInTheDocument()
  })

  it('창고 이름을 읽지 못하면(권한 없음·서버 오류) 창고 id만 보여주고 id 입력으로 거른다', () => {
    setup([item()], { warehouseData: null })

    const row = screen.getByRole('table').querySelector('tbody tr') as HTMLElement
    expect(Array.from(row.querySelectorAll('td'))[1].textContent).toBe('10')
    expect(screen.getByLabelText('창고 id')).toBeInTheDocument()
  })

  it('창고 이름 목록이 있으면 창고를 이름 드롭다운으로 거른다', async () => {
    const user = userEvent.setup()
    setup([item()])

    await user.selectOptions(screen.getByLabelText('창고'), '10')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(useStocks).toHaveBeenLastCalledWith({ warehouseId: 10, page: 0, size: 20 })
  })

  it('상품 이름을 모르면 id로 보여주고, 유통기한이 없는 Lot은 그렇게 적는다', () => {
    setup([item({ productId: 999, expirationDate: null })])

    expect(screen.getByText('상품 999')).toBeInTheDocument()
    expect(screen.getByText('id 999')).toBeInTheDocument()
    expect(screen.getByText('유통기한 없음')).toBeInTheDocument()
  })

  it('품질 상태·Lot 상태·할당 보류를 상태 칩으로 보여준다', () => {
    setup([item({ qualityStatus: 'DEFECTIVE', lotStatus: 'EXPIRED', allocationHold: true, holdReason: '피킹 불가' })])

    const row = screen.getByRole('table').querySelector('tbody tr')!
    expect(within(row as HTMLElement).getByText('불량')).toHaveClass('stock-quality-defective')
    expect(within(row as HTMLElement).getByText('유통기한 만료')).toHaveClass('stock-lot-expired')
    expect(within(row as HTMLElement).getByText('할당 보류')).toHaveAttribute('title', '피킹 불가')
  })

  it('조건에 맞는 재고가 없으면 안내한다', () => {
    setup([])

    expect(screen.getByText('조건에 맞는 재고가 없습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('불러오는 중과 오류를 보여준다', () => {
    setup([], { state: { isLoading: true, data: undefined } })
    expect(screen.getByText('재고를 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('조회에 실패하면 오류 안내를 보여준다', () => {
    setup([], { state: { isError: true, error: new ApiError('x', { status: 403, code: 'INV_WAREHOUSE_ACCESS_DENIED' }), data: undefined } })
    expect(screen.getByRole('alert')).toHaveTextContent('접근 권한이 없는 창고입니다.')
  })

  it('주소의 조건(대시보드에서 넘어온 값)으로 처음 조회한다', () => {
    setup([item()], { path: '/stock?lotStatus=EXPIRED&allocationHold=true' })

    expect(useStocks).toHaveBeenCalledWith({ lotStatus: 'EXPIRED', allocationHold: true, page: 0, size: 20 })
    expect(screen.getByLabelText('Lot 상태')).toHaveValue('EXPIRED')
  })

  it('조건을 바꿔 조회하면 첫 페이지부터 다시 조회한다', async () => {
    const user = userEvent.setup()
    setup([item()], { page: { page: 1, size: 20, totalElements: 41, totalPages: 3 } })
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(useStocks).toHaveBeenLastCalledWith({ page: 1, size: 20 })

    await user.selectOptions(screen.getByLabelText('품질 상태'), 'DEFECTIVE')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(useStocks).toHaveBeenLastCalledWith({ qualityStatus: 'DEFECTIVE', page: 0, size: 20 })
  })

  it('다음·이전으로 페이지를 옮긴다', async () => {
    const user = userEvent.setup()
    setup([item()], { page: { page: 0, size: 20, totalElements: 41, totalPages: 3 } })

    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(useStocks).toHaveBeenLastCalledWith({ page: 1, size: 20 })
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })

  it('보기를 누르면 상세와 변동 이력을 모달로 보여준다', async () => {
    const user = userEvent.setup()
    setup([item({ allocationHold: true, holdReason: '피킹 불가' })])
    vi.mocked(useStockHistories).mockReturnValue({
      isLoading: false, isError: false,
      data: { items: [{ inventoryHistoryId: 1, historyType: 'OUTBOUND', quantityChange: -4, quantityAfter: 6, referenceType: 'RESERVATION', referenceId: 33, idempotencyKey: 'k', requesterService: 's', createdAt: '2026-10-14T01:00:00Z' }], page: 0, size: 10, totalElements: 1, totalPages: 1 },
    } as never)

    await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 상세 보기' }))

    const dialog = screen.getByRole('dialog', { name: '재고 상세' })
    expect(within(dialog).getByText(/보류 중/)).toHaveTextContent('피킹 불가')
    expect(within(dialog).getByText('서울 본사 창고')).toBeInTheDocument()
    expect(within(dialog).getByText('총 10 · 예약 4 · 가용 6')).toBeInTheDocument()
    expect(useStockHistories).toHaveBeenCalledWith(500, 0, 10)
    const history = within(dialog).getByRole('region', { name: '수량 변동 이력' })
    expect(within(history).getByText('출고')).toBeInTheDocument()
    expect(within(history).getByText('-4')).toHaveClass('stock-minus')
    expect(within(history).getByText('예약')).toBeInTheDocument()
  })

  it('이력이 없거나 이력 조회에 실패해도 상세는 그대로 보인다', async () => {
    const user = userEvent.setup()
    setup([item()])
    await user.click(screen.getByRole('button', { name: /상세 보기/ }))
    expect(screen.getByText('변동 이력이 없습니다.')).toBeInTheDocument()
  })
})
