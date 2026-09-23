import { useEffect, useMemo, useState } from 'react'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { qualityStatusLabels, zoneCodeLabels, type QualityStatus, type ZoneCode, type ZoneInventorySummary } from '../../features/inventory/model/inventorySchemas'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'

type ProductStock = { id: string; name: string; quantity: number; quality: QualityStatus; lot: string; updatedAt: string }
type LocationRow = { id: string; zoneCode: ZoneCode; capacity: number; products: ProductStock[] }

const workAreas = [
  { label: '입고 처리장', used: 22, capacity: 50 },
  { label: '출고장', used: 31, capacity: 50 },
  { label: '반품 처리장', used: 8, capacity: 30 },
  { label: '폐기 처리장', used: 12, capacity: 20 },
]

const mockLocations: LocationRow[] = [
  { id: 'A-01', zoneCode: 'A', capacity: 70, products: [{ id: 'SKU-1001', name: '에티오피아 싱글 오리진', quantity: 35, quality: 'NORMAL', lot: 'LOT-250922-A', updatedAt: '오늘 10:24' }, { id: 'SKU-1002', name: '브라질 세하도', quantity: 20, quality: 'NORMAL', lot: 'LOT-250921-B', updatedAt: '오늘 09:42' }, { id: 'SKU-1003', name: '콜롬비아 수프리모', quantity: 8, quality: 'DISPOSAL_SCHEDULED', lot: 'LOT-250815-C', updatedAt: '어제 16:12' }] },
  { id: 'A-02', zoneCode: 'A', capacity: 60, products: [{ id: 'SKU-1004', name: '브라질 세하도', quantity: 25, quality: 'NORMAL', lot: 'LOT-250920-D', updatedAt: '오늘 09:42' }] },
  { id: 'A-03', zoneCode: 'A', capacity: 50, products: [{ id: 'SKU-1005', name: '콜롬비아 수프리모', quantity: 40, quality: 'DISPOSAL_SCHEDULED', lot: 'LOT-250810-E', updatedAt: '어제 16:12' }] },
  { id: 'B-01', zoneCode: 'B', capacity: 60, products: [{ id: 'SKU-2001', name: '바닐라 시럽', quantity: 18, quality: 'NORMAL', lot: 'LOT-250918-F', updatedAt: '오늘 09:58' }, { id: 'SKU-2002', name: '헤이즐넛 시럽', quantity: 12, quality: 'NORMAL', lot: 'LOT-250916-G', updatedAt: '어제 18:20' }] },
  { id: 'B-02', zoneCode: 'B', capacity: 60, products: [{ id: 'SKU-2003', name: '카라멜 시럽', quantity: 42, quality: 'DEFECTIVE', lot: 'LOT-250901-H', updatedAt: '어제 14:25' }] },
  { id: 'C-01', zoneCode: 'C', capacity: 50, products: [{ id: 'SKU-3001', name: '초콜릿 파우더', quantity: 28, quality: 'DEFECTIVE', lot: 'LOT-250907-I', updatedAt: '오늘 08:40' }, { id: 'SKU-3002', name: '코코아 파우더', quantity: 18, quality: 'NORMAL', lot: 'LOT-250910-J', updatedAt: '어제 17:05' }] },
  { id: 'C-02', zoneCode: 'C', capacity: 50, products: [{ id: 'SKU-3003', name: '말차 파우더', quantity: 45, quality: 'NORMAL', lot: 'LOT-250912-K', updatedAt: '어제 17:05' }] },
  { id: 'D-01', zoneCode: 'D', capacity: 40, products: [{ id: 'SKU-4001', name: '우유', quantity: 15, quality: 'NORMAL', lot: 'LOT-250922-L', updatedAt: '오늘 10:02' }] },
  { id: 'D-02', zoneCode: 'D', capacity: 40, products: [{ id: 'SKU-4002', name: '오트밀크', quantity: 15, quality: 'NORMAL', lot: 'LOT-250922-M', updatedAt: '오늘 09:35' }] },
  { id: 'E-01', zoneCode: 'E', capacity: 100, products: [{ id: 'SKU-5001', name: '12oz 컵', quantity: 45, quality: 'NORMAL', lot: 'LOT-250901-N', updatedAt: '오늘 10:18' }, { id: 'SKU-5002', name: '16oz 컵', quantity: 25, quality: 'NORMAL', lot: 'LOT-250902-O', updatedAt: '오늘 09:50' }] },
  { id: 'E-02', zoneCode: 'E', capacity: 100, products: [{ id: 'SKU-5003', name: '컵 리드', quantity: 60, quality: 'NORMAL', lot: 'LOT-250903-P', updatedAt: '오늘 09:50' }] },
  { id: 'E-03', zoneCode: 'E', capacity: 90, products: [{ id: 'SKU-5004', name: '종이 쇼핑백', quantity: 60, quality: 'NORMAL', lot: 'LOT-250904-Q', updatedAt: '어제 18:22' }] },
  { id: 'E-04', zoneCode: 'E', capacity: 80, products: [{ id: 'SKU-5005', name: '포장 박스', quantity: 54, quality: 'NORMAL', lot: 'LOT-250905-R', updatedAt: '어제 15:47' }] },
]

