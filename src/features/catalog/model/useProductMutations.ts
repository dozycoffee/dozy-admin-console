import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { productSchema, type CreateProductRequest, type UpdateProductRequest } from './catalogSchemas'

const ADMIN = '/api/v1/admin'

/** 낙관적 잠금: 화면에서 보던 버전을 `If-Match: "4"` 형식으로 보낸다. */
const ifMatch = (version: number) => ({ 'If-Match': `"${version}"` })

/**
 * 상품이 바뀌면 상품 목록을 다시 받는다. 등록·수정은 새 태그를 만들 수 있어 태그 목록도 함께 갱신한다.
 * 실패해도 목록을 다시 받아, 버전 충돌처럼 화면이 낡았을 때 최신 내용을 보게 한다.
 */
function useProductMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>, { touchesTags = false } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] })
      if (touchesTags) void queryClient.invalidateQueries({ queryKey: ['catalog', 'tags'] })
    },
  })
}

export function useCreateProduct() {
  return useProductMutation(async (body: CreateProductRequest) => productSchema.parse((await catalogHttpClient.post(`${ADMIN}/products`, body)).data), { touchesTags: true })
}

export function useUpdateProduct() {
  return useProductMutation(
    async ({ productId, version, body }: { productId: number; version: number; body: UpdateProductRequest }) =>
      productSchema.parse((await catalogHttpClient.put(`${ADMIN}/products/${productId}`, body, { headers: ifMatch(version) })).data),
    { touchesTags: true },
  )
}

/** 활성화(`DRAFT`·`DISCONTINUED` → `ACTIVE`). 상태 전환은 버전을 받지 않는다. */
export function useActivateProduct() {
  return useProductMutation(async (productId: number) => productSchema.parse((await catalogHttpClient.post(`${ADMIN}/products/${productId}/activate`)).data))
}

/** 단종(`ACTIVE` → `DISCONTINUED`). */
export function useDiscontinueProduct() {
  return useProductMutation(async (productId: number) => productSchema.parse((await catalogHttpClient.post(`${ADMIN}/products/${productId}/discontinue`)).data))
}

/** 삭제는 `DRAFT`만 가능하고 되돌릴 수 없다. */
export function useDeleteProduct() {
  return useProductMutation(async (productId: number) => {
    await catalogHttpClient.delete(`${ADMIN}/products/${productId}`)
  })
}
