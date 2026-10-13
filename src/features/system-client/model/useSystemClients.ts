import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import {
  registeredClientSchema, rotatedSecretSchema, systemClientListSchema,
  type RegisterSystemClientRequest,
} from './systemClientSchemas'

/** 최근 등록한 순서다. 비활성화한 client도 DEACTIVATED로 나오며 페이지는 없다. */
export function useSystemClients() {
  return useQuery({
    queryKey: ['system-clients', 'list'],
    queryFn: async () => systemClientListSchema.parse((await authHttpClient.get('/admin/system-clients')).data).items,
  })
}

function useClientMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>, options: { discardResult?: boolean } = {}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    // secret이 든 결과는 호출한 쪽 콜백으로만 넘기고 mutation 캐시에 남기지 않는다.
    ...(options.discardResult && { gcTime: 0 }),
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['system-clients'] }), queryClient.invalidateQueries({ queryKey: ['roles'] })]),
  })
}

/** 응답의 `clientSecret`은 이때만 받을 수 있다. 호출한 쪽이 `onSuccess` 콜백에서 한 번 보여주고 버린다. */
export function useRegisterSystemClient() {
  return useClientMutation(
    async (body: RegisterSystemClientRequest) => registeredClientSchema.parse((await authHttpClient.post('/admin/system-clients', body)).data),
    { discardResult: true },
  )
}

/** 기존 secret은 즉시 무효가 된다(CLI-03). `ACTIVE`가 아니면 `INVALID_STATE`다. */
export function useRotateClientSecret() {
  return useClientMutation(
    async (principalId: string) => rotatedSecretSchema.parse((await authHttpClient.post(`/admin/system-clients/${principalId}/secret`)).data),
    { discardResult: true },
  )
}

/** 시스템 클라이언트에는 일반 role만 부여할 수 있다(GOV-06). 계정 API를 직원과 함께 쓴다. */
export function useGrantClientRole() {
  return useClientMutation(async ({ principalId, role }: { principalId: string; role: string }) => {
    await authHttpClient.post(`/admin/principals/${principalId}/roles`, { roles: [role] })
  })
}

export function useRevokeClientRole() {
  return useClientMutation(async ({ principalId, role }: { principalId: string; role: string }) => {
    await authHttpClient.delete(`/admin/principals/${principalId}/roles/${role}`)
  })
}

/** 시스템 클라이언트 폐기는 계정 비활성화로 한다(CLI-04). 되돌릴 수 없고 clientId는 `deleted-{id}`로 바뀐다(ACC-04). */
export function useDeactivateSystemClient() {
  return useClientMutation(async ({ principalId, reason }: { principalId: string; reason: string }) => {
    await authHttpClient.post(`/admin/principals/${principalId}/deactivate`, { reason })
  })
}
