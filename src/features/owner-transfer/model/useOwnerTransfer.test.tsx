import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useAcceptOwnerTransfer, useCancelOwnerTransfer, useRequestOwnerTransfer } from './useOwnerTransfer'

afterEach(() => vi.restoreAllMocks())

describe('owner 양도 mutation', () => {
  it('요청은 대상 id를 본문으로 보내고 만료 시각을 돌려준다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { expiresAt: '2026-10-16T05:00:00Z' } })
    const { result } = renderHook(() => useRequestOwnerTransfer(), { wrapper: createQueryClientWrapper() })

    const requested = await result.current.mutateAsync('p-2')

    expect(postSpy).toHaveBeenCalledWith('/admin/owner/transfer', { targetPrincipalId: 'p-2' })
    expect(requested.expiresAt).toBe('2026-10-16T05:00:00Z')
  })

  it('취소는 DELETE /admin/owner/transfer로 보낸다', async () => {
    const deleteSpy = vi.spyOn(authHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useCancelOwnerTransfer(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync()

    expect(deleteSpy).toHaveBeenCalledWith('/admin/owner/transfer')
  })

  it('수락은 토큰을 본문으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useAcceptOwnerTransfer(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('tok')

    expect(postSpy).toHaveBeenCalledWith('/admin/owner/transfer/accept', { token: 'tok' })
  })
})
