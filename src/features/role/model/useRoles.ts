import { useQuery } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import { roleListSchema } from './roleSchemas'

/** dozy-auth에 정의된 role 목록 (`GET /admin/roles`, 페이지 없음) */
export function useRoles() {
  return useQuery({
    queryKey: ['roles', 'list'],
    queryFn: async () => roleListSchema.parse((await authHttpClient.get('/admin/roles')).data).items,
  })
}