function locationStock(location: LocationRow) { return location.products.reduce((total, product) => total + product.quantity, 0) }
function locationUpdatedAt(location: LocationRow) { return location.products[0]?.updatedAt ?? '-' }

function statusOf(stock: number, capacity: number) {
  const ratio = stock / capacity
  if (ratio >= .95) return 'critical'
  if (ratio >= .8) return 'warning'
  return 'ok'
}

function statusLabel(status: ReturnType<typeof statusOf>) {
  return status === 'critical' ? '포화 임박' : status === 'warning' ? '주의' : '정상'
}

function summaryTotals(summaries: ZoneInventorySummary[]) {
  return summaries.reduce((total, zone) => ({
    capacity: total.capacity + zone.maxCapacity,
    stock: total.stock + zone.usedCapacity,
    normal: total.normal + (zone.quantityByQualityStatus.NORMAL ?? 0),
    defective: total.defective + (zone.quantityByQualityStatus.DEFECTIVE ?? 0),
    disposal: total.disposal + (zone.quantityByQualityStatus.DISPOSAL_SCHEDULED ?? 0),
  }), { capacity: 0, stock: 0, normal: 0, defective: 0, disposal: 0 })
}

export function InventoryPage() {
  const user = useCurrentUser()
  const warehouseIds = user.scope.warehouseIds
  const zoneSummaryQuery = useZoneInventorySummary(warehouseIds)
  const warehousesQuery = useWarehouses(warehouseIds)
  const [query, setQuery] = useState('')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expandedLocations, setExpandedLocations] = useState<Set<string>>(new Set())
  const summaries = zoneSummaryQuery?.data ?? []
  const totals = summaryTotals(summaries)
  const warehouse = warehousesQuery?.data?.[0]
  const filteredLocations = useMemo(() => mockLocations.filter((location) => {
    const matchesQuery = !query || `${location.id} ${location.products.map((product) => product.name).join(' ')}`.toLowerCase().includes(query.toLowerCase())
    const matchesZone = zoneFilter === 'ALL' || location.zoneCode === zoneFilter
    const matchesStatus = statusFilter === 'ALL' || statusOf(locationStock(location), location.capacity) === statusFilter
    return matchesQuery && matchesZone && matchesStatus
  }), [query, statusFilter, zoneFilter])
  const toggleLocation = (locationId: string) => setExpandedLocations((current) => {
    const next = new Set(current)
    if (next.has(locationId)) next.delete(locationId)
    else next.add(locationId)
    return next
  })
  useEffect(() => {
    const table = document.querySelector<HTMLElement>('.inventory-table')
    if (!table) return
    table.querySelectorAll<HTMLElement>('tr.location-row').forEach((row) => row.setAttribute('tabindex', '0'))
    const toggleFromRow = (target: EventTarget | null) => {
      const element = target instanceof HTMLElement ? target : null
      const row = element?.closest('tr.location-row')
      if (!row || element?.closest('button')) return
      row.querySelector<HTMLButtonElement>('.location-expand-button')?.click()
    }
    const handleClick = (event: MouseEvent) => toggleFromRow(event.target)
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Enter' && event.key !== ' ') return
      const row = (event.target as HTMLElement).closest('tr.location-row')
      if (!row || (event.target as HTMLElement).closest('button')) return
      event.preventDefault()
      toggleFromRow(row)
    }
    table.addEventListener('click', handleClick)
    table.addEventListener('keydown', handleKeyDown)
    return () => { table.removeEventListener('click', handleClick); table.removeEventListener('keydown', handleKeyDown) }
  }, [filteredLocations, zoneSummaryQuery?.isLoading])

  return (
    <>
      <header className="page-header inventory-page-header"><div><p>INVENTORY</p><h1>재고 현황</h1><strong className="inventory-warehouse-name">{warehouse?.warehouseName ?? '담당 창고'}</strong><span>의 Location별 재고를 조회하고 관리합니다.</span></div></header>
      {warehouseIds.length === 0 ? <section className="panel"><h2>접근 가능한 창고가 없습니다</h2><p>계정에 연결된 창고가 없어 재고 현황을 표시할 수 없습니다.</p></section>
        : zoneSummaryQuery.isLoading || warehousesQuery.isLoading ? <section className="panel"><p>재고 현황을 불러오는 중입니다...</p></section>
          : zoneSummaryQuery.isError ? <section className="panel"><h2>재고 현황을 불러오지 못했습니다</h2><p>{zoneSummaryQuery.error instanceof Error ? zoneSummaryQuery.error.message : '알 수 없는 오류가 발생했습니다.'}</p></section>
            : <>
              <section className="inventory-summary-grid" aria-label="재고 요약">
                <article><span>전체 재고</span><strong>{totals.stock.toLocaleString()}<small> ea</small></strong><em>전체 용량 {totals.capacity.toLocaleString()} ea</em></article>
                <article><span>전체 가동률</span><strong>{totals.capacity ? Math.round(totals.stock / totals.capacity * 100) : 0}<small>%</small></strong><em>담당 창고 기준</em></article>
                <article className="summary-ok"><span>정상 재고</span><strong>{totals.normal.toLocaleString()}<small> ea</small></strong><em>정상 품질 상태</em></article>
                <article className="summary-warning"><span>불량 재고</span><strong>{totals.defective.toLocaleString()}<small> ea</small></strong><em>확인 및 분리 필요</em></article>
                <article className="summary-danger"><span>폐기 예정</span><strong>{totals.disposal.toLocaleString()}<small> ea</small></strong><em>폐기 처리 대기</em></article>
              </section>

              <section className="panel inventory-zone-panel"><div className="panel-heading"><div><p className="eyebrow">ZONE SUMMARY</p><h2>Zone별 요약</h2></div><span className="inventory-count">{summaries.length} Zones</span></div><div className="inventory-zone-grid">{summaries.map((zone) => <article className="inventory-zone-card" key={zone.zoneId}><header><strong>{zoneCodeLabels[zone.zoneCode]}</strong><b>사용률 {Math.round(zone.usageRate * 100)}%</b></header><div className="usage-bar"><div className={`usage-bar-fill ${statusOf(zone.usedCapacity, zone.maxCapacity)}`} style={{ width: `${Math.min(zone.usageRate * 100, 100)}%` }} /></div><p><strong>{zone.usedCapacity}</strong> / {zone.maxCapacity} <span>잔여 {zone.maxCapacity - zone.usedCapacity}</span></p><small><b>정상 {zone.quantityByQualityStatus.NORMAL ?? 0}</b><b>불량 {zone.quantityByQualityStatus.DEFECTIVE ?? 0}</b><b>폐기 예정 {zone.quantityByQualityStatus.DISPOSAL_SCHEDULED ?? 0}</b></small></article>)}</div></section>

              <section className="panel inventory-workarea-panel"><div className="panel-heading"><div><p className="eyebrow">WORK AREAS</p><h2>작업 처리장 Capacity</h2></div></div><div className="capacity-work-grid">{workAreas.map((area) => { const usage = area.used / area.capacity; return <article key={area.label}><header><strong>{area.label}</strong><span>{Math.round(usage * 100)}%</span></header><div className="usage-bar"><div className={`usage-bar-fill ${usage >= .9 ? 'danger' : usage >= .8 ? 'warning' : ''}`} style={{ width: `${usage * 100}%` }} /></div><p>{area.used} / {area.capacity}</p></article> })}</div></section>

              <section className="panel inventory-location-panel"><div className="panel-heading"><div><p className="eyebrow">LOCATION INVENTORY</p><h2>Location별 재고</h2></div><span className="inventory-count">{filteredLocations.length}개 Location</span></div><div className="inventory-filters"><label><span className="sr-only">Location 또는 상품 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Location 또는 상품 검색" /></label><select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} aria-label="Zone 필터"><option value="ALL">전체 Zone</option>{Object.keys(zoneCodeLabels).map((code) => <option key={code} value={code}>{code} Zone · {zoneCodeLabels[code as ZoneCode]}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="재고 상태 필터"><option value="ALL">전체 상태</option><option value="ok">정상</option><option value="warning">주의</option><option value="critical">포화 임박</option></select></div><div className="inventory-table-wrap"><table className="inventory-table"><colgroup><col className="col-location" /><col className="col-zone" /><col className="col-product" /><col className="col-stock" /><col className="col-rate" /><col className="col-status" /><col className="col-quality" /><col className="col-updated" /></colgroup><thead><tr><th>Location</th><th>Zone</th><th>상품</th><th>현재 재고</th><th>적재율</th><th>상태</th><th>품질</th><th>최종 변경</th></tr></thead><tbody>{filteredLocations.map((location) => { const stock = locationStock(location); const status = statusOf(stock, location.capacity); const expanded = expandedLocations.has(location.id); return <><tr className={`location-row ${expanded ? 'expanded' : ''}`} key={location.id}><th scope="row"><button type="button" className="location-expand-button" onClick={() => toggleLocation(location.id)} aria-expanded={expanded} aria-label={`${location.id} 상품 상세 ${expanded ? '접기' : '펼치기'}`}><span aria-hidden="true">{expanded ? '⌄' : '›'}</span>{location.id}</button></th><td><span className={`zone-pill zone-${location.zoneCode.toLowerCase()}`}>{location.zoneCode} · {zoneCodeLabels[location.zoneCode]}</span></td><td><strong>{location.products.length}개 상품</strong></td><td><strong>{stock}</strong> / {location.capacity}</td><td><div className="table-rate"><div className="table-rate-track"><div className={`usage-bar-fill ${status}`} style={{ width: `${stock / location.capacity * 100}%` }} /></div><span>{Math.round(stock / location.capacity * 100)}%</span></div></td><td><span className={`inventory-status ${status}`}>{statusLabel(status)}</span></td><td><span className="quality-summary">{location.products.filter((product) => product.quality !== 'NORMAL').length ? '확인 필요' : '정상'}</span></td><td>{locationUpdatedAt(location)}</td></tr>{expanded && <tr className="location-detail-row" key={`${location.id}-details`}><td colSpan={8}><div className="location-products">{location.products.map((product) => <div className="location-product" key={product.id}><span className="location-product-name">{product.name}<small>{product.lot}</small></span><strong>{product.quantity} ea</strong><span className="location-product-rate"><i><em style={{ width: `${Math.min(product.quantity / location.capacity * 100, 100)}%` }} /></i><b>{Math.round(product.quantity / location.capacity * 100)}%</b></span><span className={`quality-status quality-${product.quality.toLowerCase()}`}>{qualityStatusLabels[product.quality]}</span><time>{product.updatedAt}</time></div>)}</div></td></tr>}</> })}</tbody></table>{filteredLocations.length === 0 && <p className="inventory-empty">조건에 맞는 Location이 없습니다.</p>}</div></section>
            </>}
    </>
  )
}
