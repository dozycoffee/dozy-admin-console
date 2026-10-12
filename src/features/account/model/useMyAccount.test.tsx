import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useChangePassword, useMyAccount } from './useMyAccount'

const me = { principalType: 'employee', principalId: 'p-1', name: '김도윤', email: 'kim@dozycoffee.com', roles: ['wms:warehouse_manager'] }

afterEach(() => vi.restoreAllMocks())

describe('useMyAccount', () => {
  it('내 정보를 조회하고 응답을 zod로 검증한다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: me })

    const { result } = renderHook(() => useMyAccount(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/realms/internal/me')
    expect(result.current.data?.email).toBe('kim@dozycoffee.com')
  })
})

describe('useChangePassword', () => {
  it('현재 비밀번호와 새 비밀번호를 본문으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useChangePassword(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ currentPassword: 'old-password-1', newPassword: 'new-password-1' })

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/password/change', { currentPassword: 'old-password-1', newPassword: 'new-password-1' })
  })
})
