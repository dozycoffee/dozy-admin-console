import { z } from 'zod'
import { actorModeIds, type ActorModeId } from './actorModes'
import { permissions, type Permission } from './permissions'

const permissionValues = Object.values(permissions) as [Permission, ...Permission[]]
const permissionSchema = z.enum(permissionValues)
const actorModeValues = Object.values(actorModeIds) as [ActorModeId, ...ActorModeId[]]
export const actorModeIdSchema = z.enum(actorModeValues)

export const loginResponseSchema = z.object({
  accessToken: z.string(),
})
export type LoginResponse = z.infer<typeof loginResponseSchema>

export const currentUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  actorModes: z.array(actorModeIdSchema),
  permissions: z.array(permissionSchema),
  scope: z.object({ warehouseIds: z.array(z.number()) }),
})
