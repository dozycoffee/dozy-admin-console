import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import {
  audienceListSchema, audienceSchema, roleListSchema, roleSchema,
  type CreateAudienceRequest, type CreateRoleRequest, type UpdateRoleRequest,
} from './roleSchemas'

/** dozy-auth에 정의된 role 목록 (`GET /admin/roles`, 페이지 없음). audience code로 거를 수 있다. */
export function useRoles(audience?: string) {
  return useQuery({
    queryKey: ['roles', 'list', { audience: audience ?? null }],
    queryFn: async () => roleListSchema.parse((await authHttpClient.get('/admin/roles', { params: audience ? { audience } : undefined })).data).items,
  })
}

export function useAudiences() {
  return useQuery({
    queryKey: ['audiences', 'list'],
    queryFn: async () => audienceListSchema.parse((await authHttpClient.get('/admin/audiences')).data).items,
  })
}

export function useCreateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateRoleRequest) => roleSchema.parse((await authHttpClient.post('/admin/roles', body)).data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

export function useUpdateRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, body }: { roleId: number; body: UpdateRoleRequest }) =>
      roleSchema.parse((await authHttpClient.patch(`/admin/roles/${roleId}`, body)).data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
  })
}

/** `revokeAll`이 true면 부여된 모든 principal에서 회수한 뒤 삭제한다. 직원의 role도 바뀌므로 직원 목록도 갱신한다. */
export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ roleId, revokeAll }: { roleId: number; revokeAll: boolean }) => {
      await authHttpClient.delete(`/admin/roles/${roleId}`, { params: { revokeAll } })
    },
    onSuccess: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['roles'] }), queryClient.invalidateQueries({ queryKey: ['employees'] })]),
  })
}

export function useCreateAudience() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (body: CreateAudienceRequest) => audienceSchema.parse((await authHttpClient.post('/admin/audiences', body)).data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['audiences'] }),
  })
}
