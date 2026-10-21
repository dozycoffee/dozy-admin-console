import { describe, expect, it } from 'vitest'
import { ZodError } from 'zod'
import { ApiError } from '../../../shared/api/ApiError'
import { RESPONSE_SHAPE_MESSAGE } from '../../../shared/api/displayMessage'
import { toStockAuditErrorMessage } from './stockAuditErrors'

describe('toStockAuditErrorMessage', () => {
  it('임계치 초과로 승인자가 필요하다는 409는 admin 확정을 안내한다', () => {
    expect(toStockAuditErrorMessage(new ApiError('x', { status: 409, code: 'STOCK_AUDIT_APPROVAL_REQUIRED' }))).toContain('admin')
  })

  it.each([
    ['STOCK_AUDIT_ITEMS_NOT_FULLY_COUNTED', '모든 항목'],
    ['STOCK_AUDIT_INVENTORY_CALLS_PENDING', '다시 시도'],
    ['STOCK_AUDIT_INVENTORY_REJECTED', '예약'],
    ['STOCK_AUDIT_INVENTORY_UNAVAILABLE', '잠시 후'],
  ])('%s는 콘솔이 정한 문구로 안내한다', (code, expected) => {
    expect(toStockAuditErrorMessage(new ApiError('서버 문구', { status: 409, code }))).toContain(expected)
  })

  it('모르는 code는 서버가 준 메시지를 그대로 쓴다', () => {
    expect(toStockAuditErrorMessage(new ApiError('서버 문구', { status: 500, code: 'UNKNOWN' }))).toBe('서버 문구')
  })

  it('응답 검증 오류는 JSON 대신 안내 문구를 쓴다', () => {
    expect(toStockAuditErrorMessage(new ZodError([]))).toBe(RESPONSE_SHAPE_MESSAGE)
  })
})
