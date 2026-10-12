import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useAcceptInvitation, useInvitation, useRequestPasswordReset, useResetPassword } from './useAccountRecovery'

afterEach(() => vi.restoreAllMocks())

describe('useInvitation', () => {
  it('토큰이 없으면 조회하지 않는다', () => {
    const postSpy = vi.spyOn(authHttpClient, 'post')

    renderHook(() => useInvitation(''), { wrapper: createQueryClientWrapper() })

    expect(postSpy).not.toHaveBeenCalled()
  })

  it('토큰을 본문으로 보내 초대를 조회하고 응답을 zod로 검증한다', async () => {
    const info = { name: '김도윤', maskedEmail: 'ki***@dozycoffee.com', maskedPhone: null, expiresAt: '2026-09-27T05:00:00Z' }
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: info })

    const { result } = renderHook(() => useInvitation('tok'), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(postSpy).toHaveBeenCalledWith('/realms/internal/invitations/verify', { token: 'tok' })
    expect(result.current.data?.maskedEmail).toBe('ki***@dozycoffee.com')
  })
})

describe('계정 복구 mutation', () => {
  it('초대 수락은 토큰과 비밀번호를 본문으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useAcceptInvitation(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ token: 'tok', password: 'new-password-1' })

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/invitations/accept', { token: 'tok', password: 'new-password-1' })
  })

  it('비밀번호 찾기는 이메일을 본문으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useRequestPasswordReset(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('kim@dozycoffee.com')

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/password/forgot', { email: 'kim@dozycoffee.com' })
  })

  it('비밀번호 재설정은 토큰과 새 비밀번호를 본문으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useResetPassword(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ token: 'tok', newPassword: 'new-password-1' })

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/password/reset', { token: 'tok', newPassword: 'new-password-1' })
  })
})
