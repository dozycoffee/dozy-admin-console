import { useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useDisposals } from '../../features/disposal/model/useDisposals'
import { useInbounds } from '../../features/inbound/model/useInbounds'
import { zoneCodeLabels } from '../../features/inventory/model/inventorySchemas'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useOutbounds } from '../../features/outbound/model/useOutbounds'
import { useReturns } from '../../features/return-request/model/useReturns'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'

type QueryState = { isLoading: boolean; isError: boolean }
type WorkCardProps = { label: string; description: string; to: string; count: number | undefined; query: QueryState }

function WorkCard({ label, description, to, count, query }: WorkCardProps) {
  return <Link className="work-card" to={to}>
    <span>{label}</span>
    <strong>{query.isError ? '-' : query.isLoading || count === undefined ? '…' : count}</strong>
    <small>{query.isError ? '불러오지 못했습니다' : description}</small>
    <em>바로가기 ›</em>
  </Link>
}

function formatToday() {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
}

export function DashboardPage() {
  const user = useCurrentUser()
  const queryClient = useQueryClient()
  const warehouseIds = user.scope.warehouseIds
  const warehouse = useWarehouses(warehouseIds).data[0]
  const zones = useZoneInventorySummary(warehouseIds)
  const inbounds = useInbounds(warehouseIds, [], 1, 1)
  const outbounds = useOutbounds(warehouseIds, [], 1, 1)
  const disposals = useDisposals(warehouseIds, [], 1, 1)
  const returns = useReturns(warehouseIds, [], 1, 1)
  const inboundCounts = inbounds.data?.statusCounts
  const outboundCounts = outbounds.data?.statusCounts
  const disposalCounts = disposals.data?.statusCounts
  const returnCounts = returns.data?.statusCounts

  return (
    <>
      <header className="page-header dashboard-header">
        <div>
          <p>WAREHOUSE OPERATIONS</p>
          <h1>{warehouse?.warehouseName ?? '담당 창고'}</h1>
          <div className="dashboard-header-meta"><time>{formatToday()}</time><span>오늘 처리해야 할 업무를 확인하세요.</span></div>
        </div>
        <div className="dashboard-refresh"><button type="button" className="button secondary" onClick={() => void queryClient.invalidateQueries()}>새로고침</button></div>
      </header>

      <section className="work-grid" aria-label="업무 대기 현황">
        <WorkCard label="입고 대기" description="도착 전·검수 전 입고 건" to="/inbounds" count={inboundCounts && inboundCounts.EXPECTED + inboundCounts.WAITING} query={inbounds} />
        <WorkCard label="출고 요청" description="피킹 전 출고 건" to="/outbounds" count={outboundCounts?.REQUESTED} query={outbounds} />
        <WorkCard label="폐기 승인 대기" description="승인 전 폐기 요청" to="/disposals" count={disposalCounts?.REQUESTED} query={disposals} />
        <WorkCard label="반품 접수" description="검수 전 반품 건" to="/returns" count={returnCounts?.RECEIVED} query={returns} />
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading"><div><p className="eyebrow">CAPACITY</p><h2>Zone별 적재율</h2></div><div className="panel-links"><Link to="/inventory" className="text-link">Location 재고 ›</Link><Link to="/warehouse-map" className="text-link">평면도 보기 ›</Link></div></div>
        {zones.isLoading ? <p>Zone 현황을 불러오는 중입니다...</p>
          : zones.isError ? <p role="alert">Zone 현황을 불러오지 못했습니다.</p>
            : <div className="zone-grid dashboard-zone-grid">{(zones.data ?? []).map((zone) => {
              const usageRate = Math.round(zone.usageRate * 100)
              const remaining = zone.maxCapacity - zone.usedCapacity
              const usageTone = zone.usageRate >= .9 ? 'danger' : zone.usageRate >= .8 ? 'warning' : ''
              return <Link className="zone-card" to={`/inventory?zone=${zone.zoneCode}`} key={zone.zoneId}>
                <header><strong>{zoneCodeLabels[zone.zoneCode]}</strong><span className={usageTone}>{usageRate}%</span></header>
                <div className="usage-bar"><div className={`usage-bar-fill ${usageTone}`} style={{ width: `${Math.min(usageRate, 100)}%` }} /></div>
                <div className="zone-card-metrics">
                  <div className="zone-stock"><strong>{zone.usedCapacity}</strong><span>/ {zone.maxCapacity}</span><small>현재 적재 / 전체 용량</small></div>
                  <div className="zone-remaining"><small>잔여</small><strong>{remaining}</strong><small>사용 가능</small></div>
                </div>
              </Link>
            })}</div>}
      </section>
    </>
  )
}
