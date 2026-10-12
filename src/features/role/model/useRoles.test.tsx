import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useAudiences, useCreateAudience, useCreateRole, useDeleteRole, useRoles, useUpdateRole } from './useRoles'

const role = { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 3 }

afterEach(() => vi.restoreAllMocks())

describe('useRoles', () => {
  it('role 목록을 조회해 items만 반환한다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: { items: [role] } })

    const { result } = renderHook(() => useRoles(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/roles', { params: undefined })
    expect(result.current.data).toEqual([role])
  })

  it('audience를 주면 쿼리로 보낸다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: { items: [role] } })

    const { result } = renderHook(() => useRoles('wms'), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/roles', { params: { audience: 'wms' } })
  })
})

describe('useAudiences', () => {
  it('audience 목록을 조회해 items만 반환한다', async () => {
    const audience = { id: 1, code: 'wms', name: '창고 관리', description: null }
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: { items: [audience] } })

    const { result } = renderHook(() => useAudiences(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/audiences')
    expect(result.current.data).toEqual([audience])
  })
})

describe('role·audience mutation', () => {
  it('role 등록은 POST /admin/roles로 보내고 응답을 검증한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: role })
    const { result } = renderHook(() => useCreateRole(), { wrapper: createQueryClientWrapper() })

    const created = await result.current.mutateAsync({ audience: 'wms', code: 'warehouse_manager', name: '창고 관리자' })

    expect(postSpy).toHaveBeenCalledWith('/admin/roles', { audience: 'wms', code: 'warehouse_manager', name: '창고 관리자' })
    expect(created.fullCode).toBe('wms:warehouse_manager')
  })

  it('role 수정은 PATCH /admin/roles/{id}로 보낸다', async () => {
    const patchSpy = vi.spyOn(authHttpClient, 'patch').mockResolvedValue({ data: { ...role, name: '새 이름' } })
    const { result } = renderHook(() => useUpdateRole(), { wrapper: createQueryClientWrapper() })

    const updated = await result.current.mutateAsync({ roleId: 11, body: { name: '새 이름', description: '' } })

    expect(patchSpy).toHaveBeenCalledWith('/admin/roles/11', { name: '새 이름', description: '' })
    expect(updated.name).toBe('새 이름')
  })

  it('role 삭제는 revokeAll을 쿼리로 보낸다', async () => {
    const deleteSpy = vi.spyOn(authHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { result } = renderHook(() => useDeleteRole(), { wrapper: createQueryClientWrapper() })

    await result.current.mutateAsync({ roleId: 11, revokeAll: false })
    await result.current.mutateAsync({ roleId: 11, revokeAll: true })

    expect(deleteSpy).toHaveBeenNthCalledWith(1, '/admin/roles/11', { params: { revokeAll: false } })
    expect(deleteSpy).toHaveBeenNthCalledWith(2, '/admin/roles/11', { params: { revokeAll: true } })
  })

  it('audience 추가는 POST /admin/audiences로 보낸다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: { id: 5, code: 'order', name: '주문', description: null } })
    const { result } = renderHook(() => useCreateAudience(), { wrapper: createQueryClientWrapper() })

    const created = await result.current.mutateAsync({ code: 'order', name: '주문' })

    expect(postSpy).toHaveBeenCalledWith('/admin/audiences', { code: 'order', name: '주문' })
    expect(created.id).toBe(5)
  })
})
