import type { CurrentUser } from './permissions'
import { useAuth } from './useAuth'

/** RequireAuth로 보호된 라우트 안에서만 사용한다 — user가 보장되지 않는 곳(예: LoginPage)에서는 useAuth()를 직접 쓴다. */
export function useCurrentUser(): CurrentUser {
  const { user } = useAuth()
  if (!user) {
    throw new Error('useCurrentUser는 인증된 사용자가 보장되는 RequireAuth 하위 라우트에서만 사용할 수 있습니다.')
  }
  return user
}
