import { CLIENT_ID_MAX_LENGTH, isValidClientId } from './systemClientSchemas'

export type RegisterField = 'clientId' | 'name'
export type RegisterFieldErrors = Partial<Record<RegisterField, string>>

/** clientId 형식 규칙(dozy-auth CLI-01). 입력칸 옆 툴팁과 오류 문구에서 같은 문장을 쓴다. */
export const CLIENT_ID_RULE = 'clientId는 svc-로 시작하는 소문자·숫자·하이픈 형식입니다. (예: svc-store, svc-store-sync)'

/** 시스템 클라이언트 등록 입력의 오류 문구(문제가 없는 필드는 빠진다). UX용 검사이며 최종 판단은 서버가 한다. */
export function validateRegister({ clientId, name }: { clientId: string; name: string }): RegisterFieldErrors {
  const errors: RegisterFieldErrors = {}
  if (clientId.trim() === '') errors.clientId = 'clientId를 입력하세요.'
  else if (clientId.length > CLIENT_ID_MAX_LENGTH) errors.clientId = `clientId는 ${CLIENT_ID_MAX_LENGTH}자 이하로 입력하세요.`
  else if (!isValidClientId(clientId)) errors.clientId = 'svc-로 시작하는 소문자·숫자·하이픈 형식으로 입력하세요. (예: svc-store)'
  if (name.trim() === '') errors.name = '이름을 입력하세요.'
  return errors
}
