import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { useActivateProduct, useCreateProduct, useDeleteProduct, useDiscontinueProduct, useUpdateProduct } from './useProductMutations'

afterEach(() => vi.restoreAllMocks())

const product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'DRAFT', categoryId: 5, description: null, imageUrl: null, basePrice: 4500, tracksInventory: false,
  tagIds: [], groupIds: [], storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [], version: 1,
}
const input = { name: '아이스 아메리카노', categoryId: 5, basePrice: 4500, description: null, imageUrl: null, tagNames: ['베스트'], groupIds: [] }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

describe('useCreateProduct', () => {
  it('상품을 등록하고 응답을 zod로 검증하며 상품·태그 목록을 갱신한다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: product })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useCreateProduct(), { wrapper })
    const body = { ...input, tracksInventory: false, optionGroupIds: [7] }

    await act(() => result.current.mutateAsync(body))

    expect(post).toHaveBeenCalledWith('/api/v1/admin/products', body)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'tags'] })
  })
})

describe('useUpdateProduct', () => {
  it('화면이 보던 버전을 If-Match 헤더에 따옴표로 감싸 보낸다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { ...product, version: 5 } })
    const { wrapper } = setup()
    const { result } = renderHook(() => useUpdateProduct(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, body: input }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/products/12', input, { headers: { 'If-Match': '"4"' } })
  })

  it('실패해도 상품 목록을 다시 받아 버전 충돌 때 최신 내용을 보게 한다', async () => {
    vi.spyOn(catalogHttpClient, 'put').mockRejectedValue(new Error('conflict'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useUpdateProduct(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ productId: 12, version: 3, body: input }).catch(() => {}) })

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] }))
  })
})

describe('상태 전환과 삭제', () => {
  it('활성화·단종은 본문과 버전 없이 POST한다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: { ...product, status: 'ACTIVE' } })
    const { wrapper } = setup()
    const activate = renderHook(() => useActivateProduct(), { wrapper })
    const discontinue = renderHook(() => useDiscontinueProduct(), { wrapper })

    await act(() => activate.result.current.mutateAsync(12))
    await act(() => discontinue.result.current.mutateAsync(12))

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/products/12/activate')
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/products/12/discontinue')
  })

  it('삭제는 DELETE하고 태그 목록은 건드리지 않는다', async () => {
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useDeleteProduct(), { wrapper })

    await act(() => result.current.mutateAsync(12))

    expect(del).toHaveBeenCalledWith('/api/v1/admin/products/12')
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['catalog', 'tags'] })
  })
})
