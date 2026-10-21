import { ApiError } from '../../../shared/api/ApiError'
import { toDisplayMessage } from '../../../shared/api/displayMessage'

// dozy-wms-api 실사 오류. 문구가 아니라 code로만 분기하고 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  STOCK_AUDIT_APPROVAL_REQUIRED: '조정 수량이 임계치를 넘어 상위 승인자(admin)만 확정할 수 있습니다. 승인자에게 확정을 요청해 주세요.',
  STOCK_AUDIT_ITEMS_NOT_FULLY_COUNTED: '모든 항목의 실사 수량을 입력해야 실사를 완료할 수 있습니다.',
  STOCK_AUDIT_INVALID_STATUS_TRANSITION: '이미 처리되었거나 지금 할 수 없는 단계입니다. 목록을 새로고침해 주세요.',
  STOCK_AUDIT_INVENTORY_CALLS_PENDING: 'inventory에 아직 반영되지 않은 호출이 있어 조정을 확정할 수 없습니다. 호출이 모두 전달된 뒤 다시 시도해 주세요.',
  STOCK_AUDIT_INVENTORY_REJECTED: 'inventory가 조정을 거부했습니다. 예약이 잡힌 수량이 있거나 등록되지 않은 Lot인지 확인해 주세요.',
  STOCK_AUDIT_INVENTORY_UNAVAILABLE: 'inventory와 통신할 수 없어 조정을 확정하지 못했습니다. 잠시 후 다시 시도해 주세요.',
  STOCK_AUDIT_ZONE_WAREHOUSE_MISMATCH: '선택한 Zone이 이 창고에 속하지 않습니다.',
  STOCK_AUDIT_NOT_FOUND: '실사를 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  STOCK_AUDIT_ITEM_NOT_FOUND: '실사 항목을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  STOCK_AUDIT_ITEM_INVALID_COUNTED_QUANTITY: '실사 수량은 0 이상의 정수여야 합니다.',
}

export function toStockAuditErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code && messages[error.code]) return messages[error.code]
  return toDisplayMessage(error)
}
