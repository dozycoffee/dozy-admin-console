import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toOutboxErrorMessage } from './outboxErrors'

describe('toOutboxErrorMessage', () => {
  it('이미 처리된 이벤트(409)와 없는 이벤트(404)는 code로 분기해 새로고침을 안내한다', () => {
    expect(toOutboxErrorMessage(new ApiError('x', { status: 409, code: 'INV_INVALID_OUTBOX_STATE' }))).toContain('이미 발행 대기 중이거나 발행된')
    expect(toOutboxErrorMessage(new ApiError('x', { status: 404, code: 'INV_OUTBOX_EVENT_NOT_FOUND' }))).toContain('새로고침')
  })

  it('403은 권한 없음, 네트워크 오류는 오류 자체의 문구를 쓴다', () => {
    expect(toOutboxErrorMessage(new ApiError('x', { status: 403 }))).toBe('이 작업을 할 권한이 없습니다.')
    expect(toOutboxErrorMessage(new ApiError('서버에 연결할 수 없습니다.', { status: null }))).toBe('서버에 연결할 수 없습니다.')
  })

  it('알 수 없는 오류는 기본 문구를 쓴다', () => {
    expect(toOutboxErrorMessage(new ApiError('x', { status: 500, code: 'WHATEVER' }))).toContain('다시 시도')
    expect(toOutboxErrorMessage(new Error('x'))).toContain('다시 시도')
  })
})
