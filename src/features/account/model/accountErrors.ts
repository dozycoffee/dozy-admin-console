import { ApiError } from '../../../shared/api/ApiError'

/** 만료·사용·무효화된 1회용 링크(VER-04). dozy-auth는 어느 경우인지 구분해 주지 않는다. */
export function isVerificationExpired(error: unknown): boolean {
  return error instanceof ApiError && error.code === 'VERIFICATION_EXPIRED'
}

export const expiredLinkMessage = '링크가 만료되었거나 이미 사용되었습니다. 관리자에게 다시 요청해 주세요.'

// dozy-auth는 문구가 아니라 code로만 분기하도록 하므로 안내 문구는 콘솔이 정한다.
const messages: Record<string, string> = {
  VALIDATION_FAILED: '비밀번호가 규칙에 맞지 않습니다. 8~128자여야 하고 이메일과 같을 수 없습니다.',
  TOO_MANY_ATTEMPTS: '요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.',
  CURRENT_PASSWORD_MISMATCH: '현재 비밀번호가 올바르지 않습니다.',
  INVALID_STATE: '현재 계정 상태에서는 변경할 수 없습니다.',
}

export function toAccountErrorMessage(error: unknown): string {
  if (isVerificationExpired(error)) return expiredLinkMessage
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    return (error.code && messages[error.code]) || '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
  }
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.'
}
