import { Link } from 'react-router-dom'
import { qualityStatusLabels, zoneCodeLabels } from '../../features/inventory/model/inventorySchemas'
import { mockWarehouseName, mockZoneSummaries } from './warehouseMockData'

// BFF 계약이 정해지면 이 값들은 dashboard summary API 응답으로 교체한다.
const pendingWork = [
  { label: '입고 대기', count: 12, description: '검수 전 입고 건', to: '/inbounds?status=WAITING', tone: 'brown' },
  { label: '출고 피킹', count: 8, description: '피킹이 필요한 요청', to: '/outbounds?status=PICKING', tone: 'blue' },
  { label: '임박 재고', count: 5, description: '7일 이내 유통기한', to: '/quality?status=EXPIRING', tone: 'orange' },
  { label: '폐기 처리 대기', count: 3, description: '확정 전 폐기 대상', to: '/disposals?status=PENDING', tone: 'red' },
]

const alerts = [
  { title: '유통기한 임박 재고', detail: '원두 블렌드 외 4개 품목 · 7일 이내', tone: 'warning', to: '/quality?status=EXPIRING' },
  { title: '용량 주의 Zone', detail: 'C Zone 사용률 91% · 잔여 41칸', tone: 'danger', to: '/inventory?zone=C' },
  { title: '반품 검수 대기', detail: '오늘 도착한 반품 2건', tone: 'neutral', to: '/returns?status=WAITING' },
]

const recentActivities = [
  { time: '10:24', text: 'A-02 Location에 원두 24개 적재 완료', actor: '김도윤' },
  { time: '09:58', text: '출고 요청 #OUT-240922 검수 완료', actor: '김도윤' },
  { time: '09:41', text: '반품 #RET-240921 검수 대기 등록', actor: '시스템' },
]

function formatToday() {
  return new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
}

export function DashboardPage() {
  const zones = mockZoneSummaries

  return (
    <>
      <header className="page-header dashboard-header">
        <div>
          <p>WAREHOUSE OPERATIONS</p>
          <h1>{mockWarehouseName}</h1>
          <div className="dashboard-header-meta"><time>{formatToday()}</time><span>오늘 처리해야 할 업무를 확인하세요.</span></div>
        </div>
        <div className="dashboard-refresh"><span>마지막 갱신 10:32</span><button type="button" className="button secondary">새로고침</button></div>
      </header>

      <section className="work-grid" aria-label="업무 대기 현황">
        {pendingWork.map((item) => <Link className={`work-card ${item.tone}`} to={item.to} key={item.label}><span>{item.label}</span><strong>{item.count}</strong><small>{item.description}</small><em>바로가기 ›</em></Link>)}
      </section>

      <section className="panel dashboard-panel">
        <div className="panel-heading"><div><p className="eyebrow">STOCK OVERVIEW</p><h2>Zone별 재고 현황</h2></div><div className="panel-links"><Link to="/inventory" className="text-link">재고 상세 ›</Link><Link to="/warehouse-map" className="text-link">평면도 보기 ›</Link></div></div>
        <div className="zone-grid dashboard-zone-grid">{zones.map((zone) => {
          const usageRate = Math.round(zone.usageRate * 100)
          const remaining = zone.maxCapacity - zone.usedCapacity
          const usageTone = zone.usageRate >= .9 ? 'danger' : zone.usageRate >= .8 ? 'warning' : ''
          return <Link className="zone-card" to={`/inventory?zone=${zone.zoneCode}`} key={zone.zoneId}>
            <header><strong>{zoneCodeLabels[zone.zoneCode]}</strong><span className={usageTone}>{usageRate}%</span></header>
            <div className="usage-bar"><div className={`usage-bar-fill ${usageTone}`} style={{ width: `${Math.min(usageRate, 100)}%` }} /></div>
            <div className="zone-card-metrics">
              <div className="zone-stock"><strong>{zone.usedCapacity}</strong><span>/ {zone.maxCapacity}</span><small>현재 재고 / 전체 용량</small></div>
              <div className="zone-remaining"><small>잔여</small><strong>{remaining}</strong><small>사용 가능</small></div>
            </div>
            <ul className="quality-breakdown">{Object.entries(zone.quantityByQualityStatus).map(([status, quantity]) => <li className={`quality-${status.toLowerCase()}`} key={status}><span>{qualityStatusLabels[status as keyof typeof qualityStatusLabels] ?? status}</span><b>{quantity}</b></li>)}</ul>
          </Link>
        })}</div>
      </section>

      <div className="dashboard-columns">
        <section className="panel dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">ALERTS</p><h2>확인이 필요한 알림</h2></div><Link to="/quality" className="text-link">전체 보기 ›</Link></div><div className="alert-list">{alerts.map((alert) => <Link className={`alert-item ${alert.tone}`} to={alert.to} key={alert.title}><span className="alert-dot" /><div><strong>{alert.title}</strong><p>{alert.detail}</p></div><span className="chevron">›</span></Link>)}</div></section>
        <section className="panel dashboard-panel"><div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>최근 처리 이력</h2></div><Link to="/inventory/history" className="text-link">이력 보기 ›</Link></div><div className="activity-list">{recentActivities.map((activity) => <div className="activity-item" key={`${activity.time}-${activity.text}`}><time>{activity.time}</time><div><p>{activity.text}</p><small>{activity.actor}</small></div></div>)}</div></section>
      </div>
    </>
  )
}
