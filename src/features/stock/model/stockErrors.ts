import { ApiError } from '../../../shared/api/ApiError'

// dozy-inventory-api의 오류(RFC 9457 Problem Details). 문구가 아니라 code로만 분기하고 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  INV_INVALID_INVENTORY_QUERY: '조회 조건을 확인해 주세요. 창고·상품 id는 양수여야 합니다.',
  INV_INVENTORY_NOT_FOUND: '재고 행을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  INV_WAREHOUSE_ACCESS_DENIED: '접근 권한이 없는 창고입니다.',
  VALIDATION_FAILED: '조회 조건을 확인해 주세요.',
}

export function toStockErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    if (error.status === 403) return messages[error.code ?? ''] ?? '이 정보를 볼 권한이 없습니다.'
    return (error.code && messages[error.code]) || '재고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '재고 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
