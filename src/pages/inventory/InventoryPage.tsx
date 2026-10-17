import { useCallback, useMemo, useState } from 'react'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { qualityStatusLabels, zoneCodeLabels, type LocationStock, type ZoneCode } from '../../features/inventory/model/inventorySchemas'
import { useLocationStocks } from '../../features/inventory/model/useLocationStocks'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useProducts } from '../../features/product/model/useProducts'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { useZoneLocations } from '../../features/warehouse/model/useZoneLocations'

type LocationRow = { locationId: number; zoneCode: ZoneCode; locationCode: string; capacity: number; used: number; stocks: LocationStock[] }
type LoadStatus = 'ok' | 'warning' | 'critical'

function statusOf(used: number, capacity: number): LoadStatus {
  const ratio = capacity ? used / capacity : 0
  if (ratio >= .95) return 'critical'
  if (ratio >= .8) return 'warning'
  return 'ok'
}

function statusLabel(status: LoadStatus) {
  return status === 'critical' ? '포화 임박' : status === 'warning' ? '주의' : '정상'
}

function formatUpdatedAt(value: string | null) {
  return value ? value.replace('T', ' ').slice(0, 16) : '-'
}

function latestUpdatedAt(stocks: LocationStock[]) {
  return formatUpdatedAt(stocks.reduce<string | null>((latest, stock) => (stock.updatedAt && (!latest || stock.updatedAt > latest) ? stock.updatedAt : latest), null))
}

