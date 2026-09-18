import { render, screen } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { AuthContext, type AuthContextValue } from '../model/authContext'
import { permissions } from '../model/permissions'
import { PermissionGate } from './PermissionGate'

const stubUser: AuthContextValue['user'] = {
  id: 'user-test',
  name: '테스트 사용자',
  permissions: [],
  scope: { warehouseIds: [] },
}

function renderGate(can: AuthContextValue['can'], fallback?: ReactNode) {
  return render(
    <AuthContext.Provider value={{ user: stubUser, can }}>
      <PermissionGate permission={permissions.catalogWrite} fallback={fallback}>
        <div>gated content</div>
      </PermissionGate>
    </AuthContext.Provider>,
  )
}

describe('PermissionGate', () => {
  it('권한이 있으면 children을 렌더링한다', () => {
    renderGate(() => true)

    expect(screen.getByText('gated content')).toBeInTheDocument()
  })

  it('권한이 없고 fallback이 없으면 아무것도 렌더링하지 않는다', () => {
    renderGate(() => false)

    expect(screen.queryByText('gated content')).not.toBeInTheDocument()
  })

  it('권한이 없으면 fallback을 렌더링한다', () => {
    renderGate(() => false, <div>fallback content</div>)

    expect(screen.queryByText('gated content')).not.toBeInTheDocument()
    expect(screen.getByText('fallback content')).toBeInTheDocument()
  })
})
