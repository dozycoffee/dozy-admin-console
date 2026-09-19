import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../model/authContext'
import { RequireAuth } from './RequireAuth'

const stubUser: AuthContextValue['user'] = {
  id: 'user-test',
  name: '테스트 사용자',
  permissions: [],
  scope: { warehouseIds: [] },
}

function renderRequireAuth(value: Pick<AuthContextValue, 'user' | 'isLoading'>) {
  return render(
    <AuthContext.Provider value={{ ...value, can: () => true, login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route element={<RequireAuth />}>
            <Route path="/" element={<div>protected content</div>} />
          </Route>
          <Route path="/login" element={<div>login page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequireAuth', () => {
  it('인증 확인 중이면 로딩 문구를 보여준다', () => {
    renderRequireAuth({ user: null, isLoading: true })

    expect(screen.getByText('인증 확인 중입니다...')).toBeInTheDocument()
    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
  })

  it('인증되지 않았으면 /login으로 리다이렉트한다', () => {
    renderRequireAuth({ user: null, isLoading: false })

    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.getByText('login page')).toBeInTheDocument()
  })

  it('인증되었으면 하위 라우트를 렌더링한다', () => {
    renderRequireAuth({ user: stubUser, isLoading: false })

    expect(screen.getByText('protected content')).toBeInTheDocument()
  })
})
