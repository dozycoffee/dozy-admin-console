import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useEffectiveOptions } from './useCatalog'
import { useClearOptionOverride, useLinkOptionGroup, useReorderOptionGroups, useSetOptionOverride, useUnlinkOptionGroup } from './useProductOptionMutations'

afterEach(() => vi.restoreAllMocks())

const product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'ACTIVE', categoryId: 5, description: null, imageUrl: null, basePrice: 4500, tracksInventory: false,
  tagIds: [], groupIds: [], storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [{ optionGroupId: 7, overrides: [] }], version: 5,
}
const headers = { headers: { 'If-Match': '"4"' } }

function setup() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: PropsWithChildren) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return { wrapper, invalidate, queryClient }
}

describe('연결·해제·순서', () => {
  it('연결은 옵션 그룹 id를 본문으로, 상품 버전을 If-Match로 보낸다', async () => {
    const post = vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useLinkOptionGroup(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 9 }))

    expect(post).toHaveBeenCalledWith('/api/v1/admin/products/12/option-groups', { optionGroupId: 9 }, headers)
  })

  it('해제는 DELETE로 버전을 보낸다', async () => {
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useUnlinkOptionGroup(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 7 }))

    expect(del).toHaveBeenCalledWith('/api/v1/admin/products/12/option-groups/7', headers)
  })

  it('순서 변경은 연결된 옵션 그룹 id 전체를 새 순서로 보낸다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useReorderOptionGroups(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupIds: [8, 7, 9] }))

    expect(put).toHaveBeenCalledWith('/api/v1/admin/products/12/option-groups/order', { optionGroupIds: [8, 7, 9] }, headers)
  })
})

describe('옵션 예외', () => {
  it('가격 예외는 type과 price를, 제외는 type만 보낸다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useSetOptionOverride(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'LARGE', override: { type: 'PRICE', price: 700 } }))
    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'XLARGE', override: { type: 'EXCLUDE' } }))

    expect(put).toHaveBeenNthCalledWith(1, '/api/v1/admin/products/12/option-groups/7/overrides/LARGE', { type: 'PRICE', price: 700 }, headers)
    expect(put).toHaveBeenNthCalledWith(2, '/api/v1/admin/products/12/option-groups/7/overrides/XLARGE', { type: 'EXCLUDE' }, headers)
  })

  it('옵션 키는 경로에 쓰기 전에 인코딩한다', async () => {
    const put = vi.spyOn(catalogHttpClient, 'put').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useSetOptionOverride(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'A/B 1', override: { type: 'EXCLUDE' } }))

    expect(put.mock.calls[0][0]).toBe('/api/v1/admin/products/12/option-groups/7/overrides/A%2FB%201')
  })

  it('예외 해제는 DELETE로 버전을 보낸다', async () => {
    const del = vi.spyOn(catalogHttpClient, 'delete').mockResolvedValue({ data: product })
    const { wrapper } = setup()
    const { result } = renderHook(() => useClearOptionOverride(), { wrapper })

    await act(() => result.current.mutateAsync({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'LARGE' }))

    expect(del).toHaveBeenCalledWith('/api/v1/admin/products/12/option-groups/7/overrides/LARGE', headers)
  })
})

describe('연속 변경 보호', () => {
  it('상품 목록을 다시 받는 것까지 끝나야 mutation이 끝나므로 그동안 버튼을 막을 수 있다', async () => {
    vi.spyOn(catalogHttpClient, 'post').mockResolvedValue({ data: product })
    const { wrapper, queryClient } = setup()
    let finishRefetch: () => void = () => {}
    vi.spyOn(queryClient, 'invalidateQueries').mockReturnValue(new Promise<void>((resolve) => { finishRefetch = resolve }))
    const { result } = renderHook(() => useLinkOptionGroup(), { wrapper })

    act(() => { result.current.mutate({ productId: 12, version: 4, optionGroupId: 9 }) })
    await waitFor(() => expect(catalogHttpClient.post).toHaveBeenCalled())
    // 요청은 끝났지만 재조회가 끝나지 않았으므로 아직 처리 중이다
    expect(result.current.isPending).toBe(true)

    await act(async () => { finishRefetch() })
    await waitFor(() => expect(result.current.isPending).toBe(false))
  })

  it('실패해도 상품 목록을 다시 받아 버전 충돌 때 최신 내용을 보게 한다', async () => {
    vi.spyOn(catalogHttpClient, 'put').mockRejectedValue(new Error('conflict'))
    const { wrapper, invalidate } = setup()
    const { result } = renderHook(() => useReorderOptionGroups(), { wrapper })

    await act(async () => { await result.current.mutateAsync({ productId: 12, version: 1, optionGroupIds: [7] }).catch(() => {}) })

    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['catalog', 'products'] })
  })
})

describe('useEffectiveOptions', () => {
  const effective = {
    productId: 12, basePrice: 4500, displayStartingPrice: 4500,
    groups: [{ optionGroupId: 7, name: '사이즈', selectionType: 'SINGLE', required: true, autoSelectedOptionKey: null, options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0, priceOverridden: false }, { optionKey: 'LARGE', name: '라지', price: 700, priceOverridden: true }] }],
  }

  it('유효 옵션 구성을 받아 zod로 검증한다', async () => {
    const get = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: effective })
    const { result } = renderHook(() => useEffectiveOptions(12), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(get).toHaveBeenCalledWith('/api/v1/admin/products/12/effective-options')
    expect(result.current.data?.groups[0].options[1].priceOverridden).toBe(true)
  })

  it('enabled가 false면 요청하지 않는다', () => {
    const get = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: effective })
    renderHook(() => useEffectiveOptions(12, false), { wrapper: createQueryClientWrapper() })

    expect(get).not.toHaveBeenCalled()
  })
})
