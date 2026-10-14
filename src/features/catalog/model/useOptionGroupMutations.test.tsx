import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useOptionGroups } from './useCatalog'
import { useCreateOptionGroup, useDeleteOptionGroup, useReplaceOptions, useUpdateOptionGroup } from './useOptionGroupMutations'

afterEach(() => vi.restoreAllMocks())

const group = { id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }], version: 2 }
const options = [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 700 }]

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate }
}

describe('useOptionGroups', () => {
  it('조건 없이 전체를 받고 이름 검색어는 다듬어 keyword로 보낸다', async () => {
    const get = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: [group] })
    const all = renderHook(() => useOptionGroups(), { wrapper: createQueryClientWrapper() })
    const searched = renderHook(() => useOptionGroups('  사이 '), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(all.result.current.isSuccess && searched.result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/api/v1/admin/option-groups', { params: undefined })
    expect(get).toHaveBeenCalledWith('/api/v1/admin/option-groups', { params: { keyword: '사이' } })
  })
})

describe('useCreateOptionGroup', () => {
  it('옵션과 함께 등록하고 옵션 그룹 목록을 갱신한다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: group })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useCreateOptionGroup(), { wrapper })
    const body = { name: '사이즈', selectionType: 'SINGLE' as const, required: true, options }

    await act(() => result.current.mutateAsync(body))

    expect(post).toHaveBeenCalledWith('/api/v1/admin/option-groups', body)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'option-groups'] })
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })
})

describe('useUpdateOptionGroup', () => {
  it('화면이 보던 버전을 If-Match에 따옴표로 감싸 보낸다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { ...group, version: 3 } })
    const { wrapper } = setup()
    const { result } = renderHook(() => useUpdateOptionGroup(), { wrapper })
    const body = { name: '사이즈 옵션', selectionType: 'MULTI' as const, required: false }

    await act(() => result.current.mutateAsync({ id: 7, version: 2, body }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/option-groups/7', body, { headers: { 'If-Match': '"2"' } })
  })

  it('실패해도 목록을 다시 받아 버전 충돌 때 최신 내용을 보게 한다', async () => {
    vi.spyOn(catalogHttpClient, 'put').mockRejectedValue(new Error('conflict'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useUpdateOptionGroup(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ id: 7, version: 1, body: { name: 'x', selectionType: 'SINGLE', required: true } }).catch(() => {}) })

    await waitFor(() => expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'option-groups'] }))
  })
})

describe('useReplaceOptions', () => {
  it('옵션 목록 전체를 보내고 사라진 옵션의 예외가 지워지므로 상품 목록도 갱신한다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: { ...group, options, version: 3 } })
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useReplaceOptions(), { wrapper })

    await act(() => result.current.mutateAsync({ id: 7, version: 2, options }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/option-groups/7/options', { options }, { headers: { 'If-Match': '"2"' } })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'option-groups'] })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })
})

describe('useDeleteOptionGroup', () => {
  it('버전 없이 DELETE한다', async () => {
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: undefined })
    const { wrapper } = setup()
    const { result } = renderHook(() => useDeleteOptionGroup(), { wrapper })

    await act(() => result.current.mutateAsync(7))

    expect(del).toHaveBeenCalledWith('/api/v1/admin/option-groups/7')
  })
})
