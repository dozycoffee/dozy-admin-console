export const permissions = {
  dashboardRead: 'dashboard.read',
  catalogRead: 'catalog.read',
  catalogWrite: 'catalog.write',
  inventoryRead: 'inventory.read',
  inventoryWrite: 'inventory.write',
  usersManage: 'users.manage',
} as const

export type Permission = (typeof permissions)[keyof typeof permissions]
export type AccessScope = { warehouseIds: string[] }
export type CurrentUser = {
  id: string
  name: string
  permissions: Permission[]
  scope: AccessScope
}
