import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { useCountProducts } from './useCatalog'
import {
  useCreateCategory, useCreateProductGroup, useDeleteCategory, useDeleteProductGroup, useDeleteTag, useMoveCategory, useRenameCategory, useRenameProductGroup, useRenameTag,
} from './useTaxonomyMutations'

afterEach(() => vi.restoreAllMocks())

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}
const category = { id: 5, name: '커피', parentId: 1 }

describe('카테고리', () => {
  it('등록은 대분류면 parentId를 null로, 소분류면 대분류 id로 보낸다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: category })
    const { wrapper } = setup()
    const { result } = renderHook(() => useCreateCategory(), { wrapper })

    await act(() => result.current.mutateAsync({ name: '음료', parentId: null }))
    await act(() => result.current.mutateAsync({ name: '커피', parentId: 1 }))

    expect(post).toHaveBeenNthCalledWith(1, '/api/v1/admin/categories', { name: '음료', parentId: null })
    expect(post).toHaveBeenNthCalledWith(2, '/api/v1/admin/categories', { name: '커피', parentId: 1 })
  })

  it('이름 변경은 PUT으로 이름만 보낸다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: category })
    const { wrapper } = setup()
    const { result } = renderHook(() => useRenameCategory(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 5, name: '커피' }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/categories/5', { name: '커피' })
  })

  it('승격은 parentId를 null로 명시해서 보낸다(필드를 빼면 서버가 거부한다)', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { ...category, parentId: null } })
    const { wrapper } = setup()
    const { result } = renderHook(() => useMoveCategory(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 5, parentId: null }))

    const body = put.mock.calls[0][1] as Record<string, unknown>
    expect(put).toHaveBeenCalledWith('/api/v1/admin/categories/5/parent', { parentId: null })
    expect('parentId' in body).toBe(true)
  })

  it('이동은 새 대분류 id를 보내고 카테고리 목록만 갱신한다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { ...category, parentId: 2 } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useMoveCategory(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 5, parentId: 2 }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/categories/5/parent', { parentId: 2 })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'categories'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })

  it('삭제는 DELETE하고 실패해도 목록을 다시 받는다', async () => {
    vi.spyOn(catalogHttpClient, 'delete').mockRejectedValue(new Error('referenced'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useDeleteCategory(), { wrapper })

    await act(async () => { await result.current.mutateAsync(5).catch(() => {}) })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'categories'] })
  })
})

describe('태그', () => {
  it('이름을 바꾼다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { id: 3, name: '베스트' } })
    const { wrapper } = setup()
    const { result } = renderHook(() => useRenameTag(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 3, name: '베스트' }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/tags/3', { name: '베스트' })
  })

  it('삭제하면 참조하던 상품에서 빠지므로 상품 목록도 갱신한다', async () => {
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useDeleteTag(), { wrapper })

    await act(() => result.current.mutateAsync(3))

    expect(del).toHaveBeenCalledWith('/api/v1/admin/tags/3')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'tags'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })
})

describe('상품 그룹', () => {
  it('등록·이름 변경·삭제를 호출하고 삭제는 상품 목록도 갱신한다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: { id: 2, name: '여름 시즌' } })
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { id: 2, name: '겨울 시즌' } })
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { wrapper, invalidate } = setup()
    const create = renderHook(() => useCreateProductGroup(), { wrapper })
    const rename = renderHook(() => useRenameProductGroup(), { wrapper })
    const remove = renderHook(() => useDeleteProductGroup(), { wrapper })

    await act(() => create.result.current.mutateAsync('여름 시즌'))
    await act(() => rename.result.current.mutateAsync({ id: 2, name: '겨울 시즌' }))
    await act(() => remove.result.current.mutateAsync(2))

    expect(post).toHaveBeenCalledWith('/api/v1/admin/product-groups', { name: '여름 시즌' })
    expect(put).toHaveBeenCalledWith('/api/v1/admin/product-groups/2', { name: '겨울 시즌' })
    expect(del).toHaveBeenCalledWith('/api/v1/admin/product-groups/2')
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })
})

describe('useCountProducts', () => {
  it('조건으로 상품을 한 건만 조회하고 전체 개수를 돌려준다', async () => {
    const get = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: { content: [], page: 0, size: 1, totalElements: 7, totalPages: 7 } })
    const { wrapper } = setup()
    const { result } = renderHook(() => useCountProducts(), { wrapper })

    await expect(result.current({ tagId: 3 })).resolves.toBe(7)

    expect(get).toHaveBeenCalledWith('/api/v1/admin/products', { params: { tagId: 3, page: 0, size: 1 } })
  })
})
