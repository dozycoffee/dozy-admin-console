import { z } from 'zod'
import { permissions, type Permission } from './permissions'

const permissionValues = Object.values(permissions) as [Permission, ...Permission[]]
const permissionSchema = z.enum(permissionValues)

export const loginResponseSchema = z.object({
  accessToken: z.string(),
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  permissions: z.array(permissionSchema),
  scope: z.object({ warehouseIds: z.array(z.number()) }),
})
