import { useQuery, useQueryClient } from '@tanstack/react-query'
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

/** 분류(태그·상품 그룹·카테고리) 하나를 쓰는 상품 수를 구하는 조건 */
export type ProductCountFilter = { categoryId?: number; tagId?: number; groupId?: number }

/**
 * 어떤 분류를 쓰는 상품이 몇 개인지 센다. API에 사용 수가 따로 없어, 그 조건으로 상품을 한 건만 조회하고 `totalElements`를 쓴다.
 * 삭제 확인 모달에서 영향 받는 상품 수를 보여 주려는 용도라 매번 새로 조회한다.
 */
export function useCountProducts() {
  const queryClient = useQueryClient()
  return (filter: ProductCountFilter) => queryClient.fetchQuery({
    queryKey: ['catalog', 'products', 'count', filter],
    queryFn: async () => productPageSchema.parse((await catalogHttpClient.get(`${ADMIN}/products`, { params: { ...filter, page: 0, size: 1 } })).data).totalElements,
    staleTime: 0,
  })
}
