import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useRoles } from './useRoles'

afterEach(() => vi.restoreAllMocks())

describe('useRoles', () => {
  it('role 목록을 조회해 items만 반환한다', async () => {
    const role = { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 3 }
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: { items: [role] } })

    const { result } = renderHook(() => useRoles(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/admin/roles')
    expect(result.current.data).toEqual([role])
  })
})
