import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAllMaterials } from '../../features/material/model/useMaterials'
import { filtersFromSearch } from '../../features/stock/model/stockFilterParams'
import type { StockFilters, StockItem } from '../../features/stock/model/stockSchemas'
import { useWarehouseList } from '../../features/warehouse/model/useWarehouses'
import { StockDetailModal } from './StockDetailModal'
import { StockFilterForm } from './StockFilterForm'
import { StockRowsPanel } from './StockRowsPanel'
import { StockSummaryPanel } from './StockSummaryPanel'

type View = 'rows' | 'products'

const views: ReadonlyArray<{ id: View; label: string }> = [{ id: 'products', label: '상품별 보기' }, { id: 'rows', label: '행 보기' }]

/**
 * 원자재·재고 관리 모드의 재고 현황. inventory 서비스의 재고를 읽기 전용으로 보여준다.
 * 상품별 보기(기본)는 조건에 맞는 재고 행을 상품 단위로 합친 요약을 보여주고 상품을 펼치면 그 상품의 행을 보여준다. 행 보기는 재고 행(창고 × Lot × 품질 상태)을 보여준다.
 */
export function StockPage() {
  const [searchParams] = useSearchParams()
  const [initialFilters] = useState(() => filtersFromSearch(searchParams))
  const [filters, setFilters] = useState<StockFilters>(initialFilters)
  // 조건을 다시 적용할 때마다 올려 패널의 페이지·펼침 상태를 처음으로 되돌린다.
  const [appliedCount, setAppliedCount] = useState(0)
  // 기본은 상품별 보기다. 홈 카드처럼 재고 행 수를 세어 연결하는 곳은 `?view=rows`로 행 보기를 지정한다.
  const [view, setView] = useState<View>(() => (searchParams.get('view') === 'rows' ? 'rows' : 'products'))
  const [selected, setSelected] = useState<StockItem | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  // 상품 필터의 선택지만 원자재 목록을 쓴다. 재고 행의 상품 이름·코드는 재고 응답에 들어 있다.
  const products = useAllMaterials()
  const warehouses = useWarehouseList()
  const warehouseById = useMemo(() => new Map((warehouses.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse])), [warehouses.data])

  // 창고 이름을 못 읽었으면(권한 없음, 서버 오류) id로 보여준다.
  const warehouseName = (warehouseId: number): string | null => warehouseById.get(warehouseId)?.warehouseName ?? null
  const open = (item: StockItem) => { setSelected(item); setDetailOpen(true) }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>INVENTORY MANAGEMENT</p><h1>재고 현황</h1></div>
      <div className="stock-view-toggle" role="group" aria-label="보기 방식">
        {views.map(({ id, label }) => <button key={id} type="button" className={view === id ? 'active' : ''} aria-pressed={view === id} onClick={() => setView(id)}>{label}</button>)}
      </div>
    </header>
    <p className="employee-hint role-intro">재고 서비스의 재고입니다. 상품별 보기는 같은 조건의 재고 행을 상품 단위로 합쳐, 행 보기는 재고 행(창고 × Lot × 품질 상태)을 그대로 보여줍니다. 가용 수량은 총 수량에서 예약 수량을 뺀 값이며 품질 상태와 할당 보류는 반영하지 않습니다.</p>
    <StockFilterForm initial={initialFilters} products={products.data ?? []} warehouses={warehouses.data ?? []} onApply={(applied) => { setFilters(applied); setAppliedCount((count) => count + 1) }} />
    {view === 'rows'
      ? <StockRowsPanel key={appliedCount} filters={filters} warehouseName={warehouseName} onOpen={open} />
      : <StockSummaryPanel key={appliedCount} filters={filters} warehouseName={warehouseName} onOpen={open} />}
    <StockDetailModal item={selected} productLabel={selected?.productName ?? ''} warehouseLabel={selected ? warehouseName(selected.warehouseId) : null} open={detailOpen} onClose={() => setDetailOpen(false)} />
  </>
}
