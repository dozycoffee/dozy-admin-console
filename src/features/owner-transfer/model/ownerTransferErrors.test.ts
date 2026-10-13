import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toOwnerTransferErrorMessage } from './ownerTransferErrors'

const error = (status: number, code: string) => new ApiError('서버 문구', { status, code })

describe('toOwnerTransferErrorMessage', () => {
  it('요청 단계: INVALID_STATE는 진행 중인 양도나 대상 상태 문제로 안내한다', () => {
    expect(toOwnerTransferErrorMessage(error(409, 'INVALID_STATE'), 'request')).toMatch(/이미 진행 중인 양도가 있거나/)
    expect(toOwnerTransferErrorMessage(error(404, 'NOT_FOUND'), 'request')).toMatch(/대상 직원을 찾을 수 없습니다/)
    expect(toOwnerTransferErrorMessage(error(403, 'FORBIDDEN'), 'request')).toMatch(/현재 owner만 양도를 요청/)
  })

  it('취소 단계: NOT_FOUND는 진행 중인 양도가 없다는 뜻이다', () => {
    expect(toOwnerTransferErrorMessage(error(404, 'NOT_FOUND'), 'cancel')).toMatch(/진행 중인 양도가 없습니다/)
    expect(toOwnerTransferErrorMessage(error(403, 'FORBIDDEN'), 'cancel')).toMatch(/현재 owner만 양도를 취소/)
  })

  it('수락 단계: FORBIDDEN은 대상 계정이 아니라는 뜻이고 VERIFICATION_EXPIRED는 링크 문제다', () => {
    expect(toOwnerTransferErrorMessage(error(403, 'FORBIDDEN'), 'accept')).toMatch(/본인 계정으로 로그인/)
    expect(toOwnerTransferErrorMessage(error(410, 'VERIFICATION_EXPIRED'), 'accept')).toMatch(/만료되었거나 이미 사용·취소/)
  })

  it('단계에 없는 code는 관리 API 공통 안내를 쓰고 서버 문구를 노출하지 않는다', () => {
    expect(toOwnerTransferErrorMessage(error(429, 'TOO_MANY_ATTEMPTS'), 'request')).toBe('요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.')
    expect(toOwnerTransferErrorMessage(error(500, 'INTERNAL_ERROR'), 'accept')).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('서버에 연결하지 못한 에러는 네트워크 문구를 그대로 쓴다', () => {
    expect(toOwnerTransferErrorMessage(new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', { status: null }), 'request')).toBe('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  })
})
