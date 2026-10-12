// dozy-auth 비밀번호 정책(PWD-01): 길이는 유니코드 코드 포인트 수(이모지도 한 글자)로 세고 앞뒤 공백을 제거하지 않는다.
// 문자 조합은 강제하지 않는다(PWD-02). 이메일과 같은 비밀번호 거부(PWD-03)는 서버가 검사한다.
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 128

export function passwordLength(password: string): number {
  return Array.from(password).length
}

/** 새 비밀번호와 확인 입력의 문제를 안내 문구로 돌려준다(문제가 없으면 null). */
export function validateNewPassword(password: string, confirm: string): string | null {
  const length = passwordLength(password)
  if (length < PASSWORD_MIN_LENGTH || length > PASSWORD_MAX_LENGTH) return `비밀번호는 ${PASSWORD_MIN_LENGTH}자 이상 ${PASSWORD_MAX_LENGTH}자 이하여야 합니다.`
  if (password !== confirm) return '비밀번호 확인이 일치하지 않습니다.'
  return null
}
