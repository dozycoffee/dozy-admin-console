import { ApiError } from '../../../shared/api/ApiError'
import { toAdminErrorMessage } from '../../auth/model/adminErrors'

export type OwnerTransferStep = 'request' | 'cancel' | 'accept'

// dozy-auth는 code로만 분기하도록 하므로 안내 문구는 콘솔이 정한다. 같은 code도 단계에 따라 뜻이 달라 단계별로 나눈다.
const messages: Record<OwnerTransferStep, Record<string, string>> = {
  request: {
    NOT_FOUND: '대상 직원을 찾을 수 없습니다. 목록을 새로고침해 주세요.',
    FORBIDDEN: '현재 owner만 양도를 요청할 수 있습니다.',
    INVALID_STATE: '이미 진행 중인 양도가 있거나, 대상이 활성 직원이 아닙니다. 진행 중인 양도가 있으면 취소한 뒤 다시 요청하세요.',
  },
  cancel: {
    NOT_FOUND: '진행 중인 양도가 없습니다. (만료된 양도는 취소할 수 없습니다.)',
    FORBIDDEN: '현재 owner만 양도를 취소할 수 있습니다.',
  },
  accept: {
    FORBIDDEN: '이 양도를 받을 계정이 아닙니다. 양도받을 직원 본인 계정으로 로그인하세요.',
    VERIFICATION_EXPIRED: '링크가 만료되었거나 이미 사용·취소되었습니다. 요청한 owner가 바뀌었거나 대상이 활성 직원이 아니게 된 경우도 같습니다. 현재 owner에게 다시 요청해 달라고 하세요.',
  },
}

export function toOwnerTransferErrorMessage(error: unknown, step: OwnerTransferStep): string {
  if (error instanceof ApiError && error.code && messages[step][error.code]) return messages[step][error.code]
  return toAdminErrorMessage(error)
}
