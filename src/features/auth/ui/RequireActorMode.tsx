import type { ReactNode } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import type { ActorModeId } from '../model/actorModes'
import { useAuth } from '../model/useAuth'

type RequireActorModeProps = {
  allowedModes?: readonly ActorModeId[]
  children?: ReactNode
}

export function RequireActorMode({ allowedModes, children }: RequireActorModeProps) {
  const { user, activeActorMode } = useAuth()
  const location = useLocation()

  if (!activeActorMode || !user?.actorModes.includes(activeActorMode)) {
    return <Navigate to="/select-mode" replace state={{ from: location }} />
  }

  if (allowedModes && !allowedModes.includes(activeActorMode)) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}
