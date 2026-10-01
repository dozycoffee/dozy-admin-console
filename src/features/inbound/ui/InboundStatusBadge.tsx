import { inboundStatusLabels, type InboundStatus } from '../model/inboundSchemas'

// 진행 중인 작업 큐(InboundManagementPage)와 완료 이력(InboundHistoryPage)이
// 같은 뱃지를 쓴다 — 상태 하나에 표기가 두 가지면 같은 건을 다른 곳에서 다르게 읽게 된다.
export function InboundStatusBadge({ status }: { status: InboundStatus }) {
  return <span className={`inbound-status inbound-${status.toLowerCase()}`}>{inboundStatusLabels[status]}</span>
}
