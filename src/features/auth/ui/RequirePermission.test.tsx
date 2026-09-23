import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AuthContext, type AuthContextValue } from '../model/authContext'
import { permissions } from '../model/permissions'
import { RequirePermission } from './RequirePermission'

const stubUser: AuthContextValue['user'] = {
  id: 'user-test',
  name: '테스트 사용자',
  permissions: [],
  scope: { warehouseIds: [] },
}

function renderProtectedRoute(can: AuthContextValue['can']) {
  return render(
    <AuthContext.Provider value={{ user: stubUser, isLoading: false, can, login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter initialEntries={['/']}>
        <Routes>
          <Route
            path="/"
            element={
              <RequirePermission permission={permissions.inventoryRead}>
                <div>protected content</div>
              </RequirePermission>
            }
          />
          <Route path="/access-denied" element={<div>access denied page</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )
}

describe('RequirePermission', () => {
  it('권한이 있으면 children을 렌더링한다', () => {
    renderProtectedRoute(() => true)

    expect(screen.getByText('protected content')).toBeInTheDocument()
  })

  it('권한이 없으면 /access-denied로 리다이렉트한다', () => {
    renderProtectedRoute(() => false)

    expect(screen.queryByText('protected content')).not.toBeInTheDocument()
    expect(screen.getByText('access denied page')).toBeInTheDocument()
  })
})
