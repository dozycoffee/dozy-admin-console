import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { toQueryParams, useCancelInvitation, useDeactivateEmployee, useEmployee, useEmployees, useInviteEmployee, useReactivateEmployee, useResendInvitation, useSendPasswordReset, useSuspendEmployee, useUpdateEmployee } from './useEmployees'

const summary = { principalId: 'p-1', email: 'kim@dozycoffee.com', name: '김도윤', status: 'ACTIVE', roles: [], createdAt: '2026-09-24T05:00:00Z' }
const listResponse = { items: [summary], page: { number: 0, size: 10, totalElements: 1, totalPages: 1 } }

afterEach(() => vi.restoreAllMocks())

describe('toQueryParams', () => {
  it('비어 있는 필터는 쿼리에서 빼고 검색어는 앞뒤 공백을 제거한다', () => {
    expect(toQueryParams({ status: undefined, role: '', q: '  ', page: 0, size: 10 })).toEqual({ page: 0, size: 10 })
    expect(toQueryParams({ status: 'ACTIVE', role: 'wms:warehouse_manager', q: ' 김 ', page: 2, size: 10 })).toEqual({ status: 'ACTIVE', role: 'wms:warehouse_manager', q: '김', page: 2, size: 10 })
  })
})

describe('useEmployees', () => {
  it('필터와 페이지를 쿼리로 보내고 응답을 zod로 검증해 반환한다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: listResponse })

    const { result } = renderHook(() => useEmployees({ status: 'PENDING', page: 1, size: 10 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/employees', { params: { status: 'PENDING', page: 1, size: 10 } })
    expect(result.current.data?.items[0].name).toBe('김도윤')
  })
})

describe('useEmployee', () => {
  it('id가 없으면 조회하지 않는다', () => {
    const getSpy = vi.spyOn(authHttpClient, 'get')

    renderHook(() => useEmployee(undefined), { wrapper: createQueryClientWrapper() })

    expect(getSpy).not.toHaveBeenCalled()
  })

  it('직원 상세를 조회한다', async () => {
    const detail = { ...summary, phone: '010-1234-5678', address: null, lockedUntil: null, invitation: null, updatedAt: '2026-09-24T05:00:00Z' }
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: detail })

    const { result } = renderHook(() => useEmployee('p-1'), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/employees/p-1')
    expect(result.current.data?.phone).toBe('010-1234-5678')
  })
})

describe('직원 mutation', () => {
  it('초대는 POST /admin/employees로 보내고 응답을 검증한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { principalId: 'p-2', status: 'PENDING', invitationExpiresAt: '2026-09-27T05:00:00Z' } })
    const { result } = renderHook(() => useInviteEmployee(), { wrapper: createQueryClientWrapper() })

    const created = await result.current.mutateAsync({ email: 'new@dozycoffee.com', name: '신입', roles: ['wms:warehouse_manager'] })

    expect(postSpy).toHaveBeenCalledWith('/admin/employees', { email: 'new@dozycoffee.com', name: '신입', roles: ['wms:warehouse_manager'] })
    expect(created.principalId).toBe('p-2')
  })

  it('초대 재발송은 POST .../invitation으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { invitationExpiresAt: '2026-09-27T05:00:00Z' } })
    const { result } = renderHook(() => useResendInvitation(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('p-2')

    expect(postSpy).toHaveBeenCalledWith('/admin/employees/p-2/invitation')
  })

  it('초대 취소는 DELETE .../invitation으로 보낸다', async () => {
    const deleteSpy = vi.spyOn(authHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useCancelInvitation(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('p-2')

    expect(deleteSpy).toHaveBeenCalledWith('/admin/employees/p-2/invitation')
  })
})

describe('계정 상태·정보 mutation', () => {
  it('정지는 사유를 담아 POST .../suspend로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useSuspendEmployee(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ principalId: 'p-1', reason: '계정 탈취 의심' })

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/suspend', { reason: '계정 탈취 의심' })
  })

  it('정지 해제는 POST .../reactivate로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useReactivateEmployee(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('p-1')

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/reactivate')
  })

  it('비활성화는 사유를 담아 POST .../deactivate로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useDeactivateEmployee(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ principalId: 'p-1', reason: '퇴사' })

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/deactivate', { reason: '퇴사' })
  })

  it('재설정 메일 발송은 POST .../password-reset으로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useSendPasswordReset(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync('p-1')

    expect(postSpy).toHaveBeenCalledWith('/admin/principals/p-1/password-reset')
  })

  it('정보 수정은 PATCH /admin/employees/{id}로 보내고 응답을 검증한다', async () => {
    const detail = { ...summary, phone: null, address: null, lockedUntil: null, invitation: null, updatedAt: '2026-09-24T05:00:00Z', name: '김새이름' }
    const patchSpy = vi.spyOn(authHttpClient, 'patch').mockResolvedValue({ data: detail })
    const { result } = renderHook(() => useUpdateEmployee(), { wrapper: createQueryClientWrapper() })

    const updated = await result.current.mutateAsync({ principalId: 'p-1', body: { name: '김새이름', phone: null } })

    expect(patchSpy).toHaveBeenCalledWith('/admin/employees/p-1', { name: '김새이름', phone: null })
    expect(updated.name).toBe('김새이름')
  })
})
