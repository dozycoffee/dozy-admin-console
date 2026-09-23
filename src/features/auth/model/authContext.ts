import { createContext } from 'react'
import type { ActorModeId } from './actorModes'
import type { CurrentUser, Permission } from './permissions'

export type AuthContextValue = {
  user: CurrentUser | null
  isLoading: boolean
  activeActorMode: ActorModeId | null
  can: (permission: Permission) => boolean
  selectActorMode: (modeId: ActorModeId) => boolean
  clearActorMode: () => void
  login: (username: string, password: string) => Promise<void>
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)
