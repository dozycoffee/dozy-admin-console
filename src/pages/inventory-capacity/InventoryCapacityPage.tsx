import { Link } from 'react-router-dom'
import { qualityStatusLabels, zoneCodeLabels } from '../../features/inventory/model/inventorySchemas'
import { mockWarehouseName, mockZoneSummaries } from '../dashboard/warehouseMockData'

const workAreas = [
  { label: '입고 처리장', used: 22, capacity: 50 },
  { label: '출고장', used: 31, capacity: 50 },
  { label: '반품 처리장', used: 8, capacity: 30 },
  { label: '폐기 처리장', used: 12, capacity: 20 },
]

export function InventoryCapacityPage() {
  const totalUsed = mockZoneSummaries.reduce((sum, zone) => sum + zone.usedCapacity, 0)
  const totalCapacity = mockZoneSummaries.reduce((sum, zone) => sum + zone.maxCapacity, 0)
  return <>
    <header className="page-header"><div><p>CAPACITY ANALYSIS</p><h1>{mockWarehouseName} 적재 현황</h1><span>보관 Zone과 작업 처리장의 Capacity를 비교합니다.</span></div><Link to="/warehouse-map" className="button secondary">평면도 보기</Link></header>
    <section className="capacity-summary-grid"><article><span>전체 보관 Capacity</span><strong>{Math.round(totalUsed / totalCapacity * 100)}%</strong><small>{totalUsed} / {totalCapacity}</small></article><article><span>주의 Zone</span><strong>{mockZoneSummaries.filter((zone) => zone.usageRate >= .8).length}</strong><small>사용률 80% 이상</small></article><article><span>작업 처리장</span><strong>{Math.round(workAreas.reduce((sum, area) => sum + area.used, 0) / workAreas.reduce((sum, area) => sum + area.capacity, 0) * 100)}%</strong><small>입출고·반품·폐기 포함</small></article></section>
    <section className="panel capacity-detail-panel"><div className="panel-heading"><div><p className="eyebrow">STORAGE ZONES</p><h2>보관 Zone별 상세</h2></div></div><div className="capacity-table">{mockZoneSummaries.map((zone) => <Link to={`/inventory?zone=${zone.zoneCode}`} className="capacity-row" key={zone.zoneId}><strong>{zoneCodeLabels[zone.zoneCode]}</strong><div className="capacity-row-bar"><div className={`usage-bar-fill ${zone.usageRate >= .9 ? 'danger' : zone.usageRate >= .8 ? 'warning' : ''}`} style={{ width: `${zone.usageRate * 100}%` }} /></div><span>{Math.round(zone.usageRate * 100)}%</span><small>{zone.usedCapacity} / {zone.maxCapacity}</small><ul className="quality-breakdown">{Object.entries(zone.quantityByQualityStatus).map(([status, quantity]) => <li key={status}>{qualityStatusLabels[status as keyof typeof qualityStatusLabels] ?? status} {quantity}</li>)}</ul></Link>)}</div></section>
    <section className="panel capacity-detail-panel"><div className="panel-heading"><div><p className="eyebrow">WORK AREAS</p><h2>작업 처리장 Capacity</h2></div></div><div className="capacity-work-grid">{workAreas.map((area) => { const usage = area.used / area.capacity; return <article key={area.label}><header><strong>{area.label}</strong><span>{Math.round(usage * 100)}%</span></header><div className="usage-bar"><div className={`usage-bar-fill ${usage >= .9 ? 'danger' : usage >= .8 ? 'warning' : ''}`} style={{ width: `${usage * 100}%` }} /></div><p>{area.used} / {area.capacity}</p></article> })}</div></section>
  </>
}
