import { auditActionCategory, auditActionLabel, type AuditLog } from '../../features/audit/model/auditSchemas'
import { describeDetail } from '../../features/audit/model/auditDetail'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { Modal } from '../../shared/ui/Modal'
import { useCopyText } from '../../shared/ui/useCopyText'

/** 행위자·대상 한 줄. 종류와 전체 id를 보여주고 복사할 수 있다. 시스템 작업처럼 값이 없으면 "-"다. */
function PartyValue({ type, id }: { type?: string | null; id?: string | null }) {
  const copy = useCopyText()
  if (!id && !type) return <span className="audit-none">-</span>
  return <>
    {type && <b className="audit-party-type">{type}</b>}
    {id && <>
      <code className="audit-mono">{id}</code>
      <button type="button" className="audit-copy" aria-label={`${type ? `${type} ` : ''}id 복사`} onClick={() => copy(id, 'id를 복사했습니다.')}>복사</button>
    </>}
  </>
}

type Props = {
  /** 마지막으로 선택한 기록. 닫힌 뒤에도 사라지는 애니메이션 동안 내용을 유지하려고 `open`과 따로 받는다. */
  log: AuditLog | null
  open: boolean
  onClose: () => void
}

/** 감사 로그 한 건의 전체 내용. 목록에서 줄인 값(전체 id, action 코드)과 detail을 항목별로 보여주고 원본 JSON도 볼 수 있다. */
export function AuditDetailModal({ log, open, onClose }: Props) {
  const copy = useCopyText()
  if (!log) return null
  const category = auditActionCategory(log.action)
  const rows = describeDetail(log.detail)
  const rawJson = log.detail ? JSON.stringify(log.detail, null, 2) : null
  return (
    <Modal open={open} title="기록 상세" className="audit-modal" onClose={onClose}>
      <dl className="audit-rows">
        <div><dt>시각</dt><dd><time dateTime={log.occurredAt}>{formatDateTime(log.occurredAt)}</time></dd></div>
        <div><dt>action</dt><dd>
          <strong>{auditActionLabel(log.action)}</strong>
          {category && <span className={`audit-category audit-cat-${category.id}`}>{category.label}</span>}
          <code className="audit-mono">{log.action}</code>
        </dd></div>
        <div><dt>행위자</dt><dd><PartyValue type={log.actorType} id={log.actorId} /></dd></div>
        <div><dt>대상</dt><dd><PartyValue type={log.targetType} id={log.targetId} /></dd></div>
        <div><dt>IP</dt><dd>{log.ip ?? <span className="audit-none">-</span>}</dd></div>
      </dl>
      <h3 className="audit-section-title">추가 정보</h3>
      {rows.length === 0
        ? <p className="audit-empty">이 기록에는 추가 정보가 없습니다.</p>
        : <dl className="audit-rows">
          {rows.map((row) => <div key={row.key}><dt>{row.label}</dt><dd>{row.values.map((value) => <span key={value} className="audit-value">{value}</span>)}</dd></div>)}
        </dl>}
      {rawJson && <details className="audit-raw">
        <summary>원본 JSON 보기</summary>
        <pre>{rawJson}</pre>
        <button type="button" className="audit-copy" onClick={() => copy(rawJson, '원본 JSON을 복사했습니다.')}>JSON 복사</button>
      </details>}
    </Modal>
  )
}
