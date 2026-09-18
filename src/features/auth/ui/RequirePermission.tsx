import { Navigate, useLocation } from 'react-router-dom'
import type { PropsWithChildren } from 'react'
import { useAuth } from '../model/useAuth'
import type { Permission } from '../model/permissions'

export function RequirePermission({ permission, children }: PropsWithChildren<{ permission: Permission }>) {
  const { can } = useAuth()
  const location = useLocation()
  if (!can(permission)) {
    return <Navigate to="/access-denied" replace state={{ from: location.pathname, permission }} />
  }
  return children
}
