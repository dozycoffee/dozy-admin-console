import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { AppLayout } from './AppLayout'
import { actorModeIds } from '../../features/auth/model/actorModes'

const stubUser: AuthContextValue['user'] = {
  id: 'user-test',
  name: '테스트 사용자',
  actorModes: [actorModeIds.warehouseManager],
  permissions: [],
  scope: { warehouseIds: [1, 2] },
}

function renderAppLayout(logout: () => void, mode: (typeof actorModeIds)[keyof typeof actorModeIds] = actorModeIds.warehouseManager) {
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: mode, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<div>page content</div>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('AppLayout', () => {
  it('사용자 이름과 메뉴를 보여준다', () => {
    renderAppLayout(vi.fn())

    expect(screen.getByText('테스트 사용자')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /대시보드/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /재고 현황/ })).toBeInTheDocument()
  })

  it('MD 모드에는 상품 관리 메뉴가 있다', () => {
    renderAppLayout(vi.fn(), actorModeIds.merchandiser)

    expect(screen.getByRole('link', { name: /상품 관리/ })).toHaveAttribute('href', '/products')
    expect(screen.getByRole('link', { name: /분류 관리/ })).toHaveAttribute('href', '/taxonomy')
    expect(screen.getByRole('link', { name: /옵션 그룹/ })).toHaveAttribute('href', '/option-groups')
    expect(screen.queryByRole('link', { name: /재고 현황/ })).not.toBeInTheDocument()
  })

  it('사용자 이름은 내 계정 화면으로 가는 링크다', () => {
    renderAppLayout(vi.fn())

    expect(screen.getByRole('link', { name: '테스트 사용자' })).toHaveAttribute('href', '/account')
  })

  it('로그아웃 버튼을 누르면 바로 로그아웃하지 않고 확인 모달을 띄운다', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderAppLayout(logout)

    await user.click(screen.getByRole('button', { name: /로그아웃/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  it('CURRENT MODE 카드를 누르면 모드 선택 모달을 연다', async () => {
    const user = userEvent.setup()
    renderAppLayout(vi.fn())

    expect(screen.getByText('창고 관리')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '업무 모드 변경' }))

    expect(screen.getByRole('dialog', { name: '업무 모드 선택' })).toBeInTheDocument()
  })

  it('확인 모달에서 로그아웃을 확정하면 logout을 호출한다', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderAppLayout(logout)

    await user.click(screen.getByRole('button', { name: /로그아웃/ }))
    await user.click(screen.getByRole('dialog').querySelector('button.button:not(.secondary)') as HTMLButtonElement)

    expect(logout).toHaveBeenCalled()
  })

  it('확인 모달에서 취소하면 logout을 호출하지 않는다', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderAppLayout(logout)

    await user.click(screen.getByRole('button', { name: /로그아웃/ }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
  })

  it('계정 관리자 모드에는 직원 관리 메뉴를 보여준다', () => {
    render(
      <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: actorModeIds.accountAdministrator, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>page content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('link', { name: /직원 관리/ })).toHaveAttribute('href', '/employees')
    expect(screen.getByRole('link', { name: /role 관리/ })).toHaveAttribute('href', '/roles')
    expect(screen.getByRole('link', { name: /시스템 클라이언트/ })).toHaveAttribute('href', '/system-clients')
    expect(screen.getByRole('link', { name: /owner 양도/ })).toHaveAttribute('href', '/owner')
    expect(screen.getByRole('link', { name: /감사 로그/ })).toHaveAttribute('href', '/audit-logs')
    expect(screen.queryByRole('link', { name: /재고 현황/ })).not.toBeInTheDocument()
  })

  it('원자재·재고 관리 모드에는 대시보드, 원자재, 재고 현황, 대사 보정 메뉴만 보여주고 창고 업무 메뉴는 없다', () => {
    render(
      <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: actorModeIds.inventoryManager, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
        <MemoryRouter initialEntries={['/']}>
          <Routes>
            <Route element={<AppLayout />}>
              <Route index element={<div>page content</div>} />
            </Route>
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByRole('link', { name: /원자재/ })).toHaveAttribute('href', '/materials')
    expect(screen.getByRole('link', { name: /재고 현황/ })).toHaveAttribute('href', '/stock')
    expect(screen.getByRole('link', { name: /대사 보정/ })).toHaveAttribute('href', '/reconciliations')
    expect(screen.getByRole('link', { name: /대시보드/ })).toHaveAttribute('href', '/')
    expect(screen.queryByRole('link', { name: /창고 평면도/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /입고 관리/ })).not.toBeInTheDocument()
    expect(screen.getByText('원자재·재고', { selector: 'strong' })).toBeInTheDocument()
  })

  describe('내 계정 메뉴', () => {
    const modes = [actorModeIds.accountAdministrator, actorModeIds.warehouseManager, actorModeIds.inventoryManager, actorModeIds.merchandiser]

    function renderWith(mode: (typeof modes)[number] | null, { can = () => true as boolean, path = '/' }: { can?: () => boolean; path?: string } = {}) {
      return render(
        <AuthContext.Provider value={{ user: stubUser, isLoading: false, activeActorMode: mode, can, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
          <MemoryRouter initialEntries={[path]}>
            <Routes>
              <Route element={<AppLayout />}>
                <Route index element={<div>page content</div>} />
                <Route path="account" element={<div>account page</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>,
      )
    }

    it.each(modes)('%s 모드에서도 메뉴 아래에 내 계정이 있고 /account로 연결된다', (mode) => {
      renderWith(mode)

      const nav = screen.getByRole('navigation', { name: '개인' })
      expect(within(nav).getByRole('link', { name: '내 계정' })).toHaveAttribute('href', '/account')
    })

    it('권한이 하나도 없어도 보이고 잠김 표시가 없다', () => {
      renderWith(actorModeIds.accountAdministrator, { can: () => false })

      const link = within(screen.getByRole('navigation', { name: '개인' })).getByRole('link', { name: '내 계정' })
      expect(link).toHaveAttribute('href', '/account')
      expect(link).not.toHaveTextContent('잠김')
    })

    it('업무 메뉴와 따로 두어 업무 메뉴 목록에는 들어 있지 않다', () => {
      renderWith(actorModeIds.accountAdministrator)

      const workNav = screen.getAllByRole('navigation').find((nav) => !nav.classList.contains('account-nav'))!
      expect(within(workNav).queryByRole('link', { name: '내 계정' })).not.toBeInTheDocument()
    })

    it('내 계정 화면에서는 메뉴가 활성 표시가 된다', () => {
      renderWith(actorModeIds.accountAdministrator, { path: '/account' })

      expect(within(screen.getByRole('navigation', { name: '개인' })).getByRole('link', { name: '내 계정' })).toHaveClass('active')
    })

    it('업무 모드를 아직 고르지 않았다면 메뉴를 보여주지 않는다', () => {
      renderWith(null)

      expect(screen.queryByRole('navigation', { name: '개인' })).not.toBeInTheDocument()
    })

    it('사이드바를 접으면 내 계정 메뉴에 툴팁(title)이 붙는다', async () => {
      const user = userEvent.setup()
      renderWith(actorModeIds.accountAdministrator)
      const link = () => within(screen.getByRole('navigation', { name: '개인' })).getByRole('link', { name: '내 계정' })
      expect(link()).not.toHaveAttribute('title')

      await user.click(screen.getByRole('button', { name: '사이드바 접기' }))

      expect(link()).toHaveAttribute('title', '내 계정')
    })

    it('사용자 이름 링크도 그대로 내 계정으로 간다', () => {
      renderWith(actorModeIds.accountAdministrator)

      expect(screen.getByRole('link', { name: '테스트 사용자' })).toHaveAttribute('href', '/account')
    })
  })
})
