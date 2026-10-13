import { describe, expect, it } from 'vitest'
import { localInputToIso, MAX_RANGE_DAYS, periodPresets, presetFrom, validatePeriod, isoToLocalInput } from './auditPeriod'

const now = new Date('2026-10-12T12:00:00Z')
const DAY = 24 * 60 * 60 * 1000

describe('presetFrom', () => {
  it('지금에서 기간만큼 뺀 시각을 ISO로 돌려준다', () => {
    expect(presetFrom('24h', now)).toBe('2026-10-11T12:00:00.000Z')
    expect(presetFrom('7d', now)).toBe('2026-10-05T12:00:00.000Z')
    expect(presetFrom('30d', now)).toBe('2026-09-12T12:00:00.000Z')
  })

  it('서버 시각 차이로 상한에 걸리지 않도록 빠른 선택은 90일 미만이다', () => {
    for (const preset of periodPresets) expect(preset.ms).toBeLessThan(MAX_RANGE_DAYS * DAY)
  })
})

describe('localInputToIso', () => {
  it('비었거나 올바르지 않은 값은 undefined다', () => {
    expect(localInputToIso('')).toBeUndefined()
    expect(localInputToIso('not-a-date')).toBeUndefined()
  })

  it('datetime-local 값을 ISO(UTC)로 바꾼다', () => {
    expect(localInputToIso('2026-10-12T09:30')).toBe(new Date('2026-10-12T09:30').toISOString())
  })
})

describe('validatePeriod', () => {
  it('시작이 종료보다 앞이 아니면 안내한다', () => {
    expect(validatePeriod('2026-10-12T00:00:00Z', '2026-10-11T00:00:00Z', now)).toBe('시작은 종료보다 앞이어야 합니다.')
    expect(validatePeriod('2026-10-12T00:00:00Z', '2026-10-12T00:00:00Z', now)).not.toBeNull()
  })

  it('90일을 넘는 기간은 안내하고 90일은 허용한다', () => {
    expect(validatePeriod('2026-07-01T00:00:00Z', '2026-10-12T00:00:00Z', now)).toBe('조회 기간은 90일 이하여야 합니다.')
    expect(validatePeriod('2026-07-14T12:00:00Z', '2026-10-12T12:00:00Z', now)).toBeNull()
  })

  it('종료가 없으면 지금까지를 기준으로 상한을 검사한다', () => {
    expect(validatePeriod('2026-06-01T00:00:00Z', undefined, now)).not.toBeNull()
    expect(validatePeriod('2026-10-01T00:00:00Z', undefined, now)).toBeNull()
  })

  it('종료만 있거나 둘 다 없으면 문제없다(서버가 기본 기간을 정한다)', () => {
    expect(validatePeriod(undefined, '2026-10-12T00:00:00Z', now)).toBeNull()
    expect(validatePeriod(undefined, undefined, now)).toBeNull()
  })

describe('isoToLocalInput', () => {
  it('ISO 시각을 datetime-local 입력값(로컬 시간, 분 단위)으로 바꾸고 다시 같은 시각으로 읽힌다', () => {
    const iso = '2026-10-12T03:04:05.000Z'

    const input = isoToLocalInput(iso)

    expect(input).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(new Date(input).getTime()).toBe(new Date('2026-10-12T03:04:00.000Z').getTime())
  })
})
})
