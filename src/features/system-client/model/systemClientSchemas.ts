import { z } from 'zod'

export const systemClientStatusSchema = z.enum(['ACTIVE', 'SUSPENDED', 'DEACTIVATED'])

export const systemClientSchema = z.object({
  principalId: z.string(),
  clientId: z.string(),
  name: z.string(),
  status: systemClientStatusSchema,
  roles: z.array(z.string()),
  secretRotatedAt: z.string().nullish(),
  createdAt: z.string(),
})
export type SystemClient = z.infer<typeof systemClientSchema>

export const systemClientListSchema = z.object({ items: z.array(systemClientSchema) })

/** 등록 응답. clientSecret은 이 응답에서만 내려오고 서버에는 해시만 남는다(CLI-02). */
export const registeredClientSchema = z.object({
  principalId: z.string(),
  clientId: z.string(),
  clientSecret: z.string(),
})

export const rotatedSecretSchema = z.object({ clientSecret: z.string() })

/** clientId 형식(dozy-auth CLI-01)과 컬럼 길이 상한 */
export const CLIENT_ID_PATTERN = /^svc-[a-z][a-z0-9]*(-[a-z0-9]+)*$/
export const CLIENT_ID_MAX_LENGTH = 100
export const CLIENT_NAME_MAX_LENGTH = 100

export function isValidClientId(value: string): boolean {
  return value.length <= CLIENT_ID_MAX_LENGTH && CLIENT_ID_PATTERN.test(value)
}

export type RegisterSystemClientRequest = { clientId: string; name: string; roles?: string[] }

/** 화면에 한 번 보여주고 버리는 secret */
export type RevealedSecret = { clientId: string; clientSecret: string }
