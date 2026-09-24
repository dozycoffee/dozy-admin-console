import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type PropsWithChildren } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../../shared/api/authToken'
import { fetchCurrentUser, loginRequest } from './authApi'
import { clearActiveActorMode, getActiveActorMode, setActiveActorMode } from './actorModeSession'
import type { ActorModeId } from './actorModes'
import { AuthContext } from './authContext'
import type { Permission } from './permissions'

export function AuthProvider({ children }: PropsWithChildren) {
  const [hasToken, setHasToken] = useState(() => getAccessToken() !== null)
  const [activeActorMode, setActiveActorModeState] = useState<ActorModeId | null>(() => getActiveActorMode())
  const queryClient = useQueryClient()

  const meQuery = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: fetchCurrentUser,
    enabled: hasToken,
    retry: false,
  })

  const loginMutation = useMutation({
    mutationFn: ({ username, password }: { username: string; password: string }) => loginRequest(username, password),
    onSuccess: (data) => {
      setAccessToken(data.accessToken)
      setHasToken(true)
    },
  })

  async function login(username: string, password: string) {
    clearActorMode()
    await loginMutation.mutateAsync({ username, password })
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }

  function logout() {
    clearActorMode()
    clearAccessToken()
    setHasToken(false)
    queryClient.removeQueries({ queryKey: ['auth', 'me'] })
  }

  // accessToken이 만료/무효화되어 /api/auth/me가 실패하면 로그아웃 상태로 되돌린다.
  // meQuery는 서버(외부 시스템)의 인가 판정 결과이고, 이 effect는 그 결과를 로컬 저장소(accessToken)에
  // 동기화하는 것이라 setState-in-effect 경고는 여기선 의도된 패턴이다.
  useEffect(() => {
    if (meQuery.isError) {
      clearActiveActorMode()
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveActorModeState(null)
      clearAccessToken()
      // oxlint-disable-next-line react/set-state-in-effect
      setHasToken(false)
    }
  }, [meQuery.isError])

  const user = meQuery.data ?? null
  const isLoading = hasToken && meQuery.isPending
  const can = (permission: Permission) => user?.permissions.includes(permission) ?? false

  useEffect(() => {
    if (user && activeActorMode && !user.actorModes.includes(activeActorMode)) {
      clearActiveActorMode()
      // 저장된 선택이 서버의 최신 허용 모드와 다를 때 로컬 상태를 서버 판정에 맞춘다.
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveActorModeState(null)
    }
  }, [activeActorMode, user])

  function selectActorMode(modeId: ActorModeId) {
    if (!user?.actorModes.includes(modeId)) return false
    setActiveActorMode(modeId)
    setActiveActorModeState(modeId)
    return true
  }

  function clearActorMode() {
    clearActiveActorMode()
    setActiveActorModeState(null)
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, activeActorMode, can, selectActorMode, clearActorMode, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}
