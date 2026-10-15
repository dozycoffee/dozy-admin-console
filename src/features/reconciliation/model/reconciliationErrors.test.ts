import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toReconciliationErrorMessage } from './reconciliationErrors'

describe('toReconciliationErrorMessage', () => {
  it('승인 중 수량이 바뀐 409는 새 값을 확인하고 다시 승인하라고 안내한다', () => {
    const message = toReconciliationErrorMessage(new ApiError('changed', { status: 409, code: 'INV_RECONCILIATION_CHANGED' }))
    expect(message).toContain('다시 승인')
  })

  it('가용 수량 부족은 예약 때문임을 안내한다', () => {
    expect(toReconciliationErrorMessage(new ApiError('x', { status: 409, code: 'INV_INSUFFICIENT_AVAILABLE_QUANTITY' }))).toContain('예약')
  })

  it('WMS 조회 실패(502)는 잠시 후 다시 시도하라고 안내한다', () => {
    expect(toReconciliationErrorMessage(new ApiError('x', { status: 502, code: 'INV_WMS_UNAVAILABLE' }))).toContain('WMS')
  })

  it('403은 상위 승인자 필요를 구분하고 나머지는 권한 없음으로 안내한다', () => {
    expect(toReconciliationErrorMessage(new ApiError('x', { status: 403, code: 'INV_RECONCILIATION_ADMIN_REQUIRED' }))).toContain('상위 승인자')
    expect(toReconciliationErrorMessage(new ApiError('x', { status: 403, code: 'OTHER' }))).toBe('이 작업을 할 권한이 없습니다.')
  })

  it('네트워크 오류는 오류 자체의 문구를, 알 수 없는 오류는 기본 문구를 쓴다', () => {
    expect(toReconciliationErrorMessage(new ApiError('서버에 연결할 수 없습니다.', { status: null }))).toBe('서버에 연결할 수 없습니다.')
    expect(toReconciliationErrorMessage(new ApiError('x', { status: 500, code: 'WHATEVER' }))).toContain('다시 시도')
    expect(toReconciliationErrorMessage(new Error('x'))).toContain('다시 시도')
  })
})
