import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { AuthProvider } from './AuthProvider'
import { permissions, type Permission } from './permissions'
import { useAuth } from './useAuth'

function PermissionProbe({ permission }: { permission: Permission }) {
  const { can } = useAuth()
  return <span>{can(permission) ? 'allowed' : 'denied'}</span>
}

describe('AuthProvider', () => {
  it('mockUser가 가진 권한에는 true를 반환한다', () => {
    render(
      <AuthProvider>
        <PermissionProbe permission={permissions.dashboardRead} />
      </AuthProvider>,
    )

    expect(screen.getByText('allowed')).toBeInTheDocument()
  })

  it('mockUser가 갖지 않은 권한에는 false를 반환한다', () => {
    render(
      <AuthProvider>
        <PermissionProbe permission={permissions.usersManage} />
      </AuthProvider>,
    )

    expect(screen.getByText('denied')).toBeInTheDocument()
  })
})
