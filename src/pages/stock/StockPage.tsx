import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllMaterials } from '../../features/material/model/useMaterials'
import { filtersFromSearch } from '../../features/stock/model/stockFilterParams'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import { labelOf, lotStatusLabels, qualityStatusLabels, type StockFilters, type StockItem } from '../../features/stock/model/stockSchemas'
import { useStocks } from '../../features/stock/model/useStocks'
import { useWarehouseList } from '../../features/warehouse/model/useWarehouses'
import { StockDetailModal } from './StockDetailModal'
import { StockFilterForm } from './StockFilterForm'

const PAGE_SIZE = 20

/** 재고 관리 모드의 재고 현황. inventory 서비스의 재고 행(창고 × Lot × 품질 상태)을 읽기 전용으로 보여준다. */
export function StockPage() {
  const [searchParams] = useSearchParams()
  const [initialFilters] = useState(() => filtersFromSearch(searchParams))
  const [filters, setFilters] = useState<StockFilters>(initialFilters)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const query = useStocks({ ...filters, page: page - 1, size: PAGE_SIZE })
  const products = useAllMaterials()
  const warehouses = useWarehouseList()
  const warehouseById = useMemo(() => new Map((warehouses.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse])), [warehouses.data])
  const productById = useMemo(() => new Map((products.data ?? []).map((product) => [product.productId, product])), [products.data])
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)

  // 창고 이름을 못 읽었으면(권한 없음, 서버 오류) id로 보여준다.
  function warehouseName(warehouseId: number): string | null {
    return warehouseById.get(warehouseId)?.warehouseName ?? null
  }

  // 상품 이름을 아직 못 읽었거나 마스터에 없으면 id로 보여준다.
  function productName(productId: number): string {
    return productById.get(productId)?.productName ?? `상품 ${productId}`
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>INVENTORY MANAGEMENT</p><h1>재고 현황</h1></div>
    </header>
    <p className="employee-hint role-intro">재고 서비스의 재고 행(창고 × Lot × 품질 상태) 목록입니다. 가용 수량은 총 수량에서 예약 수량을 뺀 값이며 품질 상태와 할당 보류는 반영하지 않습니다.</p>
    <StockFilterForm initial={initialFilters} products={products.data ?? []} warehouses={warehouses.data ?? []} onApply={(applied) => { setFilters(applied); setPage(1) }} />
    <section className="panel audit-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">STOCK</p><h2>재고</h2></div><small>{total}건</small></div>
      {query.isLoading && <p>재고를 불러오는 중입니다...</p>}
      {query.isError && <p className="inbound-error" role="alert">{toStockErrorMessage(query.error)}</p>}
      {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 재고가 없습니다.</p>}
      {items.length > 0 && <div className="audit-table-wrap">
        <table className="audit-table stock-table">
          <thead><tr><th>상품</th><th>창고</th><th>Lot</th><th>상태</th><th className="stock-num">총</th><th className="stock-num">예약</th><th className="stock-num">가용</th><th>상세</th></tr></thead>
          <tbody>
            {items.map((item) => <tr key={item.inventoryId}>
              <td><strong>{productName(item.productId)}</strong><small>{productById.get(item.productId)?.productCode ?? `id ${item.productId}`}</small></td>
              <td>{warehouseName(item.warehouseId) ?? item.warehouseId}{warehouseName(item.warehouseId) && <small>id {item.warehouseId}</small>}</td>
              <td>{item.lotNumber}<small>{item.expirationDate ? `유통기한 ${item.expirationDate}` : '유통기한 없음'}</small></td>
              <td><div className="stock-badges">
                <span className={`stock-badge stock-quality-${item.qualityStatus.toLowerCase()}`}>{labelOf(qualityStatusLabels, item.qualityStatus)}</span>
                {item.lotStatus !== 'NORMAL' && <span className={`stock-badge stock-lot-${item.lotStatus.toLowerCase()}`}>{labelOf(lotStatusLabels, item.lotStatus)}</span>}
                {item.allocationHold && <span className="stock-badge stock-hold" title={item.holdReason ?? undefined}>할당 보류</span>}
              </div></td>
              <td className="stock-num">{item.quantity}</td>
              <td className="stock-num">{item.reservedQuantity}</td>
              <td className="stock-num"><b>{item.availableQuantity}</b></td>
              <td><button type="button" className="audit-view" aria-label={`${productName(item.productId)} ${item.lotNumber} 상세 보기`} onClick={() => { setSelected(item); setDetailOpen(true) }}>보기</button></td>
            </tr>)}
          </tbody>
        </table>
      </div>}
      {totalPages > 1 && <div className="inbound-pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
      </div>}
    </section>
    <StockDetailModal item={selected} productLabel={selected ? productName(selected.productId) : ''} warehouseLabel={selected ? warehouseName(selected.warehouseId) : null} open={detailOpen} onClose={() => setDetailOpen(false)} />
  </>
}
