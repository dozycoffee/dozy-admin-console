import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import {
  useDeactivateSystemClient, useGrantClientRole, useRegisterSystemClient, useRevokeClientRole, useRotateClientSecret, useSystemClients,
} from './useSystemClients'

const client = { principalId: 'p-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: [], secretRotatedAt: null, createdAt: '2026-09-24T05:00:00Z' }

afterEach(() => vi.restoreAllMocks())

describe('useSystemClients', () => {
  it('목록을 조회해 items만 반환한다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: { items: [client] } })

    const { result } = renderHook(() => useSystemClients(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/system-clients')
    expect(result.current.data).toEqual([client])
  })
})

describe('system client mutation', () => {
  it('등록은 POST /admin/system-clients로 보내고 secret이 든 응답을 돌려준다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { principalId: 'p-1', clientId: 'svc-store', clientSecret: 'Zr8qL2mX' } })
    const { result } = renderHook(() => useRegisterSystemClient(), { wrapper: createQueryClientWrapper() })

    const created = await result.current.mutateAsync({ clientId: 'svc-store', name: 'Store 서비스', roles: ['auth:partner_reader'] })

    expect(postSpy).toHaveBeenCalledWith('/admin/system-clients', { clientId: 'svc-store', name: 'Store 서비스', roles: ['auth:partner_reader'] })
    expect(created.clientSecret).toBe('Zr8qL2mX')
  })

  it('재발급은 POST .../secret으로 보내고 새 secret을 돌려준다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { clientSecret: 'Qw4nV7pK' } })
    const { result } = renderHook(() => useRotateClientSecret(), { wrapper: createQueryClientWrapper() })

    const rotated = await result.current.mutateAsync('p-1')

    expect(postSpy).toHaveBeenCalledWith('/admin/system-clients/p-1/secret')
    expect(rotated.clientSecret).toBe('Qw4nV7pK')
  })

  it('secret이 든 결과는 mutation 캐시에 남기지 않는다', async () => {
    vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { clientSecret: 'Qw4nV7pK' } })
    const queryClient = new QueryClient()
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result, unmount } = renderHook(() => useRotateClientSecret(), { wrapper })

    await result.current.mutateAsync('p-1')
    unmount()

    await waitFor(() => expect(queryClient.getMutationCache().getAll()).toHaveLength(0))
  })

  it('role 부여는 계정 API에 role 하나를 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useGrantClientRole(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ principalId: 'p-1', role: 'auth:partner_reader' })

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/roles', { roles: ['auth:partner_reader'] })
  })

  it('role 회수는 DELETE .../roles/{role}로 보낸다', async () => {
    const deleteSpy = vi.spyOn(authHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useRevokeClientRole(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ principalId: 'p-1', role: 'auth:partner_reader' })

    expect(deleteSpy).toHaveBeenCalledWith('/admin/principals/p-1/roles/auth:partner_reader')
  })

  it('폐기는 사유를 담아 POST .../deactivate로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useDeactivateSystemClient(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ principalId: 'p-1', reason: '서비스 종료' })

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/deactivate', { reason: '서비스 종료' })
  })

  it('성공하면 system client 목록과 role 쿼리를 갱신한다', async () => {
    vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const queryClient = new QueryClient()
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
    const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    const { result } = renderHook(() => useDeactivateSystemClient(), { wrapper })

    await result.current.mutateAsync({ principalId: 'p-1', reason: '서비스 종료' })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['system-clients'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['roles'] })
  })
})
