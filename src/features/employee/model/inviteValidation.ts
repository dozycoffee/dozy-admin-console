const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type InviteField = 'email' | 'name'
export type InviteFieldErrors = Partial<Record<InviteField, string>>

/** 직원 추가 1단계 입력의 오류 문구(문제가 없는 필드는 빠진다). UX용 검사이며 최종 판단은 서버가 한다. */
export function validateInvite({ email, name }: { email: string; name: string }): InviteFieldErrors {
  const errors: InviteFieldErrors = {}
  if (email.trim() === '') errors.email = '이메일을 입력하세요.'
  else if (!emailPattern.test(email.trim())) errors.email = '올바른 이메일 형식으로 입력하세요. (예: name@dozycoffee.com)'
  if (name.trim() === '') errors.name = '이름을 입력하세요.'
  return errors
}
