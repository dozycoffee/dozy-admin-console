import { Fragment, useState } from 'react'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import type { StockFilters, StockItem, StockSummary } from '../../features/stock/model/stockSchemas'
import { useStockSummaries, useStocks } from '../../features/stock/model/useStocks'
import { StockRowsTable } from './StockRowsTable'

const SUMMARY_PAGE_SIZE = 20
const ROWS_PAGE_SIZE = 10

type Props = {
  filters: StockFilters
  warehouseName: (warehouseId: number) => string | null
  onOpen: (item: StockItem) => void
}

/** 상품 하나를 펼쳤을 때의 재고 행. 요약과 같은 조건에 상품을 더해 서버 페이지(10건)로 읽는다. */
function ProductRows({ productId, filters, warehouseName, onOpen }: Props & { productId: number }) {
  const [page, setPage] = useState(1)
  const query = useStocks({ ...filters, productId, page: page - 1, size: ROWS_PAGE_SIZE })
  const items = query.data?.items ?? []
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)
  return <div className="stock-product-rows">
    {query.isLoading && <p>재고 행을 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toStockErrorMessage(query.error)}</p>}
    {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 재고 행이 없습니다.</p>}
    {items.length > 0 && <StockRowsTable items={items} warehouseName={warehouseName} onOpen={onOpen} showProduct={false} />}
    {totalPages > 1 && <div className="inbound-pagination">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
      <span>{page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
    </div>}
  </div>
}

/** 주의가 필요한 수량. 0이면 보이지 않고, 서로 겹칠 수 있어 합쳐 세지 않는다. */
function Cautions({ summary }: { summary: StockSummary }) {
  const chips = [
    { quantity: summary.defectiveQuantity, label: '불량', className: 'stock-quality-defective' },
    { quantity: summary.heldQuantity, label: '보류', className: 'stock-hold' },
    { quantity: summary.expiredQuantity, label: '만료', className: 'stock-lot-expired' },
    { quantity: summary.expiringSoonQuantity, label: '임박', className: 'stock-lot-expiring_soon' },
  ].filter((chip) => chip.quantity > 0)
  if (chips.length === 0) return <span className="stock-muted">-</span>
  return <div className="stock-badges">{chips.map((chip) => <span key={chip.label} className={`stock-badge ${chip.className}`}>{chip.label} {chip.quantity}</span>)}</div>
}

/**
 * 재고 현황의 상품별 보기. 조건에 맞는 재고 행을 상품 단위로 합친 요약을 서버 페이지(20개 상품)로 읽고,
 * 상품을 펼칠 때만 그 상품의 재고 행을 읽어 창고·Lot이 늘어도 한꺼번에 받지 않는다.
 */
export function StockSummaryPanel({ filters, warehouseName, onOpen }: Props) {
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<ReadonlySet<number>>(new Set())
  const query = useStockSummaries({ ...filters, page: page - 1, size: SUMMARY_PAGE_SIZE })
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)

  function toggle(productId: number) {
    setExpanded((current) => {
      const next = new Set(current)
      if (!next.delete(productId)) next.add(productId)
      return next
    })
  }

  return <section className="panel audit-list-panel">
    <div className="panel-heading"><div><p className="eyebrow">STOCK BY PRODUCT</p><h2>상품별 재고</h2></div><small>{total}개 상품</small></div>
    {query.isLoading && <p>재고를 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toStockErrorMessage(query.error)}</p>}
    {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 재고가 없습니다.</p>}
    {items.length > 0 && <div className="audit-table-wrap">
      <table className="audit-table stock-summary-table">
        <thead><tr><th>상품</th><th className="stock-num">창고</th><th className="stock-num">총</th><th className="stock-num">예약</th><th className="stock-num">가용</th><th>주의</th><th>행</th></tr></thead>
        <tbody>
          {items.map((summary) => {
            const open = expanded.has(summary.productId)
            return <Fragment key={summary.productId}>
              <tr>
                <td><strong>{summary.productName}</strong><small>{summary.productCode}</small></td>
                <td className="stock-num">{summary.warehouseCount}</td>
                <td className="stock-num">{summary.quantity} {summary.unit}</td>
                <td className="stock-num">{summary.reservedQuantity} {summary.unit}</td>
                <td className="stock-num"><b>{summary.availableQuantity} {summary.unit}</b></td>
                <td><Cautions summary={summary} /></td>
                <td><button type="button" className="audit-view" aria-expanded={open} aria-label={`${summary.productName} 재고 행 ${open ? '접기' : '펼치기'}`} onClick={() => toggle(summary.productId)}>{open ? '접기' : `${summary.rowCount}행`}</button></td>
              </tr>
              {open && <tr className="stock-product-detail"><td colSpan={7}><ProductRows productId={summary.productId} filters={filters} warehouseName={warehouseName} onOpen={onOpen} /></td></tr>}
            </Fragment>
          })}
        </tbody>
      </table>
    </div>}
    {totalPages > 1 && <div className="inbound-pagination">
      <button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setExpanded(new Set()) }}>이전</button>
      <span>{page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => { setPage(page + 1); setExpanded(new Set()) }}>다음</button>
    </div>}
  </section>
}
