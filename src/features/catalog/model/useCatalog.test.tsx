import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { toProductQueryParams, useCategories, useProducts } from './useCatalog'

afterEach(() => vi.restoreAllMocks())

const product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'ACTIVE', categoryId: 5, description: null, imageUrl: null, basePrice: 4500, tracksInventory: false,
  tagIds: [3], groupIds: [2], storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [{ optionGroupId: 7, overrides: [{ optionKey: 'XLARGE', type: 'EXCLUDE', price: null }] }], version: 4,
}

describe('toProductQueryParams', () => {
  it('비어 있는 필터는 빼고 검색어는 다듬는다', () => {
    expect(toProductQueryParams({ keyword: '  ', page: 0, size: 10 })).toEqual({ page: 0, size: 10 })
    expect(toProductQueryParams({ keyword: ' 아메 ', status: 'ACTIVE', categoryId: 5, tagId: 3, groupId: 2, page: 1, size: 10 }))
      .toEqual({ keyword: '아메', status: 'ACTIVE', categoryId: 5, tagId: 3, groupId: 2, page: 1, size: 10 })
  })
})

describe('useProducts', () => {
  it('Catalog 관리 API에 조건을 보내고 응답을 zod로 검증한다', async () => {
    const response = { content: [product], page: 0, size: 10, totalElements: 1, totalPages: 1 }
    const getSpy = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: response })

    const { result } = renderHook(() => useProducts({ status: 'ACTIVE', page: 0, size: 10 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/api/v1/admin/products', { params: { status: 'ACTIVE', page: 0, size: 10 } })
    expect(result.current.data?.content[0].sku).toBe('DZ-00000012')
  })

  it('SKU가 없는 과거 상품도 받아들인다', async () => {
    vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: { content: [{ ...product, sku: null }], page: 0, size: 10, totalElements: 1, totalPages: 1 } })

    const { result } = renderHook(() => useProducts({ page: 0, size: 10 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.content[0].sku).toBeNull()
  })

  it('계약과 다른 응답은 에러로 처리한다', async () => {
    vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: { content: [{ ...product, status: 'UNKNOWN' }], page: 0, size: 10, totalElements: 1, totalPages: 1 } })

    const { result } = renderHook(() => useProducts({ page: 0, size: 10 }), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isError).toBe(true))
  })
})

describe('useCategories', () => {
  it('평평한 카테고리 목록을 받는다', async () => {
    const getSpy = vi.spyOn(catalogHttpClient, 'get').mockResolvedValue({ data: [{ id: 1, name: '음료', parentId: null }, { id: 5, name: '커피', parentId: 1 }] })

    const { result } = renderHook(() => useCategories(), { wrapper: createQueryClientWrapper() })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(getSpy).toHaveBeenCalledWith('/api/v1/admin/categories')
    expect(result.current.data).toHaveLength(2)
  })
})
