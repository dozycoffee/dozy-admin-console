import { useQuery } from '@tanstack/react-query'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import {
  categoryListSchema,
  optionGroupListSchema,
  productGroupListSchema,
  productPageSchema,
  tagListSchema,
  type ProductListParams,
} from './catalogSchemas'

const ADMIN = '/api/v1/admin'

/** 비어 있는 필터는 쿼리에서 뺀다. */
export function toProductQueryParams({ keyword, status, categoryId, tagId, groupId, page, size }: ProductListParams) {
  const trimmed = keyword?.trim()
  return {
    ...(trimmed && { keyword: trimmed }),
    ...(status && { status }),
    ...(categoryId !== undefined && { categoryId }),
    ...(tagId !== undefined && { tagId }),
    ...(groupId !== undefined && { groupId }),
    page,
    size,
  }
}

/** 최근 등록한 상품이 먼저 온다. */
export function useProducts(params: ProductListParams) {
  return useQuery({
    queryKey: ['catalog', 'products', 'list', params],
    queryFn: async () => productPageSchema.parse((await catalogHttpClient.get(`${ADMIN}/products`, { params: toProductQueryParams(params) })).data),
    // 페이지를 넘기는 동안 이전 목록을 유지해 깜빡임을 줄인다.
    placeholderData: (previous) => previous,
  })
}

/** 대분류·소분류를 평평한 목록으로 받는다. 계층은 `parentId`로 구성한다. */
export function useCategories() {
  return useQuery({
    queryKey: ['catalog', 'categories', 'list'],
    queryFn: async () => categoryListSchema.parse((await catalogHttpClient.get(`${ADMIN}/categories`)).data),
  })
}

export function useTags() {
  return useQuery({
    queryKey: ['catalog', 'tags', 'list'],
    queryFn: async () => tagListSchema.parse((await catalogHttpClient.get(`${ADMIN}/tags`)).data),
  })
}

export function useProductGroups() {
  return useQuery({
    queryKey: ['catalog', 'product-groups', 'list'],
    queryFn: async () => productGroupListSchema.parse((await catalogHttpClient.get(`${ADMIN}/product-groups`)).data),
  })
}

export function useOptionGroups() {
  return useQuery({
    queryKey: ['catalog', 'option-groups', 'list'],
    queryFn: async () => optionGroupListSchema.parse((await catalogHttpClient.get(`${ADMIN}/option-groups`)).data),
  })
}
