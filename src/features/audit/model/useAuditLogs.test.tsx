import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { toAuditErrorMessage, toAuditQueryParams, useAuditLogs } from './useAuditLogs'

afterEach(() => vi.restoreAllMocks())

describe('toAuditQueryParams', () => {
  it('비어 있는 필터는 빼고 action 여러 개는 쉼표로 잇는다', () => {
    expect(toAuditQueryParams({ actions: [], page: 0, size: 20 })).toEqual({ page: 0, size: 20 })
    expect(toAuditQueryParams({
      from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z', actorId: 'a-1', targetType: 'ROLE', targetId: '11', actions: ['ROLE_GRANTED', 'ROLE_REVOKED'], page: 2, size: 20,
    })).toEqual({ from: '2026-10-01T00:00:00.000Z', to: '2026-10-02T00:00:00.000Z', actorId: 'a-1', targetType: 'ROLE', targetId: '11', action: 'ROLE_GRANTED,ROLE_REVOKED', page: 2, size: 20 })
  })
})

describe('useAuditLogs', () => {
  it('조건을 쿼리로 보내고 응답을 zod로 검증한다', async () => {
    const response = { items: [{ id: 1, occurredAt: '2026-10-12T00:00:00Z', action: 'LOGIN_SUCCEEDED' }], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } }
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: response })

    const { result } = renderHook(() => useAuditLogs({ actions: ['LOGIN_SUCCEEDED'], page: 0, size: 20 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/audit-logs', { params: { action: 'LOGIN_SUCCEEDED', page: 0, size: 20 } })
    expect(result.current.data?.items[0].action).toBe('LOGIN_SUCCEEDED')
  })
})

describe('toAuditErrorMessage', () => {
  it('VALIDATION_FAILED는 기간·id 형식 안내로 바꾼다', () => {
    expect(toAuditErrorMessage(new ApiError('x', { status: 400, code: 'VALIDATION_FAILED' }))).toMatch(/기간은 90일 이하/)
  })

  it('FORBIDDEN은 공통 안내를 쓴다', () => {
    expect(toAuditErrorMessage(new ApiError('x', { status: 403, code: 'FORBIDDEN' }))).toBe('이 작업을 할 권한이 없습니다.')
  })
})
