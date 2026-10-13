import { useMutation } from '@tanstack/react-query'
import { z } from 'zod'
import { authHttpClient } from '../../../shared/api/httpClient'

const requestedSchema = z.object({ expiresAt: z.string() })

/** 현재 owner가 대상 직원에게 양도를 요청한다. 대상에게 수락 메일이 가며 진행 중인 양도는 하나만 있을 수 있다(GOV-09). */
export function useRequestOwnerTransfer() {
  return useMutation({
    mutationFn: async (targetPrincipalId: string) => requestedSchema.parse((await authHttpClient.post('/admin/owner/transfer', { targetPrincipalId })).data),
  })
}

/** 수락 전까지 현재 owner가 취소할 수 있다. 발송된 수락 링크는 무효가 된다. */
export function useCancelOwnerTransfer() {
  return useMutation({
    mutationFn: async () => {
      await authHttpClient.delete('/admin/owner/transfer')
    },
  })
}

/** 대상 직원이 본인 계정으로 로그인한 상태에서 메일 링크의 토큰으로 수락한다. */
export function useAcceptOwnerTransfer() {
  return useMutation({
    mutationFn: async (token: string) => {
      await authHttpClient.post('/admin/owner/transfer/accept', { token })
    },
  })
}
