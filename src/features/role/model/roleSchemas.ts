import { z } from 'zod'

export const roleSchema = z.object({
  id: z.number(),
  audience: z.string(),
  code: z.string(),
  fullCode: z.string(),
  name: z.string(),
  description: z.string().nullish(),
  isSystem: z.boolean(),
  grantedCount: z.number(),
})
export type Role = z.infer<typeof roleSchema>

export const roleListSchema = z.object({ items: z.array(roleSchema) })

export const audienceSchema = z.object({
  id: z.number(),
  code: z.string(),
  name: z.string(),
  description: z.string().nullish(),
})
export type Audience = z.infer<typeof audienceSchema>

export const audienceListSchema = z.object({ items: z.array(audienceSchema) })

/** role·audience code 형식 (dozy-auth DOM-03). 등록한 뒤에는 바꿀 수 없다. */
export const CODE_PATTERN = /^[a-z][a-z0-9_]*$/

export type CreateRoleRequest = { audience: string; code: string; name: string; description?: string }
export type UpdateRoleRequest = { name?: string; description?: string }
export type CreateAudienceRequest = { code: string; name: string; description?: string }
