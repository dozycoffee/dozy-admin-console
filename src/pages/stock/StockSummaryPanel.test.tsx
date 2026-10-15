import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { StockItem, StockSummary } from '../../features/stock/model/stockSchemas'
import { useStockSummaries, useStocks } from '../../features/stock/model/useStocks'
import { StockSummaryPanel } from './StockSummaryPanel'

vi.mock('../../features/stock/model/useStocks', () => ({ useStockSummaries: vi.fn(), useStocks: vi.fn() }))

const summary = (overrides: Partial<StockSummary> = {}): StockSummary => ({
  productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', unit: 'KG', warehouseCount: 2, rowCount: 3, quantity: 30, reservedQuantity: 8, availableQuantity: 22,
  defectiveQuantity: 0, heldQuantity: 0, expiredQuantity: 0, expiringSoonQuantity: 0, ...overrides,
})
const row = (overrides: Partial<StockItem> = {}): StockItem => ({
  inventoryId: 500, warehouseId: 10, productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', unit: 'KG', lotId: 7, lotNumber: 'LOT-A', manufactureDate: null, expirationDate: '2027-01-01',
  lotStatus: 'NORMAL', qualityStatus: 'NORMAL', quantity: 10, reservedQuantity: 4, availableQuantity: 6, allocationHold: false, holdReason: null, heldAt: null,
  createdAt: '2026-10-14T00:00:00Z', updatedAt: '2026-10-14T00:00:00Z', ...overrides,
})

const onOpen = vi.fn()
const warehouseName = (id: number) => (id === 10 ? '서울 본사 창고' : null)

function setup(items: StockSummary[], { page = { page: 0, size: 20, totalElements: items.length, totalPages: 1 }, state = {}, filters = {} }: { page?: object; state?: object; filters?: object } = {}) {
  vi.mocked(useStockSummaries).mockReturnValue({ isLoading: false, isError: false, data: { items, ...page }, ...state } as never)
  vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { items: [row()], page: 0, size: 10, totalElements: 1, totalPages: 1 } } as never)
  return render(<StockSummaryPanel filters={filters} warehouseName={warehouseName} onOpen={onOpen} />)
}

beforeEach(() => vi.clearAllMocks())

