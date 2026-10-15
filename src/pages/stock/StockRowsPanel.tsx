import { useState } from 'react'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import type { StockFilters, StockItem } from '../../features/stock/model/stockSchemas'
import { useStocks } from '../../features/stock/model/useStocks'
import { StockRowsTable } from './StockRowsTable'

const PAGE_SIZE = 20

type Props = {
  filters: StockFilters
  warehouseName: (warehouseId: number) => string | null
  onOpen: (item: StockItem) => void
}

/** 재고 현황의 행 보기. inventory 서비스의 재고 행을 서버 페이지(20건)로 읽어 보여준다. */
export function StockRowsPanel({ filters, warehouseName, onOpen }: Props) {
  const [page, setPage] = useState(1)
  const query = useStocks({ ...filters, page: page - 1, size: PAGE_SIZE })
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)

  return <section className="panel audit-list-panel">
    <div className="panel-heading"><div><p className="eyebrow">STOCK</p><h2>재고</h2></div><small>{total}건</small></div>
    {query.isLoading && <p>재고를 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toStockErrorMessage(query.error)}</p>}
    {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 재고가 없습니다.</p>}
    {items.length > 0 && <StockRowsTable items={items} warehouseName={warehouseName} onOpen={onOpen} />}
    {totalPages > 1 && <div className="inbound-pagination">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
      <span>{page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
    </div>}
  </section>
}
