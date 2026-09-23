import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { AppLayout } from './AppLayout'

const stubUser: AuthContextValue['user'] = {
  id: 'user-test',
  name: '테스트 사용자',
  permissions: [],
  scope: { warehouseIds: [1, 2] },
}

function renderAppLayout(logout: () => void) {
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, can: () => true, login: vi.fn(), logout }}>
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

  it('로그아웃 버튼을 누르면 바로 로그아웃하지 않고 확인 모달을 띄운다', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderAppLayout(logout)

    await user.click(screen.getByRole('button', { name: /로그아웃/ }))

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(logout).not.toHaveBeenCalled()
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
})
