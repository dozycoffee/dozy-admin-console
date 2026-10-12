import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { expiredLinkMessage, isVerificationExpired, toAccountErrorMessage } from './accountErrors'

describe('isVerificationExpired', () => {
  it('VERIFICATION_EXPIRED code만 만료로 본다', () => {
    expect(isVerificationExpired(new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' }))).toBe(true)
    expect(isVerificationExpired(new ApiError('x', { status: 400, code: 'VALIDATION_FAILED' }))).toBe(false)
    expect(isVerificationExpired(new Error('x'))).toBe(false)
  })
})

describe('toAccountErrorMessage', () => {
  it('만료된 링크는 다시 요청하라고 안내한다', () => {
    expect(toAccountErrorMessage(new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' }))).toBe(expiredLinkMessage)
  })

  it('비밀번호 정책 위반과 요청 제한을 안내한다', () => {
    expect(toAccountErrorMessage(new ApiError('x', { status: 400, code: 'VALIDATION_FAILED' }))).toMatch(/규칙에 맞지 않습니다/)
    expect(toAccountErrorMessage(new ApiError('x', { status: 429, code: 'TOO_MANY_ATTEMPTS' }))).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('현재 비밀번호 불일치와 계정 상태 오류를 안내한다', () => {
    expect(toAccountErrorMessage(new ApiError('x', { status: 400, code: 'CURRENT_PASSWORD_MISMATCH' }))).toBe('현재 비밀번호가 올바르지 않습니다.')
    expect(toAccountErrorMessage(new ApiError('x', { status: 409, code: 'INVALID_STATE' }))).toBe('현재 계정 상태에서는 변경할 수 없습니다.')
  })

  it('모르는 code는 일반 문구로 바꾸고 서버 문구를 노출하지 않는다', () => {
    expect(toAccountErrorMessage(new ApiError('SQL ...', { status: 500, code: 'INTERNAL_ERROR' }))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('서버에 연결하지 못한 에러는 네트워크 문구를 그대로 쓴다', () => {
    expect(toAccountErrorMessage(new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', { status: null }))).toBe('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  })
})