export function InventoryPage() {
  const user = useCurrentUser()
  const warehouseIds = user.scope.warehouseIds
  const zoneSummaryQuery = useZoneInventorySummary(warehouseIds)
  const warehousesQuery = useWarehouses(warehouseIds)
  const summaries = zoneSummaryQuery?.data
  const zoneCodeById = useMemo(() => new Map((summaries ?? []).map((zone) => [zone.zoneId, zone.zoneCode])), [summaries])
  const locationsQuery = useZoneLocations((summaries ?? []).map((zone) => zone.zoneId))
  const stocksQuery = useLocationStocks(warehouseIds)
  const productsQuery = useProducts()
  const [query, setQuery] = useState('')
  const [zoneFilter, setZoneFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')
  const [expandedLocations, setExpandedLocations] = useState<Set<number>>(new Set())
  const warehouse = warehousesQuery?.data?.[0]
  const productNames = useMemo(() => new Map((productsQuery.data ?? []).map((product) => [product.productId, product.productName])), [productsQuery.data])
  const productName = useCallback((productId: number) => productNames.get(productId) ?? `상품 #${productId}`, [productNames])

  const locations = useMemo<LocationRow[]>(() => {
    const stocksByLocation = new Map<number, LocationStock[]>()
    ;(stocksQuery.data ?? []).forEach((stock) => stocksByLocation.set(stock.locationId, [...(stocksByLocation.get(stock.locationId) ?? []), stock]))
    return locationsQuery.data.flatMap((location) => {
      const zoneCode = zoneCodeById.get(location.zoneId)
      return zoneCode ? [{ locationId: location.locationId, zoneCode, locationCode: location.locationCode, capacity: location.maxCapacity, used: location.usedCapacity, stocks: stocksByLocation.get(location.locationId) ?? [] }] : []
    }).sort((a, b) => a.zoneCode.localeCompare(b.zoneCode) || a.locationCode.localeCompare(b.locationCode))
  }, [locationsQuery.data, stocksQuery.data, zoneCodeById])

  const filteredLocations = useMemo(() => locations.filter((location) => {
    const keyword = query.trim().toLowerCase()
    const matchesQuery = !keyword || `${location.locationCode} ${location.stocks.map((stock) => `${productName(stock.productId)} ${stock.lotNumber}`).join(' ')}`.toLowerCase().includes(keyword)
    const matchesZone = zoneFilter === 'ALL' || location.zoneCode === zoneFilter
    const matchesStatus = statusFilter === 'ALL' || statusOf(location.used, location.capacity) === statusFilter
    return matchesQuery && matchesZone && matchesStatus
  }), [locations, productName, query, statusFilter, zoneFilter])

  const toggleLocation = (locationId: number) => setExpandedLocations((current) => {
    const next = new Set(current)
    if (next.has(locationId)) next.delete(locationId)
    else next.add(locationId)
    return next
  })

  const loading = zoneSummaryQuery.isLoading || warehousesQuery.isLoading || locationsQuery.isLoading || stocksQuery.isLoading
  const error = zoneSummaryQuery.isError ? zoneSummaryQuery.error : locationsQuery.isError ? locationsQuery.error : stocksQuery.isError ? stocksQuery.error : null
  const failed = zoneSummaryQuery.isError || locationsQuery.isError || stocksQuery.isError

  return (
    <>
      <header className="page-header inventory-page-header"><div><p>INVENTORY</p><h1>Location 재고</h1><strong className="inventory-warehouse-name">{warehouse?.warehouseName ?? '담당 창고'}</strong><span>의 Location별 적재 재고를 조회합니다.</span></div></header>
      {warehouseIds.length === 0 ? <section className="panel"><h2>접근 가능한 창고가 없습니다</h2><p>계정에 연결된 창고가 없어 재고 현황을 표시할 수 없습니다.</p></section>
        : loading ? <section className="panel"><p>재고 현황을 불러오는 중입니다...</p></section>
          : failed ? <section className="panel"><h2>재고 현황을 불러오지 못했습니다</h2><p>{error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.'}</p></section>
            : <>
              <section className="panel inventory-zone-panel"><div className="panel-heading"><div><p className="eyebrow">ZONE</p><h2>Zone별 적재율</h2></div><span className="inventory-count">{summaries?.length ?? 0} Zones</span></div><div className="inventory-zone-grid">{(summaries ?? []).map((zone) => <article className="inventory-zone-card" key={zone.zoneId}><header><strong>{zoneCodeLabels[zone.zoneCode]}</strong><b>사용률 {Math.round(zone.usageRate * 100)}%</b></header><div className="usage-bar"><div className={`usage-bar-fill ${statusOf(zone.usedCapacity, zone.maxCapacity)}`} style={{ width: `${Math.min(zone.usageRate * 100, 100)}%` }} /></div><p><strong>{zone.usedCapacity}</strong> / {zone.maxCapacity} <span>잔여 {zone.maxCapacity - zone.usedCapacity}</span></p></article>)}</div></section>

              <section className="panel inventory-location-panel"><div className="panel-heading"><div><p className="eyebrow">LOCATION INVENTORY</p><h2>Location별 재고</h2></div><span className="inventory-count">{filteredLocations.length}개 Location</span></div>
                <div className="inventory-filters"><label><span className="sr-only">Location 또는 상품 검색</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Location, 상품, Lot 검색" /></label><select value={zoneFilter} onChange={(event) => setZoneFilter(event.target.value)} aria-label="Zone 필터"><option value="ALL">전체 Zone</option>{Object.keys(zoneCodeLabels).map((code) => <option key={code} value={code}>{code} Zone · {zoneCodeLabels[code as ZoneCode]}</option>)}</select><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} aria-label="적재 상태 필터"><option value="ALL">전체 상태</option><option value="ok">정상</option><option value="warning">주의</option><option value="critical">포화 임박</option></select></div>
                <div className="inventory-table-wrap"><table className="inventory-table"><colgroup><col className="col-location" /><col className="col-zone" /><col className="col-product" /><col className="col-stock" /><col className="col-rate" /><col className="col-status" /><col className="col-quality" /><col className="col-updated" /></colgroup>
                  <thead><tr><th>Location</th><th>Zone</th><th>상품</th><th>현재 적재</th><th>적재율</th><th>상태</th><th>품질</th><th>최종 변경</th></tr></thead>
                  <tbody>{filteredLocations.map((location) => {
                    const status = statusOf(location.used, location.capacity)
                    const rate = location.capacity ? Math.round(location.used / location.capacity * 100) : 0
                    const expanded = expandedLocations.has(location.locationId)
                    return <LocationRows key={location.locationId} expanded={expanded} onToggle={() => toggleLocation(location.locationId)} location={location} status={status} rate={rate} productName={productName} />
                  })}</tbody></table>
                  {filteredLocations.length === 0 && <p className="inventory-empty">조건에 맞는 Location이 없습니다.</p>}</div></section>
            </>}
    </>
  )
}

function LocationRows({ location, status, rate, expanded, onToggle, productName }: { location: LocationRow; status: LoadStatus; rate: number; expanded: boolean; onToggle: () => void; productName: (productId: number) => string }) {
  const needsCheck = location.stocks.some((stock) => stock.qualityStatus !== 'NORMAL')
  return <>
    <tr className={`location-row ${expanded ? 'expanded' : ''}`} tabIndex={0} onClick={onToggle} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); onToggle() } }}>
      <th scope="row"><button type="button" className="location-expand-button" onClick={(event) => { event.stopPropagation(); onToggle() }} aria-expanded={expanded} aria-label={`${location.locationCode} 상품 상세 ${expanded ? '접기' : '펼치기'}`}><span aria-hidden="true">{expanded ? '⌄' : '›'}</span>{location.locationCode}</button></th>
      <td><span className={`zone-pill zone-${location.zoneCode.toLowerCase()}`}>{location.zoneCode} · {zoneCodeLabels[location.zoneCode]}</span></td>
      <td><strong>{location.stocks.length}개 재고</strong></td>
      <td><strong>{location.used}</strong> / {location.capacity}</td>
      <td><div className="table-rate"><div className="table-rate-track"><div className={`usage-bar-fill ${status}`} style={{ width: `${Math.min(rate, 100)}%` }} /></div><span>{rate}%</span></div></td>
      <td><span className={`inventory-status ${status}`}>{statusLabel(status)}</span></td>
      <td><span className="quality-summary">{needsCheck ? '확인 필요' : '정상'}</span></td>
      <td>{latestUpdatedAt(location.stocks)}</td>
    </tr>
    {expanded && <tr className="location-detail-row"><td colSpan={8}>
      {location.stocks.length === 0 ? <p className="inventory-empty">적재된 재고가 없습니다.</p>
        : <div className="location-products">{location.stocks.map((stock) => <div className="location-product" key={stock.locationStockId}>
          <span className="location-product-name">{productName(stock.productId)}<small>{stock.lotNumber}</small></span>
          <strong>{stock.quantity} ea</strong>
          <span className="location-product-rate"><i><em style={{ width: `${Math.min(location.capacity ? stock.quantity / location.capacity * 100 : 0, 100)}%` }} /></i><b>{location.capacity ? Math.round(stock.quantity / location.capacity * 100) : 0}%</b></span>
          <span className={`quality-status quality-${stock.qualityStatus.toLowerCase()}`}>{qualityStatusLabels[stock.qualityStatus]}</span>
          <time>{formatUpdatedAt(stock.updatedAt)}</time>
        </div>)}</div>}
    </td></tr>}
  </>
}
