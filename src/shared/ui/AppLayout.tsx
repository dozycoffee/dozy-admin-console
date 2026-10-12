import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { ConfirmModal } from './ConfirmModal'
import { ActorModeModal } from '../../features/auth/ui/ActorModeModal'
import dozyCoffeeLogo from '../../assets/dozy-coffee-logo.png'
import { actorModeIds, getActorMode, type ActorModeId } from '../../features/auth/model/actorModes'

const operationsNavigation: Array<{ label: string; to: string; permission: Permission }> = [
  { label: '대시보드', to: '/', permission: permissions.dashboardRead },
  { label: '재고 현황', to: '/inventory', permission: permissions.inventoryRead },
  { label: '창고 평면도', to: '/warehouse-map', permission: permissions.inventoryRead },
]
const warehouseManagerNavigation = [...operationsNavigation, { label: '입고 관리', to: '/inbounds', permission: permissions.inboundRead }, { label: '출고 관리', to: '/outbounds', permission: permissions.outboundRead }, { label: '폐기 관리', to: '/disposals', permission: permissions.disposalRead }, { label: '반품 관리', to: '/returns', permission: permissions.returnRead }]

const navigationByMode: Record<ActorModeId, Array<{ label: string; to: string; permission: Permission }>> = {
  [actorModeIds.accountAdministrator]: [{ label: '대시보드', to: '/', permission: permissions.dashboardRead }],
  [actorModeIds.merchandiser]: [{ label: '대시보드', to: '/', permission: permissions.dashboardRead }],
  [actorModeIds.warehouseManager]: warehouseManagerNavigation,
  [actorModeIds.headquartersInventoryManager]: operationsNavigation,
}

type NavIconName = 'dashboard' | 'inventory' | 'map' | 'inbound' | 'outbound' | 'disposal' | 'return' | 'logout'
function NavIcon({ name }: { name: NavIconName }) {
  const paths: Record<NavIconName, string> = {
    dashboard: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
    inventory: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5zM4 7.5l8 4.5 8-4.5M12 12v9',
    map: 'M4 5.5 9 3l6 3 5-2.5v15L15 21l-6-3-5 2.5zM9 3v15M15 6v15',
    inbound: 'M4 7h16M7 3v8m10-8v8M6 11h12v10H6zM9 15h6M9 18h4',
    outbound: 'M4 7h16M7 13V3m10 10V3M6 11h12v10H6zM9 15h6M9 18h4',
    disposal: 'M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13M10 11v6M14 11v6',
    return: 'M9 7 4 12l5 5M4 12h11a5 5 0 0 1 0 10h-3',
    logout: 'M10 5H5v14h5M14 8l4 4-4 4M18 12H9',
  }
  return <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={paths[name]} /></svg>
}

export function AppLayout() {
  const user = useCurrentUser()
  const { activeActorMode, can, logout } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [logoutModalOpen, setLogoutModalOpen] = useState(false)
  const [modeModalOpen, setModeModalOpen] = useState(() => activeActorMode === null)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const currentMode = activeActorMode ? getActorMode(activeActorMode) : null
  const navigation = activeActorMode ? navigationByMode[activeActorMode] : []
  const activeNavIndex = navigation.findIndex((item) => item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to))

  function finishModeSelection() {
    setModeModalOpen(false)
    navigate('/', { replace: true })
  }
  return (
    <div className={`app-shell ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="brand"><img src={dozyCoffeeLogo} alt="DOZY COFFEE 로고" /><span className="brand-name">DOZY <b>COFFEE</b></span><button type="button" className="sidebar-toggle" aria-label={sidebarCollapsed ? '사이드바 펼치기' : '사이드바 접기'} aria-expanded={!sidebarCollapsed} onClick={() => setSidebarCollapsed((value) => !value)}>{sidebarCollapsed ? '›' : '‹'}</button></div>
        <button type="button" className="active-mode-summary" onClick={() => setModeModalOpen(true)} aria-label="업무 모드 변경">
          <small>CURRENT MODE</small>
          <strong>{currentMode?.shortLabel ?? '모드를 선택하세요'}</strong>
          <span aria-hidden="true">›</span>
        </button>
        <p className="nav-label">{activeActorMode === actorModeIds.warehouseManager ? 'WAREHOUSE CONSOLE' : 'ADMIN CONSOLE'}</p>
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
                <NavIcon name={item.to === '/' ? 'dashboard' : item.to === '/inventory' ? 'inventory' : item.to === '/inbounds' ? 'inbound' : item.to === '/outbounds' ? 'outbound' : item.to === '/disposals' ? 'disposal' : item.to === '/returns' ? 'return' : 'map'} />
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
      <ActorModeModal open={modeModalOpen || activeActorMode === null} onClose={() => setModeModalOpen(false)} onSelected={finishModeSelection} />
      <ConfirmModal open={logoutModalOpen} title="로그아웃하시겠습니까?" description="현재 세션이 종료되고 로그인 화면으로 이동합니다." confirmLabel="로그아웃" onCancel={() => setLogoutModalOpen(false)} onConfirm={() => { setLogoutModalOpen(false); logout() }} />
    </div>
  )
}
