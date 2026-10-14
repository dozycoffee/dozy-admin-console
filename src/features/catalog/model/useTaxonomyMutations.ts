import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { categorySchema, productGroupSchema, tagSchema } from './catalogSchemas'

const ADMIN = '/api/v1/admin'

type Resource = 'categories' | 'tags' | 'product-groups'

/**
 * 분류가 바뀌면 그 분류 목록을 다시 받는다. 태그·상품 그룹을 삭제하면 서버가 참조하던 상품에서 자동으로 빼므로
 * 상품 목록도 함께 갱신한다(카테고리는 삭제·이동해도 상품에 영향이 없다).
 */
function useTaxonomyMutation<TVariables, TResult>(resource: Resource, mutationFn: (variables: TVariables) => Promise<TResult>, { touchesProducts = false } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', resource] })
      if (touchesProducts) void queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] })
    },
  })
}

/** `parentId`가 null이면 대분류, 값이 있으면 그 대분류의 소분류로 만든다. */
export function useCreateCategory() {
  return useTaxonomyMutation('categories', async (body: { name: string; parentId: number | null }) => categorySchema.parse((await catalogHttpClient.post(`${ADMIN}/categories`, body)).data))
}

export function useRenameCategory() {
  return useTaxonomyMutation('categories', async ({ id, name }: { id: number; name: string }) => categorySchema.parse((await catalogHttpClient.put(`${ADMIN}/categories/${id}`, { name })).data))
}

/**
 * 부모 변경(소분류 이동, 대분류 강등, 소분류 승격). 승격은 `parentId`를 null로 **명시해서** 보내야 한다.
 * 필드를 빠뜨리면 서버가 승격으로 읽지 않고 거부한다(`INVALID_REQUEST`).
 */
export function useMoveCategory() {
  return useTaxonomyMutation('categories', async ({ id, parentId }: { id: number; parentId: number | null }) => categorySchema.parse((await catalogHttpClient.put(`${ADMIN}/categories/${id}/parent`, { parentId })).data))
}

export function useDeleteCategory() {
  return useTaxonomyMutation('categories', async (id: number) => {
    await catalogHttpClient.delete(`${ADMIN}/categories/${id}`)
  })
}

export function useRenameTag() {
  return useTaxonomyMutation('tags', async ({ id, name }: { id: number; name: string }) => tagSchema.parse((await catalogHttpClient.put(`${ADMIN}/tags/${id}`, { name })).data))
}

export function useDeleteTag() {
  return useTaxonomyMutation('tags', async (id: number) => {
    await catalogHttpClient.delete(`${ADMIN}/tags/${id}`)
  }, { touchesProducts: true })
}

export function useCreateProductGroup() {
  return useTaxonomyMutation('product-groups', async (name: string) => productGroupSchema.parse((await catalogHttpClient.post(`${ADMIN}/product-groups`, { name })).data))
}

export function useRenameProductGroup() {
  return useTaxonomyMutation('product-groups', async ({ id, name }: { id: number; name: string }) => productGroupSchema.parse((await catalogHttpClient.put(`${ADMIN}/product-groups/${id}`, { name })).data))
}

export function useDeleteProductGroup() {
  return useTaxonomyMutation('product-groups', async (id: number) => {
    await catalogHttpClient.delete(`${ADMIN}/product-groups/${id}`)
  }, { touchesProducts: true })
}
