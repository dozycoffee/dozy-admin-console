import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions, type Permission } from '../../features/auth/model/permissions'

const navigation: Array<{ label: string; to: string; permission: Permission }> = [
  { label: '대시보드', to: '/', permission: permissions.dashboardRead },
  { label: '상품 관리', to: '/catalog', permission: permissions.catalogRead },
  { label: '재고·창고', to: '/inventory', permission: permissions.inventoryRead },
  { label: '사용자·권한', to: '/users', permission: permissions.usersManage },
]

export function AppLayout() {
  const { user, can } = useAuth()
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">DOZY <span>COFFEE</span></div>
        <p className="nav-label">ADMIN CONSOLE</p>
        <nav>
          {navigation.map((item) => {
            const allowed = can(item.permission)
            return (
              <NavLink
                key={item.to}
                to={allowed ? item.to : '/access-denied'}
                state={allowed ? undefined : { from: item.to, permission: item.permission }}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <span>{item.label}</span>
                {!allowed && <small aria-label="접근 제한">잠김</small>}
              </NavLink>
            )
          })}
        </nav>
        <div className="user-card"><strong>{user.name}</strong><span>접근 범위 · 서울 중앙 창고</span></div>
      </aside>
      <main className="content"><Outlet /></main>
    </div>
  )
}
