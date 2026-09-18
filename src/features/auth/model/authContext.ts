import { createContext } from 'react'
import type { CurrentUser, Permission } from './permissions'

export type AuthContextValue = {
  user: CurrentUser
  can: (permission: Permission) => boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)
