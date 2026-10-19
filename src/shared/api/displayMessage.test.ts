import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'
import { ApiError } from './ApiError'
import { RESPONSE_SHAPE_MESSAGE, toDisplayMessage } from './displayMessage'

afterEach(() => vi.restoreAllMocks())

describe('toDisplayMessage', () => {
  it('서버 응답 검증 오류(ZodError)는 JSON 대신 안내 문구로 바꾸고 원인을 콘솔에 남긴다', () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    const failure = z.object({ status: z.enum(['A', 'B']) }).safeParse({ status: 'C' }).error

    expect(toDisplayMessage(failure)).toBe(RESPONSE_SHAPE_MESSAGE)
    expect(toDisplayMessage(failure)).not.toContain('invalid_value')
    expect(consoleError).toHaveBeenCalled()
  })

  it('일반 오류와 API 오류는 메시지를 그대로 쓴다', () => {
    expect(toDisplayMessage(new Error('실패했습니다.'))).toBe('실패했습니다.')
    expect(toDisplayMessage(new ApiError('이미 처리된 건입니다.', { status: 409, code: 'CONFLICT' }))).toBe('이미 처리된 건입니다.')
  })

  it('오류 객체가 아니면 기본 문구를 쓴다', () => {
    expect(toDisplayMessage('문자열')).toBe('알 수 없는 오류가 발생했습니다.')
    expect(toDisplayMessage(undefined, '불러오지 못했습니다.')).toBe('불러오지 못했습니다.')
  })
})
