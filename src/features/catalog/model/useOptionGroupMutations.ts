import { useMutation, useQueryClient } from '@tanstack/react-query'
import { catalogHttpClient } from '../../../shared/api/httpClient'
import { optionGroupSchema, type CreateOptionGroupRequest, type OptionInput, type UpdateOptionGroupRequest } from './catalogSchemas'

const ADMIN = '/api/v1/admin'

/** 낙관적 잠금: 화면이 보던 버전을 `If-Match: "2"` 형식으로 보낸다. */
const ifMatch = (version: number) => ({ 'If-Match': `"${version}"` })

/**
 * 옵션 그룹이 바뀌면 옵션 그룹 목록을 다시 받는다. 옵션 목록을 바꾸면 서버가 사라진 옵션 키의 상품별 예외를 모든 연결 상품에서
 * 지우므로 상품 목록도 함께 갱신한다. 실패해도 목록을 다시 받아, 버전 충돌 때 화면이 최신 내용을 보게 한다.
 */
function useOptionGroupMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>, { touchesProducts = false } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: ['catalog', 'option-groups'] })
      if (touchesProducts) void queryClient.invalidateQueries({ queryKey: ['catalog', 'products'] })
    },
  })
}

export function useCreateOptionGroup() {
  return useOptionGroupMutation(async (body: CreateOptionGroupRequest) => optionGroupSchema.parse((await catalogHttpClient.post(`${ADMIN}/option-groups`, body)).data))
}

/** 이름·선택 방식·필수 여부를 바꾼다(즉시 반영만 가능). 옵션 목록은 `useReplaceOptions`로 바꾼다. */
export function useUpdateOptionGroup() {
  return useOptionGroupMutation(async ({ id, version, body }: { id: number; version: number; body: UpdateOptionGroupRequest }) =>
    optionGroupSchema.parse((await catalogHttpClient.put(`${ADMIN}/option-groups/${id}`, body, { headers: ifMatch(version) })).data))
}

/** 옵션 목록 전체를 입력한 목록으로 교체한다. 목록에서 사라진 옵션 키의 상품별 예외는 모든 연결 상품에서 함께 삭제된다. */
export function useReplaceOptions() {
  return useOptionGroupMutation(async ({ id, version, options }: { id: number; version: number; options: OptionInput[] }) =>
    optionGroupSchema.parse((await catalogHttpClient.put(`${ADMIN}/option-groups/${id}/options`, { options }, { headers: ifMatch(version) })).data), { touchesProducts: true })
}

/** 연결한 상품이 있으면 서버가 거부한다. */
export function useDeleteOptionGroup() {
  return useOptionGroupMutation(async (id: number) => {
    await catalogHttpClient.delete(`${ADMIN}/option-groups/${id}`)
  })
}
