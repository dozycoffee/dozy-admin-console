import { disposalStatusLabels, type DisposalStatus } from '../model/disposalSchemas'

// 작업 큐와 이력 페이지가 같은 뱃지를 쓴다. 색은 입고 상태 뱃지 스타일(.inbound-*)을 재사용한다.
const toneByStatus: Record<DisposalStatus, string> = { REQUESTED: 'inbound-expected', APPROVED: 'inbound-processing', COMPLETED: 'inbound-completed' }

export function DisposalStatusBadge({ status }: { status: DisposalStatus }) {
  return <span className={`inbound-status ${toneByStatus[status]}`}>{disposalStatusLabels[status]}</span>
}
