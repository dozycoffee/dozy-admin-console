import type { PropsWithChildren } from 'react'
import { AuthContext } from './authContext'
import { permissions, type CurrentUser, type Permission } from './permissions'

// warehouseIds는 dozy-wms-api가 실제로 등록해둔 창고 id를 가리켜야 한다.
// 창고 테이블은 마이그레이션 시드 데이터가 없어(런타임에 POST /api/warehouses로 등록) 값이
// 개발 DB마다 다를 수 있다 — 로컬에서 다른 값이 필요하면 이 배열만 바꾸면 된다. 실제 로그인 연동
// (auth-real-login) 전까지는 이 mock이 유일한 창고 접근 범위 소스다.
const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  permissions: [permissions.dashboardRead, permissions.catalogRead, permissions.inventoryRead],
  scope: { warehouseIds: [1481] },
}

export function AuthProvider({ children }: PropsWithChildren) {
  const can = (permission: Permission) => mockUser.permissions.includes(permission)
  return <AuthContext.Provider value={{ user: mockUser, can }}>{children}</AuthContext.Provider>
}
