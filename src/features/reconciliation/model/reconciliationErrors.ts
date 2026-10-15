import { ApiError } from '../../../shared/api/ApiError'

// dozy-inventory-api의 오류(RFC 9457 Problem Details). 문구가 아니라 code로만 분기하고 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  INV_RECONCILIATION_CHANGED: '승인하는 사이 수량이 바뀌어 보정안을 새 값으로 갱신했습니다. 바뀐 수량을 확인한 뒤 다시 승인해 주세요. 불일치가 사라졌다면 보정안은 거절 처리됩니다.',
  INV_RECONCILIATION_ADMIN_REQUIRED: '변동량이 임계치를 넘어 상위 승인자(admin)만 승인할 수 있습니다.',
  INV_INVALID_ADJUSTMENT_STATE: '이미 처리된 보정안입니다. 목록을 새로고침해 주세요.',
  INV_ADJUSTMENT_NOT_FOUND: '보정안을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  INV_INSUFFICIENT_AVAILABLE_QUANTITY: '예약된 수량 때문에 가용 수량이 모자라 감소를 반영할 수 없습니다. 예약이 풀린 뒤 다시 승인해 주세요.',
  INV_WMS_UNAVAILABLE: 'WMS에서 현재 수량을 가져오지 못했습니다. 잠시 후 다시 시도해 주세요.',
  INV_WAREHOUSE_ACCESS_DENIED: '접근 권한이 없는 창고입니다.',
  INV_INVALID_RECONCILIATION_QUERY: '조회 조건을 확인해 주세요. 창고 id는 양수여야 합니다.',
  VALIDATION_FAILED: '조회 조건을 확인해 주세요.',
}

export function toReconciliationErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    if (error.status === 403) return messages[error.code ?? ''] ?? '이 작업을 할 권한이 없습니다.'
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
