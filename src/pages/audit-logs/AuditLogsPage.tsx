import { useState } from 'react'
import { auditActionCategory, auditActionLabel, type AuditLog } from '../../features/audit/model/auditSchemas'
import { toAuditErrorMessage, useAuditLogs } from '../../features/audit/model/useAuditLogs'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { AuditDetailModal } from './AuditDetailModal'
import { AuditFilters, type AppliedFilters } from './AuditFilters'
import { AuditId } from './AuditId'

const PAGE_SIZE = 20
const noFilters: AppliedFilters = { actions: [] }

/** action을 분류 칩(색으로 구분)과 한글 이름으로 보여준다. 색만으로 구분하지 않도록 분류 이름을 글자로도 적고, 서버 코드는 상세에서 본다. */
function ActionCell({ action }: { action: string }) {
  const category = auditActionCategory(action)
  return <>
    {category && <span className={`audit-category audit-cat-${category.id}`}>{category.label}</span>}
    <strong>{auditActionLabel(action)}</strong>
  </>
}

/** owner 전용 감사 로그 조회. 읽기 전용이며 최신순이다. */
export function AuditLogsPage() {
  const [filters, setFilters] = useState<AppliedFilters>(noFilters)
  const [page, setPage] = useState(1)
  // 상세 모달에 보여줄 기록. 닫아도 비우지 않아 사라지는 애니메이션 동안 내용이 유지된다.
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const query = useAuditLogs({ ...filters, page: page - 1, size: PAGE_SIZE })
  const logs = query.data?.items ?? []
  const total = query.data?.page.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.page.totalPages ?? 1)

  return <>
    <header className="page-header inbound-page-header">
      <div><p>ACCOUNT ADMINISTRATION</p><h1>감사 로그</h1></div>
    </header>
    <p className="employee-hint role-intro">인증 서비스의 로그인·계정·role·owner 양도 작업 기록입니다. 개인정보는 담지 않고 계정은 id로만 표시합니다. 한 번에 최대 90일까지 조회할 수 있습니다.</p>
    <AuditFilters onApply={(applied) => { setFilters(applied); setPage(1) }} />
    <section className="panel audit-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">AUDIT LOGS</p><h2>기록</h2></div><small>{total}건</small></div>
      {query.isLoading && <p>감사 로그를 불러오는 중입니다...</p>}
      {query.isError && <p className="inbound-error" role="alert">{toAuditErrorMessage(query.error)}</p>}
      {query.data && logs.length === 0 && <p className="inbound-empty">조건에 맞는 기록이 없습니다.</p>}
      {logs.length > 0 && <div className="audit-table-wrap">
        <table className="audit-table">
          <thead><tr><th>시각</th><th>action</th><th>행위자</th><th>대상</th><th>IP</th><th>상세</th></tr></thead>
          <tbody>
            {logs.map((log) => <tr key={log.id}>
              <td>{formatDateTime(log.occurredAt)}</td>
              <td><ActionCell action={log.action} /></td>
              <td><AuditId type={log.actorType} id={log.actorId} /></td>
              <td><AuditId type={log.targetType} id={log.targetId} /></td>
              <td>{log.ip ?? <span className="audit-none">-</span>}</td>
              <td><button type="button" className="audit-view" aria-label={`${auditActionLabel(log.action)} 상세 보기`} onClick={() => { setSelected(log); setDetailOpen(true) }}>보기</button></td>
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
    <AuditDetailModal log={selected} open={detailOpen} onClose={() => setDetailOpen(false)} />
  </>
}
