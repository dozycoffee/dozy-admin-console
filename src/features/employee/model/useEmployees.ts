import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import {
  employeeDetailSchema,
  employeePageSchema,
  inviteEmployeeResponseSchema,
  resendInvitationResponseSchema,
  type EmployeeListParams,
  type InviteEmployeeRequest,
  type UpdateEmployeeRequest,
} from './employeeSchemas'

export function useEmployees(params: EmployeeListParams) {
  return useQuery({
    queryKey: ['employees', 'list', params],
    queryFn: async () => employeePageSchema.parse((await authHttpClient.get('/admin/employees', { params: toQueryParams(params) })).data),
    // 페이지를 넘기는 동안 이전 목록을 유지해 깜빡임을 줄인다.
    placeholderData: (previous) => previous,
  })
}

/** 비어 있는 필터는 쿼리에서 뺀다(서버는 빈 `q`를 조건 없음으로 보지만 `status=`는 검증 실패다). */
export function toQueryParams({ status, role, q, page, size }: EmployeeListParams) {
  const trimmed = q?.trim()
  return { ...(status && { status }), ...(role && { role }), ...(trimmed && { q: trimmed }), page, size }
}

export function useEmployee(principalId: string | undefined) {
  return useQuery({
    queryKey: ['employees', 'detail', principalId],
    queryFn: async () => employeeDetailSchema.parse((await authHttpClient.get(`/admin/employees/${principalId}`)).data),
    enabled: principalId !== undefined,
  })
}

function useEmployeeMutation<TVariables, TResult>(mutationFn: (variables: TVariables) => Promise<TResult>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['employees'] }),
  })
}

export function useInviteEmployee() {
  return useEmployeeMutation(async (body: InviteEmployeeRequest) =>
    inviteEmployeeResponseSchema.parse((await authHttpClient.post('/admin/employees', body)).data),
  )
}

export function useResendInvitation() {
  return useEmployeeMutation(async (principalId: string) =>
    resendInvitationResponseSchema.parse((await authHttpClient.post(`/admin/employees/${principalId}/invitation`)).data),
  )
}

export function useCancelInvitation() {
  return useEmployeeMutation(async (principalId: string) => {
    await authHttpClient.delete(`/admin/employees/${principalId}/invitation`)
  })
}

export function useUpdateEmployee() {
  return useEmployeeMutation(async ({ principalId, body }: { principalId: string; body: UpdateEmployeeRequest }) =>
    employeeDetailSchema.parse((await authHttpClient.patch(`/admin/employees/${principalId}`, body)).data),
  )
}

export function useSuspendEmployee() {
  return useEmployeeMutation(async ({ principalId, reason }: { principalId: string; reason: string }) => {
    await authHttpClient.post(`/admin/principals/${principalId}/suspend`, { reason })
  })
}

export function useReactivateEmployee() {
  return useEmployeeMutation(async (principalId: string) => {
    await authHttpClient.post(`/admin/principals/${principalId}/reactivate`)
  })
}

export function useDeactivateEmployee() {
  return useEmployeeMutation(async ({ principalId, reason }: { principalId: string; reason: string }) => {
    await authHttpClient.post(`/admin/principals/${principalId}/deactivate`, { reason })
  })
}

export function useSendPasswordReset() {
  return useEmployeeMutation(async (principalId: string) => {
    await authHttpClient.post(`/admin/principals/${principalId}/password-reset`)
  })
}
