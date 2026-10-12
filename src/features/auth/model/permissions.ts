import type { ActorModeId } from './actorModes'

export const permissions = {
  dashboardRead: 'dashboard.read',
  inventoryRead: 'inventory.read',
  inventoryWrite: 'inventory.write',
  inboundRead: 'inbound.read',
  inboundWrite: 'inbound.write',
  outboundRead: 'outbound.read',
  outboundWrite: 'outbound.write',
  disposalRead: 'disposal.read',
  disposalWrite: 'disposal.write',
  returnRead: 'return.read',
  returnWrite: 'return.write',
} as const

export type Permission = (typeof permissions)[keyof typeof permissions]
export type AccessScope = { warehouseIds: number[] }
export type CurrentUser = {
  id: string
  name: string
  actorModes: ActorModeId[]
  permissions: Permission[]
  scope: AccessScope
}
