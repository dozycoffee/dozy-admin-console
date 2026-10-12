import { returnStatusLabels, type ReturnStatus } from '../model/returnSchemas'

// 작업 큐와 이력 페이지가 같은 뱃지를 쓴다. 색은 입고 상태 뱃지 스타일(.inbound-*)을 재사용한다.
const toneByStatus: Record<ReturnStatus, string> = { RECEIVED: 'inbound-expected', INSPECTING: 'inbound-processing', COMPLETED: 'inbound-completed' }

export function ReturnStatusBadge({ status }: { status: ReturnStatus }) {
  return <span className={`inbound-status ${toneByStatus[status]}`}>{returnStatusLabels[status]}</span>
}
