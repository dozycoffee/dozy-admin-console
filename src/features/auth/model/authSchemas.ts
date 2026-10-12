import { z } from 'zod'

/** `POST /realms/internal/login`, `POST /realms/internal/token/refresh` 응답 */
export const loginResponseSchema = z.object({
  accessToken: z.string(),
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

/** `GET /realms/internal/me` 응답. roles는 DB의 현재 값이다. */
export const meResponseSchema = z.object({
  principalType: z.string(),
  principalId: z.string(),
  name: z.string(),
  email: z.string(),
  roles: z.array(z.string()),
})
export type MeResponse = z.infer<typeof meResponseSchema>
