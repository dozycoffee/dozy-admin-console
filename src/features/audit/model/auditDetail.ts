/** 감사 로그 detail(dozy-auth AUD-08)을 사람이 읽기 쉬운 항목으로 바꾼다. 아는 키·값은 한글로, 모르는 것은 있는 그대로 보여준다. */
export type DetailRow = { key: string; label: string; values: string[] }

const keyLabels: Record<string, string> = {
  roles: 'role',
  revokedSessions: '폐기한 세션 수',
  realm: 'realm',
  sessionId: '세션 id',
  reason: '사유',
  via: '경로',
  fields: '수정한 항목',
  clientId: 'clientId',
}

const valueLabels: Record<string, Record<string, string>> = {
  reason: {
    LOGOUT: '로그아웃',
    REUSE_DETECTED: '토큰 재사용 탐지',
    INVALID_CREDENTIALS: '이메일·비밀번호 불일치',
    EMAIL_NOT_VERIFIED: '이메일 미인증',
    ACCOUNT_SUSPENDED: '정지된 계정',
  },
  via: { invitation_cancelled: '초대 취소' },
  fields: { name: '이름', phone: '전화번호', address: '주소' },
}

function formatValue(key: string, value: unknown): string {
  const text = typeof value === 'string' ? value : typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value)
  const known = valueLabels[key]?.[text]
  return known ? `${known} (${text})` : text
}

export function describeDetail(detail: Record<string, unknown> | null | undefined): DetailRow[] {
  if (!detail) return []
  return Object.entries(detail).map(([key, value]) => ({
    key,
    label: keyLabels[key] ?? key,
    values: (Array.isArray(value) ? value : [value]).map((item) => formatValue(key, item)),
  }))
}
