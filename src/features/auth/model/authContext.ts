import { createContext } from 'react'
import type { CurrentUser, Permission } from './permissions'

export type AuthContextValue = {
  user: CurrentUser | null
  isLoading: boolean
  can: (permission: Permission) => boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
