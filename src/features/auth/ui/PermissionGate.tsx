import type { PropsWithChildren, ReactNode } from 'react'
import { useAuth } from '../model/useAuth'
import type { Permission } from '../model/permissions'

type Props = PropsWithChildren<{ permission: Permission; fallback?: ReactNode }>

export function PermissionGate({ permission, fallback = null, children }: Props) {
  return useAuth().can(permission) ? children : fallback
}
