import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { auditActionCategory, auditActionLabel } from '../../features/audit/model/auditSchemas'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { STALE_SECRET_DAYS } from '../../features/dashboard/model/dashboardRules'
import { useAccountDashboard } from '../../features/dashboard/model/useAccountDashboard'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { TaskCard } from './TaskCard'

const timeFormat = new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit' })
const dateFormat = new Intl.DateTimeFormat('ko-KR', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })

function Stat({ label, value, to, tone }: { label: string; value: number; to: string; tone?: 'muted' }) {
  return <Link to={to} className={`dash-stat ${tone ?? ''}`}><strong>{value}</strong><span>{label}</span></Link>
}

/** 계정 관리 콘솔의 대시보드: 관리자가 처리해야 할 일과 현황, 최근 활동을 dozy-auth 데이터로 보여준다. */
export function AccountDashboard() {
  const { can } = useAuth()
  const isOwner = can(permissions.accountManage)
  const queryClient = useQueryClient()
  const [now, setNow] = useState(() => new Date())
  const { tasks, stats, recent } = useAccountDashboard({ now, canViewAudit: isOwner })

  function refresh() {
    setNow(new Date())
    for (const key of ['employees', 'system-clients', 'roles', 'audit-logs']) queryClient.invalidateQueries({ queryKey: [key] })
  }

  return <>
    <header className="page-header dashboard-header">
      <div>
        <p>ACCOUNT ADMINISTRATION</p>
        <h1>대시보드</h1>
        <div className="dashboard-header-meta"><time dateTime={now.toISOString()}>{dateFormat.format(now)}</time><span>처리가 필요한 일을 확인하세요.</span></div>
      </div>
      <div className="dashboard-refresh"><span>기준 {timeFormat.format(now)}</span><button type="button" className="button secondary" onClick={refresh}>새로고침</button></div>
    </header>

    <section className="task-grid" aria-label="처리가 필요한 일">
      <TaskCard
        title="초대가 만료된 직원"
        description="초대 메일의 링크가 만료되어 아직 가입하지 못한 직원입니다. 초대를 재발송하세요."
        state={tasks.expiredInvitations} tone="warning" moreTo="/employees?status=PENDING"
        partialLabel="초대 대기 직원 중 일부"
        itemKey={(item) => item.principalId}
        renderItem={(item) => <><strong>{item.name}</strong><small>{item.email} · {item.overdueDays === 0 ? '오늘 만료' : `만료 ${item.overdueDays}일 경과`}</small></>}
      />
      <TaskCard
        title="정지된 직원"
        description="계정이 정지되어 로그인할 수 없는 직원입니다. 정지 사유가 해소됐는지 확인하세요."
        state={tasks.suspended} tone="info" moreTo="/employees?status=SUSPENDED"
        itemKey={(item) => item.principalId}
        renderItem={(item) => <><strong>{item.name}</strong><small>{item.email}</small></>}
      />
      <TaskCard
        title="secret이 오래된 시스템 클라이언트"
        description={`secret을 발급한 지 ${STALE_SECRET_DAYS}일이 지난 클라이언트입니다. 재발급을 권장합니다.`}
        state={tasks.staleSecrets} tone="warning" moreTo="/system-clients"
        itemKey={(item) => item.client.principalId}
        renderItem={(item) => <><strong>{item.client.name}</strong><small>{item.client.clientId} · {item.client.secretRotatedAt ? `secret ${item.ageDays}일 경과` : `발급 기록 없음 · 등록 ${item.ageDays}일 경과`}</small></>}
      />
      {tasks.loginAlerts && <TaskCard
        title="로그인 실패·잠금 (24시간)"
        description="최근 24시간 동안 로그인에 실패했거나 계정이 잠긴 기록입니다. 짧은 시간에 반복되면 확인하세요."
        state={tasks.loginAlerts} tone="danger" moreTo="/audit-logs"
        itemKey={(item) => String(item.id)}
        renderItem={(item) => <><strong>{auditActionLabel(item.action)}</strong><small>{formatDateTime(item.occurredAt)}{item.ip ? ` · ${item.ip}` : ''}</small></>}
      />}
    </section>

    <section className="panel dashboard-panel dash-stats-panel" aria-label="현황 요약">
      <div className="panel-heading"><div><p className="eyebrow">OVERVIEW</p><h2>현황 요약</h2></div></div>
      <div className="dash-stat-groups">
        <div className="dash-stat-group">
          <h3>직원</h3>
          {stats.employees.status === 'loading' && <p className="task-status">불러오는 중입니다...</p>}
          {stats.employees.status === 'error' && <p className="inbound-error" role="alert">{toAdminErrorMessage(stats.employees.error)}</p>}
          {stats.employees.status === 'ready' && <div className="dash-stat-row">
            <Stat label="활성" value={stats.employees.active} to="/employees?status=ACTIVE" />
            <Stat label="초대 대기" value={stats.employees.pending} to="/employees?status=PENDING" />
            <Stat label="정지" value={stats.employees.suspended} to="/employees?status=SUSPENDED" />
            <Stat label="비활성화" value={stats.employees.deactivated} to="/employees?status=DEACTIVATED" tone="muted" />
          </div>}
        </div>
        <div className="dash-stat-group">
          <h3>시스템 클라이언트</h3>
          {stats.clients.status === 'loading' && <p className="task-status">불러오는 중입니다...</p>}
          {stats.clients.status === 'error' && <p className="inbound-error" role="alert">{toAdminErrorMessage(stats.clients.error)}</p>}
          {stats.clients.status === 'ready' && <div className="dash-stat-row">
            <Stat label="활성" value={stats.clients.active} to="/system-clients" />
            <Stat label="정지" value={stats.clients.suspended} to="/system-clients" />
          </div>}
        </div>
        <div className="dash-stat-group">
          <h3>role</h3>
          {stats.roles.status === 'loading' && <p className="task-status">불러오는 중입니다...</p>}
          {stats.roles.status === 'error' && <p className="inbound-error" role="alert">{toAdminErrorMessage(stats.roles.error)}</p>}
          {stats.roles.status === 'ready' && <div className="dash-stat-row">
            <Stat label="전체" value={stats.roles.total} to="/roles" />
            <Stat label="부여된 직원 없음" value={stats.roles.unused} to="/roles" tone="muted" />
          </div>}
        </div>
      </div>
    </section>

    {recent && <section className="panel dashboard-panel" aria-label="최근 활동">
      <div className="panel-heading"><div><p className="eyebrow">RECENT ACTIVITY</p><h2>최근 활동</h2></div><Link to="/audit-logs" className="text-link">감사 로그 보기 ›</Link></div>
      {recent.status === 'loading' && <p className="task-status">불러오는 중입니다...</p>}
      {recent.status === 'error' && <p className="inbound-error" role="alert">{toAdminErrorMessage(recent.error)}</p>}
      {recent.status === 'ready' && recent.items.length === 0 && <p className="task-empty">최근 기록이 없습니다.</p>}
      {recent.status === 'ready' && recent.items.length > 0 && <ul className="dash-recent">
        {recent.items.map((log) => {
          const category = auditActionCategory(log.action)
          return <li key={log.id}>
            <time dateTime={log.occurredAt}>{formatDateTime(log.occurredAt)}</time>
            {category && <span className={`audit-category audit-cat-${category.id}`}>{category.label}</span>}
            <strong>{auditActionLabel(log.action)}</strong>
          </li>
        })}
      </ul>}
    </section>}
  </>
}
