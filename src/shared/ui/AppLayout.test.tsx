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
  it('사용자 이름과 접근 가능한 창고 수를 보여준다', () => {
    renderAppLayout(vi.fn())

    expect(screen.getByText('테스트 사용자')).toBeInTheDocument()
    expect(screen.getByText('접근 가능 창고 2곳')).toBeInTheDocument()
  })

  it('로그아웃 버튼을 클릭하면 logout을 호출한다', async () => {
    const logout = vi.fn()
    const user = userEvent.setup()
    renderAppLayout(logout)

    await user.click(screen.getByText('로그아웃'))

    expect(logout).toHaveBeenCalled()
  })
})
