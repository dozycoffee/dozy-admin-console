import { ApiError } from '../../../shared/api/ApiError'

// dozy-auth 관리 API(`/admin/**`)의 에러 안내. dozy-auth는 문구가 아니라 code로만 분기하도록 하므로 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  DUPLICATE_EMAIL: '이미 사용 중인 이메일입니다.',
  FORBIDDEN: '이 작업을 할 권한이 없습니다.',
  PROTECTED_ACCOUNT: 'owner·admin 계정은 admin이 변경할 수 없습니다.',
  NOT_FOUND: '대상을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
  INVALID_STATE: '현재 계정 상태에서는 할 수 없는 작업입니다.',
  SELF_GRANT_NOT_ALLOWED: '자기 자신에게는 role을 부여할 수 없습니다.',
  CLIENT_ID_DUPLICATED: '이미 사용 중인 clientId입니다.',
  ROLE_CODE_DUPLICATED: '같은 서비스에 이미 있는 role code입니다.',
  AUDIENCE_CODE_DUPLICATED: '이미 있는 서비스 code입니다.',
  ROLE_IN_USE: '이 role이 부여된 직원이 있어 삭제할 수 없습니다.',
  VALIDATION_FAILED: '입력값을 확인해 주세요.',
  TOO_MANY_ATTEMPTS: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
}

export function toAdminErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
