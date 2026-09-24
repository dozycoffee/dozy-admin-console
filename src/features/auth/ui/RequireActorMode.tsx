import type { ReactNode } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { ActorModeId } from '../model/actorModes'
import { useAuth } from '../model/useAuth'

type RequireActorModeProps = {
  allowedModes?: readonly ActorModeId[]
  children?: ReactNode
}

export function RequireActorMode({ allowedModes, children }: RequireActorModeProps) {
  const { user, activeActorMode } = useAuth()
  if (!activeActorMode || !user?.actorModes.includes(activeActorMode)) {
    return <Navigate to="/" replace />
  }

  if (allowedModes && !allowedModes.includes(activeActorMode)) {
    return <Navigate to="/" replace />
  }

  return children ?? <Outlet />
}
