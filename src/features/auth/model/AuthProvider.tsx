import type { PropsWithChildren } from 'react'
import { AuthContext } from './authContext'
import { permissions, type CurrentUser, type Permission } from './permissions'

const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  permissions: [permissions.dashboardRead, permissions.catalogRead, permissions.inventoryRead],
  scope: { warehouseIds: ['warehouse-seoul'] },
}

export function AuthProvider({ children }: PropsWithChildren) {
  const can = (permission: Permission) => mockUser.permissions.includes(permission)
  return <AuthContext.Provider value={{ user: mockUser, can }}>{children}</AuthContext.Provider>
}
