import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { ConfirmModal } from './ConfirmModal'
import dozyCoffeeLogo from '../../assets/dozy-coffee-logo.png'

const navigation: Array<{ label: string; to: string; permission: Permission }> = [
  { label: '대시보드', to: '/', permission: permissions.dashboardRead },
  { label: '재고 현황', to: '/inventory', permission: permissions.inventoryRead },
  { label: '창고 평면도', to: '/warehouse-map', permission: permissions.inventoryRead },
]

type NavIconName = 'dashboard' | 'inventory' | 'map' | 'logout'
function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, string> = {
    dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    inventory: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9',
    map: 'M4 5.5 9 3l6 3 5-2.5v15L15 21l-6-3-5 2.5zM9 3v15M15 6v15',
    logout: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9',
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function AppLayout() {
  const user = useCurrentUser()
  const { can, logout } = useAuth()
  const location = useLocation()
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const activeNavIndex = navigation.findIndex((item) => item.to === '/' ? location.pathname === '/' : item.to === '/inventory' ? location.pathname === '/inventory' : location.pathname.startsWith(item.to))
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand"><img src={dozyCoffeeLogo} alt="DOZY COFFEE 로고" /><span className="brand-name">DOZY <b>COFFEE</b></span><button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}>{sidebarCollapsed ? '›' : '‹'}</button></div>
        <p className="nav-label">ADMIN CONSOLE</p>
        <nav className="sidebar-nav">
          {activeNavIndex >= 0 && <span className="nav-active-slider" style={{ transform: `translateY(${activeNavIndex * 50}px)` }} aria-hidden="true" />}
          {navigation.map((item) => {
            const allowed = can(item.permission)
            return (
              <NavLink
                key={item.to}
                to={allowed ? item.to : '/access-denied'}
                title={sidebarCollapsed ? item.label : undefined}
                end={item.to === '/inventory'}
                state={allowed ? undefined : { from: item.to, permission: item.permission }}
                className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              >
                <NavIcon name={item.to === '/' ? 'dashboard' : item.to === '/inventory' ? 'inventory' : 'map'} />
                <span className="nav-link-label">{item.label}</span>
                {!allowed && <small aria-label="접근 제한">잠김</small>}
              </NavLink>
            )
          })}
        </nav>
        <div className="user-card">
          <strong>{user.name}</strong>
          <button type="button" className="logout-button" onClick={() => setLogoutModalOpen(true)}><NavIcon name="logout" /><span>로그아웃</span></button>
        </div>
      </aside>
      <main key={`${location.pathname}${location.search}`} className="content route-transition"><Outlet /></main>
      <ConfirmModal open={logoutModalOpen} title="로그아웃하시겠습니까?" description="현재 세션이 종료되고 로그인 화면으로 이동합니다." confirmLabel="로그아웃" onCancel={() => setLogoutModalOpen(false)} onConfirm={() => { setLogoutModalOpen(false); logout() }} />
    </div>
  )
}
