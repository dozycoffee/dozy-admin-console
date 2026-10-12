import { useMutation, useQuery } from '@tanstack/react-query'
import { authHttpClient } from '../../../shared/api/httpClient'
import { invitationSchema } from './accountSchemas'

// 콘솔은 직원용이라 internal realm만 쓴다. 토큰·이메일은 URL이 아니라 본문으로 보낸다(VER-05).
const REALM_PATH = '/realms/internal'

/** 초대 링크의 토큰으로 초대를 조회한다. 조회해도 토큰은 소비되지 않는다(VER-06). */
export function useInvitation(token: string) {
  return useQuery({
    queryKey: ['account', 'invitation', token],
    queryFn: async () => invitationSchema.parse((await authHttpClient.post(`${REALM_PATH}/invitations/verify`, { token })).data),
    enabled: token !== '',
    retry: false,
    staleTime: Infinity,
  })
}

export function useAcceptInvitation() {
  return useMutation({
    mutationFn: async ({ token, password }: { token: string; password: string }) => {
      await authHttpClient.post(`${REALM_PATH}/invitations/accept`, { token, password })
    },
  })
}

/** 비밀번호 찾기. 계정이 없어도 같은 응답(202)이다(LGN-04). */
export function useRequestPasswordReset() {
  return useMutation({
    mutationFn: async (email: string) => {
      await authHttpClient.post(`${REALM_PATH}/password/forgot`, { email })
    },
  })
}

export function useResetPassword() {
  return useMutation({
    mutationFn: async ({ token, newPassword }: { token: string; newPassword: string }) => {
      await authHttpClient.post(`${REALM_PATH}/password/reset`, { token, newPassword })
    },
  })
}
