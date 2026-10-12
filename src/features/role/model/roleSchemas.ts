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
