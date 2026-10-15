import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { toMaterialQueryParams, useAllMaterials, useChangeMaterialStatus, useMaterials, useRegisterMaterial } from './useMaterials'

afterEach(() => vi.restoreAllMocks())

const material = (id: number) => ({ productId: id, productCode: `P-${id}`, productName: `원자재 ${id}`, category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE', shelfLifeDays: null })

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

describe('toMaterialQueryParams', () => {
  it('비어 있는 조건은 빼고 페이지만 담는다', () => {
    expect(toMaterialQueryParams({ code: '', category: '', status: '', page: 0, size: 20 })).toEqual({ page: 0, size: 20 })
  })

  it('입력한 조건을 담는다', () => {
    expect(toMaterialQueryParams({ code: 'BEAN-1', category: 'BEAN', status: 'ACTIVE', page: 2, size: 20 }))
      .toEqual({ code: 'BEAN-1', category: 'BEAN', status: 'ACTIVE', page: 2, size: 20 })
  })
})

describe('useMaterials', () => {
  it('상품 목록 API를 조건과 함께 호출하고 응답을 zod로 검증한다', async () => {
    const get = vi.spyOn(inventoryHttpClient, 'get').mockResolvedValue({ data: { items: [material(1)], page: 0, size: 20, totalElements: 1 } })
    const { wrapper } = setup()

    const { result } = renderHook(() => useMaterials({ category: 'BEAN', page: 0, size: 20 }), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/api/v1/products', { params: { category: 'BEAN', page: 0, size: 20 } })
    expect(result.current.data?.items[0].productName).toBe('원자재 1')
  })
})

describe('useAllMaterials', () => {
  it('원자재가 한 페이지를 넘으면 전체 건수만큼 이어서 읽는다', async () => {
    const get = vi.spyOn(inventoryHttpClient, 'get').mockImplementation(async (_url, config) => {
      const page = ((config?.params ?? { page: 0 }) as { page: number }).page
      return { data: { items: page === 0 ? Array.from({ length: 100 }, (_, i) => material(i + 1)) : [material(101)], page, size: 100, totalElements: 101 } }
    })
    const { wrapper } = setup()

    const { result } = renderHook(() => useAllMaterials(), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toHaveLength(101)
    expect(get).toHaveBeenCalledTimes(2)
  })
})

describe('useRegisterMaterial', () => {
  it('원자재를 등록하고 응답을 검증하며 원자재 목록을 갱신한다', async () => {
    const post = vi.spyOn(inventoryHttpClient, 'post').mockResolvedValue({ data: material(7) })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useRegisterMaterial(), { wrapper })
    const body = { productCode: 'P-7', productName: '원자재 7', category: 'BEAN', unit: 'KG', shelfLifeDays: null }

    await act(() => result.current.mutateAsync(body))

    expect(post).toHaveBeenCalledWith('/api/v1/products', body)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['materials'] })
  })
})

describe('useChangeMaterialStatus', () => {
  it('상태를 바꾸고 원자재 목록을 갱신한다', async () => {
    const patch = vi.spyOn(inventoryHttpClient, 'patch').mockResolvedValue({ data: { ...material(7), productStatus: 'INACTIVE' } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useChangeMaterialStatus(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 7, productStatus: 'INACTIVE' }))

    expect(patch).toHaveBeenCalledWith('/api/v1/products/7/status', { productStatus: 'INACTIVE' })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['materials'] })
  })
})
