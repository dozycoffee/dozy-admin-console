const DAY_MS = 24 * 60 * 60 * 1000

/** 감사 로그 한 번 조회 기간 상한(dozy-auth `policy.audit-query-max-range`) */
export const MAX_RANGE_DAYS = 90

/** 빠른 선택. 시작만 보내면 서버가 "지금까지"로 본다. 서버 시각이 조금 뒤라 상한(90일)에 걸리지 않도록 90일은 넣지 않는다. */
export const periodPresets = [
  { id: '24h', label: '최근 24시간', ms: DAY_MS },
  { id: '7d', label: '최근 7일', ms: 7 * DAY_MS },
  { id: '30d', label: '최근 30일', ms: 30 * DAY_MS },
] as const
export type PeriodPresetId = (typeof periodPresets)[number]['id']

export function presetFrom(id: PeriodPresetId, now: Date): string {
  const preset = periodPresets.find((item) => item.id === id)!
  return new Date(now.getTime() - preset.ms).toISOString()
}

/** `datetime-local` 입력값(사용자 로컬 시간)을 ISO 8601(UTC)로 바꾼다. 비었거나 올바르지 않으면 undefined다. */
export function localInputToIso(value: string): string | undefined {
  if (value === '') return undefined
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/** 직접 입력한 기간의 문제를 안내 문구로 돌려준다(문제가 없으면 null). */
export function validatePeriod(from: string | undefined, to: string | undefined, now: Date): string | null {
  const start = from ? new Date(from).getTime() : undefined
  const end = to ? new Date(to).getTime() : undefined
  if (start !== undefined && end !== undefined && start >= end) return '시작은 종료보다 앞이어야 합니다.'
  if (start !== undefined && (end ?? now.getTime()) - start > MAX_RANGE_DAYS * DAY_MS) return `조회 기간은 ${MAX_RANGE_DAYS}일 이하여야 합니다.`
  return null
}
