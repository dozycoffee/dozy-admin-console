import { stockAuditStatusLabels, type StockAuditStatus } from '../model/stockAuditSchemas'

// 색은 입고 상태 뱃지 스타일(.inbound-*)을 재사용한다.
const toneByStatus: Record<StockAuditStatus, string> = { SCHEDULED: 'inbound-expected', IN_PROGRESS: 'inbound-processing', COMPLETED: 'inbound-waiting', CLOSED: 'inbound-completed' }

export function StockAuditStatusBadge({ status }: { status: StockAuditStatus }) {
  return <span className={`inbound-status ${toneByStatus[status]}`}>{stockAuditStatusLabels[status]}</span>
}
