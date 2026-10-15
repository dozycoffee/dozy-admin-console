import { describe, expect, it } from 'vitest'
import { ApiError, isTransientApiError } from './ApiError'

describe('isTransientApiError', () => {
  it('응답을 받지 못했거나(status null) 5xx이면 일시적 실패다', () => {
    expect(isTransientApiError(new ApiError('network', { status: null }))).toBe(true)
    expect(isTransientApiError(new ApiError('wms', { status: 502, code: 'INV_WMS_UNAVAILABLE' }))).toBe(true)
    expect(isTransientApiError(new ApiError('x', { status: 500 }))).toBe(true)
    expect(isTransientApiError(new ApiError('x', { status: 503 }))).toBe(true)
  })

  it('4xx 업무 오류는 읽고 조치해야 하므로 일시적 실패가 아니다', () => {
    expect(isTransientApiError(new ApiError('changed', { status: 409, code: 'INV_RECONCILIATION_CHANGED' }))).toBe(false)
    expect(isTransientApiError(new ApiError('nf', { status: 404 }))).toBe(false)
    expect(isTransientApiError(new ApiError('denied', { status: 403 }))).toBe(false)
    expect(isTransientApiError(new ApiError('bad', { status: 400 }))).toBe(false)
  })

  it('ApiError가 아니면 일시적 실패로 보지 않는다', () => {
    expect(isTransientApiError(new Error('x'))).toBe(false)
    expect(isTransientApiError(undefined)).toBe(false)
  })
})
