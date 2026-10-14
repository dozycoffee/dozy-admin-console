import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { productSchema, type OptionOverrideInput } from './catalogSchemas'

const ADMIN = '/api/v1/admin'

/** 낙관적 잠금: 화면이 보던 상품 버전을 `If-Match: "4"` 형식으로 보낸다. */
const ifMatch = (version: number) => ({ 'If-Match': `"${version}"` })

type Target = { productId: number; version: number }

/**
 * 연결·해제·순서·예외 변경은 모두 상품 버전이 필요하고 변경할 때마다 버전이 오른다. 연속으로 누르면 낡은 버전으로 요청이 나가
 * 충돌하므로, 상품 목록(유효 옵션 포함)을 다시 받는 것까지 끝나야 mutation이 끝난 것으로 본다. 그동안 버튼을 막는 데 `isPending`을 쓴다.
 * 실패해도 다시 받아, 버전 충돌 때 화면이 최신 내용을 보게 한다.
 */
function useProductOptionMutation<TVariables extends Target>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] }),
  })
}

const overridePath = (productId: number, optionGroupId: number, optionKey: string) =>
  `${ADMIN}/products/${productId}/option-groups/${optionGroupId}/overrides/${encodeURIComponent(optionKey)}`

/** 옵션 그룹을 연결한다. 기존 연결들 뒤에 붙는다. */
export function useLinkOptionGroup() {
  return useProductOptionMutation(async ({ productId, version, optionGroupId }: Target & { optionGroupId: number }) =>
    productSchema.parse((await catalogHttpClient.post(`${ADMIN}/products/${productId}/option-groups`, { optionGroupId }, { headers: ifMatch(version) })).data))
}

/** 연결을 해제한다. 그 연결의 예외도 함께 삭제되고 다시 연결해도 복원되지 않는다. */
export function useUnlinkOptionGroup() {
  return useProductOptionMutation(async ({ productId, version, optionGroupId }: Target & { optionGroupId: number }) =>
    productSchema.parse((await catalogHttpClient.delete(`${ADMIN}/products/${productId}/option-groups/${optionGroupId}`, { headers: ifMatch(version) })).data))
}

/** 노출 순서를 바꾼다. 연결된 옵션 그룹 전체를 정확히 한 번씩 담아야 한다. */
export function useReorderOptionGroups() {
  return useProductOptionMutation(async ({ productId, version, optionGroupIds }: Target & { optionGroupIds: number[] }) =>
    productSchema.parse((await catalogHttpClient.put(`${ADMIN}/products/${productId}/option-groups/order`, { optionGroupIds }, { headers: ifMatch(version) })).data))
}

/** 이 상품에서만 옵션 가격을 다르게 하거나 옵션을 제외한다. 같은 옵션 키에 예외가 있으면 대체한다. */
export function useSetOptionOverride() {
  return useProductOptionMutation(async ({ productId, version, optionGroupId, optionKey, override }: Target & { optionGroupId: number; optionKey: string; override: OptionOverrideInput }) =>
    productSchema.parse((await catalogHttpClient.put(overridePath(productId, optionGroupId, optionKey), override, { headers: ifMatch(version) })).data))
}

/** 예외를 해제한다. 그 옵션은 다시 옵션 그룹의 구성과 가격을 따른다. */
export function useClearOptionOverride() {
  return useProductOptionMutation(async ({ productId, version, optionGroupId, optionKey }: Target & { optionGroupId: number; optionKey: string }) =>
    productSchema.parse((await catalogHttpClient.delete(overridePath(productId, optionGroupId, optionKey), { headers: ifMatch(version) })).data))
}
