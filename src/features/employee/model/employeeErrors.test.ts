import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toEmployeeErrorMessage } from './employeeErrors'

describe('toEmployeeErrorMessage', () => {
  it.each([
    ['DUPLICATE_EMAIL', 409, '이미 사용 중인 이메일입니다.'],
    ['PROTECTED_ACCOUNT', 403, 'owner·admin 계정은 admin이 변경할 수 없습니다.'],
    ['INVALID_STATE', 409, '현재 계정 상태에서는 할 수 없는 작업입니다.'],
    ['NOT_FOUND', 404, '대상을 찾을 수 없습니다. 목록을 새로고침해 주세요.'],
  ])('code %s는 콘솔이 정한 문구로 바꾼다', (code, status, message) => {
    expect(toEmployeeErrorMessage(new ApiError('서버 문구', { status, code }))).toBe(message)
  })

  it('모르는 code는 일반 안내 문구로 바꾸고 서버 문구를 노출하지 않는다', () => {
    expect(toEmployeeErrorMessage(new ApiError('SQL error ...', { status: 500, code: 'INTERNAL_ERROR' }))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('서버에 연결하지 못한 에러는 네트워크 문구를 그대로 쓴다', () => {
    expect(toEmployeeErrorMessage(new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', { status: null }))).toBe('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  })

  it('ApiError가 아니면 일반 안내 문구를 쓴다', () => {
    expect(toEmployeeErrorMessage(new Error('boom'))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })
})
