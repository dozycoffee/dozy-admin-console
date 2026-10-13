import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toAdminErrorMessage } from './adminErrors'

describe('toAdminErrorMessage', () => {
  it.each([
    ['DUPLICATE_EMAIL', 409, '이미 사용 중인 이메일입니다.'],
    ['PROTECTED_ACCOUNT', 403, 'owner·admin 계정은 admin이 변경할 수 없습니다.'],
    ['INVALID_STATE', 409, '현재 계정 상태에서는 할 수 없는 작업입니다.'],
    ['NOT_FOUND', 404, '대상을 찾을 수 없습니다. 목록을 새로고침해 주세요.'],
    ['SELF_GRANT_NOT_ALLOWED', 403, '자기 자신에게는 role을 부여할 수 없습니다.'],
    ['CLIENT_ID_DUPLICATED', 409, '이미 사용 중인 clientId입니다.'],
    ['ROLE_CODE_DUPLICATED', 409, '같은 서비스에 이미 있는 role code입니다.'],
    ['AUDIENCE_CODE_DUPLICATED', 409, '이미 있는 서비스 code입니다.'],
    ['ROLE_IN_USE', 409, '이 role이 부여된 직원이 있어 삭제할 수 없습니다.'],
  ])('code %s는 콘솔이 정한 문구로 바꾼다', (code, status, message) => {
    expect(toAdminErrorMessage(new ApiError('서버 문구', { status, code }))).toBe(message)
  })

  it('모르는 code는 일반 안내 문구로 바꾸고 서버 문구를 노출하지 않는다', () => {
    expect(toAdminErrorMessage(new ApiError('SQL error ...', { status: 500, code: 'INTERNAL_ERROR' }))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('서버에 연결하지 못한 에러는 네트워크 문구를 그대로 쓴다', () => {
    expect(toAdminErrorMessage(new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', { status: null }))).toBe('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  })

  it('ApiError가 아니면 일반 안내 문구를 쓴다', () => {
    expect(toAdminErrorMessage(new Error('boom'))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })
})
