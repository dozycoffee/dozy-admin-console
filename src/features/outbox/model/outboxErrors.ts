import { ApiError } from '../../../shared/api/ApiError'

// dozy-inventory-api의 오류(RFC 9457 Problem Details). 문구가 아니라 code로만 분기하고 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  INV_INVALID_OUTBOX_STATE: '이미 발행 대기 중이거나 발행된 이벤트입니다. 목록을 새로고침해 주세요.',
  INV_OUTBOX_EVENT_NOT_FOUND: '이벤트를 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  INV_INVALID_OUTBOX_QUERY: '조회 조건을 확인해 주세요.',
}

export function toOutboxErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    if (error.status === 403) return '이 작업을 할 권한이 없습니다.'
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
