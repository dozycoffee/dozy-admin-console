import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useActiveProducts } from './useActiveProducts'

const validProduct = {
  productId: 1,
  productCode: 'BEAN-001',
  productName: '에티오피아 예가체프',
  category: 'BEAN',
  unit: 'kg',
  shelfLifeDays: 365,
  productStatus: 'ACTIVE',
}

describe('useActiveProducts', () => {
  it('status=ACTIVE로 요청하고 응답을 zod로 검증해 반환한다', async () => {
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: [validProduct] })

    const { result } = renderHook(() => useActiveProducts(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(getSpy).toHaveBeenCalledWith('/api/products', { params: { status: 'ACTIVE' } })
    expect(result.current.data).toEqual([validProduct])
  })
})
