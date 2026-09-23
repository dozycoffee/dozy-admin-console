import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { actorModeIds, type ActorModeId } from '../model/actorModes'
import { AuthContext, type AuthContextValue } from '../model/authContext'
import { RequireActorMode } from './RequireActorMode'

function renderGuard(activeActorMode: ActorModeId | null, allowedModes: ActorModeId[]) {
  const value: AuthContextValue = {
    user: { id: 'user-001', name: '김도윤', actorModes: allowedModes, permissions: [], scope: { warehouseIds: [] } },
    isLoading: false,
    activeActorMode,
    can: () => false,
    selectActorMode: vi.fn(),
    clearActorMode: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route element={<RequireActorMode />}>
            <Route path="/inventory" element={<div>mode console</div>} />
          </Route>
          <Route path="/select-mode" element={<div>mode selection</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

function renderModeRestrictedRoute(activeActorMode: ActorModeId) {
  const value: AuthContextValue = {
    user: { id: 'user-001', name: '김도윤', actorModes: [activeActorMode], permissions: [], scope: { warehouseIds: [] } },
    isLoading: false,
    activeActorMode,
    can: () => true,
    selectActorMode: vi.fn(),
    clearActorMode: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }

  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/inventory']}>
        <Routes>
          <Route path="/" element={<div>mode home</div>} />
          <Route path="/inventory" element={<RequireActorMode allowedModes={[actorModeIds.warehouseManager]}><div>inventory</div></RequireActorMode>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireActorMode', () => {
  it('허용된 활성 모드가 있으면 콘솔 접근을 허용한다', () => {
    renderGuard(actorModeIds.warehouseManager, [actorModeIds.warehouseManager])

    expect(screen.getByText('mode console')).toBeInTheDocument()
  })

  it('선택한 모드가 없으면 모드 선택 화면으로 이동한다', () => {
    renderGuard(null, [actorModeIds.warehouseManager])

    expect(screen.getByText('mode selection')).toBeInTheDocument()
  })

  it('활성 모드가 최신 허용 목록에 없으면 모드 선택 화면으로 이동한다', () => {
    renderGuard(actorModeIds.accountAdministrator, [actorModeIds.warehouseManager])

    expect(screen.getByText('mode selection')).toBeInTheDocument()
  })

  it('현재 모드에 허용되지 않은 하위 화면 직접 접근을 모드 홈으로 돌려보낸다', () => {
    renderModeRestrictedRoute(actorModeIds.merchandiser)

    expect(screen.getByText('mode home')).toBeInTheDocument()
    expect(screen.queryByText('inventory')).not.toBeInTheDocument()
  })
})
