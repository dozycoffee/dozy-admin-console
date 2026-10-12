import { z } from 'zod'

/** `POST /realms/internal/invitations/verify` 응답. 이메일·전화번호는 서버가 마스킹해서 준다. */
export const invitationSchema = z.object({
  name: z.string(),
  maskedEmail: z.string(),
  maskedPhone: z.string().nullish(),
  expiresAt: z.string(),
})
export type Invitation = z.infer<typeof invitationSchema>
