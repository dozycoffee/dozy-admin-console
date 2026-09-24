import { isActorModeId, type ActorModeId } from './actorModes'

const ACTIVE_ACTOR_MODE_KEY = 'dozy-admin-console:activeActorMode'

export function getActiveActorMode(): ActorModeId | null {
  const storedMode = sessionStorage.getItem(ACTIVE_ACTOR_MODE_KEY)
  if (!storedMode) return null

  if (!isActorModeId(storedMode)) {
    sessionStorage.removeItem(ACTIVE_ACTOR_MODE_KEY)
    return null
  }

  return storedMode
}

export function setActiveActorMode(modeId: ActorModeId) {
  sessionStorage.setItem(ACTIVE_ACTOR_MODE_KEY, modeId)
}

export function clearActiveActorMode() {
  sessionStorage.removeItem(ACTIVE_ACTOR_MODE_KEY)
}
