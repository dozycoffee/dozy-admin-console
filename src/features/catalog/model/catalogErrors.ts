import { ApiError } from '../../../shared/api/ApiError'

// dozy-catalog-api의 오류는 RFC 9457 Problem Details이며 `detail`을 화면에 그대로 보여주지 않는다(API 명세). code로만 분기하고 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  UNAUTHENTICATED: '로그인이 만료되었습니다. 다시 로그인해 주세요.',
  FORBIDDEN: '이 작업을 할 권한이 없습니다.',
  INVALID_REQUEST: '입력값을 확인해 주세요.',
  PRODUCT_NOT_FOUND: '상품을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  CATEGORY_NOT_FOUND: '카테고리를 찾을 수 없습니다.',
  PRODUCT_GROUP_NOT_FOUND: '상품 그룹을 찾을 수 없습니다.',
  OPTION_GROUP_NOT_FOUND: '옵션 그룹을 찾을 수 없습니다.',
  VERSION_REQUIRED: '최신 정보를 불러온 뒤 다시 시도해 주세요.',
  VERSION_CONFLICT: '다른 사용자가 먼저 수정했습니다. 최신 내용을 불러온 뒤 다시 시도해 주세요.',
}

export function toCatalogErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
