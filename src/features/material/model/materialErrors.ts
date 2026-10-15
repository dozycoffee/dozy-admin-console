import { ApiError } from '../../../shared/api/ApiError'

// dozy-inventory-api의 오류(RFC 9457 Problem Details). 문구가 아니라 code로만 분기하고 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  INV_DUPLICATE_PRODUCT_CODE: '이미 등록된 원자재 코드입니다. 다른 코드를 입력해 주세요.',
  INV_PRODUCT_NOT_FOUND: '원자재를 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  INV_INVALID_PRODUCT_CODE: '원자재 코드를 확인해 주세요.',
  INV_INVALID_PRODUCT_NAME: '이름을 확인해 주세요.',
  INV_INVALID_PRODUCT_CATEGORY: '카테고리를 확인해 주세요.',
  INV_INVALID_PRODUCT_UNIT: '단위를 확인해 주세요.',
  INV_INVALID_SHELF_LIFE_DAYS: '유통기한 일수는 0 이상이어야 합니다.',
  INV_INVALID_PAGE_REQUEST: '조회 조건을 확인해 주세요.',
  VALIDATION_FAILED: '입력값을 확인해 주세요.',
}

export function toMaterialErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    if (error.status === 403) return '이 작업을 할 권한이 없습니다.'
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
