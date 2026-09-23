export const permissions = {
  dashboardRead: 'dashboard.read',
  inventoryRead: 'inventory.read',
  inventoryWrite: 'inventory.write',
} as const

export type Permission = (typeof permissions)[keyof typeof permissions]
export type AccessScope = { warehouseIds: number[] }
export type CurrentUser = {
  id: string
  name: string
  permissions: Permission[]
  scope: AccessScope
}
