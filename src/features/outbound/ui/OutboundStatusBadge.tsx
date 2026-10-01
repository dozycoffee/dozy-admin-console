import { outboundStatusLabels, type OutboundStatus } from '../model/outboundSchemas'

// 작업 큐와 이력 페이지가 같은 뱃지를 쓴다. 색은 입고 상태 뱃지 스타일(.inbound-*)을 재사용한다.
const toneByStatus: Record<OutboundStatus, string> = { REQUESTED: 'inbound-expected', PICKING: 'inbound-waiting', INSPECTING: 'inbound-processing', COMPLETED: 'inbound-completed' }

export function OutboundStatusBadge({ status }: { status: OutboundStatus }) {
  return <span className={`inbound-status ${toneByStatus[status]}`}>{outboundStatusLabels[status]}</span>
}