describe('StockSummaryPanel', () => {
  it('상품 한 줄에 창고 수와 단위가 붙은 총·예약·가용 수량을 보여준다', () => {
    setup([summary()])

    const line = within(screen.getByRole('table')).getByText('에티오피아 원두').closest('tr')!
    expect(within(line).getByText('BEAN-1')).toBeInTheDocument()
    const cells = Array.from(line.querySelectorAll('td')).map((cell) => cell.textContent)
    expect(cells.slice(1, 5)).toEqual(['2', '30 KG', '8 KG', '22 KG'])
    expect(screen.getByText('1개 상품')).toBeInTheDocument()
  })

  it('요약을 필터 조건과 페이지로 조회한다', () => {
    setup([summary()], { filters: { lotStatus: 'EXPIRED' } })

    expect(useStockSummaries).toHaveBeenCalledWith({ lotStatus: 'EXPIRED', page: 0, size: 20 })
  })

  it('주의가 필요한 수량만 칩으로 보여주고 없으면 -로 표시한다', () => {
    setup([summary({ defectiveQuantity: 4, heldQuantity: 5, expiredQuantity: 6, expiringSoonQuantity: 7 }), summary({ productId: 200, productName: '바닐라 시럽', productCode: 'SYR-1' }), summary({ productId: 300, productName: '흰 우유', productCode: 'MLK-1', expiredQuantity: 2 })])

    const first = screen.getByText('에티오피아 원두').closest('tr')!
    expect(within(first).getByText('불량 4')).toHaveClass('stock-quality-defective')
    expect(within(first).getByText('보류 5')).toHaveClass('stock-hold')
    expect(within(first).getByText('만료 6')).toHaveClass('stock-lot-expired')
    expect(within(first).getByText('임박 7')).toHaveClass('stock-lot-expiring_soon')
    const second = screen.getByText('바닐라 시럽').closest('tr')!
    expect(within(second).getByText('-')).toBeInTheDocument()
    const third = screen.getByText('흰 우유').closest('tr')!
    expect(within(third).getByText('만료 2')).toBeInTheDocument()
    expect(within(third).queryByText(/불량/)).not.toBeInTheDocument()
  })

  describe('상품 펼치기', () => {
    it('처음에는 행을 읽지 않고 펼칠 때만 그 상품의 재고 행을 같은 조건으로 읽는다', async () => {
      const user = userEvent.setup()
      setup([summary()], { filters: { lotStatus: 'EXPIRED' } })
      expect(useStocks).not.toHaveBeenCalled()

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))

      expect(useStocks).toHaveBeenCalledWith({ lotStatus: 'EXPIRED', productId: 100, page: 0, size: 10 })
      expect(screen.getByText('LOT-A')).toBeInTheDocument()
      expect(screen.getByText('서울 본사 창고')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '에티오피아 원두 재고 행 접기' })).toHaveAttribute('aria-expanded', 'true')
    })

    it('펼친 행에서 보기를 누르면 상세를 연다', async () => {
      const user = userEvent.setup()
      setup([summary()])
      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 LOT-A 상세 보기' }))

      expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ inventoryId: 500 }))
    })

    it('접으면 행을 숨기고 여러 상품을 동시에 펼칠 수 있다', async () => {
      const user = userEvent.setup()
      setup([summary(), summary({ productId: 200, productName: '바닐라 시럽', productCode: 'SYR-1' })])

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))
      await user.click(screen.getByRole('button', { name: '바닐라 시럽 재고 행 펼치기' }))
      expect(screen.getAllByText('LOT-A')).toHaveLength(2)
      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 접기' }))

      expect(screen.getAllByText('LOT-A')).toHaveLength(1)
    })

    it('펼친 행이 없거나 못 읽으면 안내한다', async () => {
      const user = userEvent.setup()
      setup([summary()])
      vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'INV_WAREHOUSE_ACCESS_DENIED' }), data: undefined } as never)

      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))

      expect(screen.getByRole('alert')).toHaveTextContent('접근 권한이 없는 창고입니다.')
    })

    it('펼친 상품의 행이 여러 페이지면 다음 페이지를 읽는다', async () => {
      const user = userEvent.setup()
      setup([summary()])
      vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { items: [row()], page: 0, size: 10, totalElements: 25, totalPages: 3 } } as never)
      await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))

      await user.click(screen.getByRole('button', { name: '다음' }))

      expect(useStocks).toHaveBeenLastCalledWith({ productId: 100, page: 1, size: 10 })
    })
  })

  it('상품이 여러 페이지면 다음 페이지를 요청하고 펼침을 접는다', async () => {
    const user = userEvent.setup()
    setup([summary()], { page: { page: 0, size: 20, totalElements: 45, totalPages: 3 } })
    await user.click(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' }))

    await user.click(screen.getAllByRole('button', { name: '다음' })[0])

    expect(useStockSummaries).toHaveBeenLastCalledWith({ page: 1, size: 20 })
    expect(screen.getByRole('button', { name: '에티오피아 원두 재고 행 펼치기' })).toBeInTheDocument()
  })

  it('불러오는 중과 오류, 결과 없음을 보여준다', () => {
    const { unmount } = setup([], { state: { isLoading: true, data: undefined } })
    expect(screen.getByText('재고를 불러오는 중입니다...')).toBeInTheDocument()
    unmount()

    const second = setup([], { state: { isError: true, error: new ApiError('x', { status: 403, code: 'INV_WAREHOUSE_ACCESS_DENIED' }), data: undefined } })
    expect(screen.getByRole('alert')).toHaveTextContent('접근 권한이 없는 창고입니다.')
    second.unmount()

    setup([])
    expect(screen.getByText('조건에 맞는 재고가 없습니다.')).toBeInTheDocument()
  })
})
