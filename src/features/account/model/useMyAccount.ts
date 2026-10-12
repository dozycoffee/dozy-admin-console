import { useMutation, useQuery } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import { meResponseSchema } from '../../auth/model/authSchemas'

const REALM_PATH = '/realms/internal'

/** 내 정보(이메일·이름·부여된 role). 전화번호·주소는 내 정보 응답에 없다. */
export function useMyAccount() {
  return useQuery({
    queryKey: ['account', 'me'],
    queryFn: async () => meResponseSchema.parse((await authHttpClient.get(`${REALM_PATH}/me`)).data),
  })
}

/** 현재 세션을 뺀 모든 세션이 폐기된다(PWD-06). 현재 비밀번호가 틀리면 401이 아니라 400이다(PWD-08). */
export function useChangePassword() {
  return useMutation({
    mutationFn: async ({ currentPassword, newPassword }: { currentPassword: string; newPassword: string }) => {
      await authHttpClient.post(`${REALM_PATH}/password/change`, { currentPassword, newPassword })
    },
  })
}
