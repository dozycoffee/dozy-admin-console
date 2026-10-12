import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useState, type PropsWithChildren } from 'react'
import { clearAccessToken, setAccessToken } from '../../../shared/api/authToken'
import { configureTokenRefresh } from '../../../shared/api/httpClient'
import { fetchCurrentUser, loginRequest, logoutRequest, refreshAccessToken, restoreSession } from './authApi'
import { clearActiveActorMode, getActiveActorMode, setActiveActorMode } from './actorModeSession'
import type { ActorModeId } from './actorModes'
import { AuthContext } from './authContext'
import type { CurrentUser, Permission } from './permissions'

const meQueryKey = ['auth', 'me'] as const

export function AuthProvider({ children }: PropsWithChildren) {
  const [activeActorMode, setActiveActorModeState] = useState<ActorModeId | null>(() => getActiveActorMode())
  const queryClient = useQueryClient()

  // 앱을 열 때 refresh 쿠키로 이전 세션을 복원한다. 복원할 세션이 없으면 data는 null(로그아웃 상태)이다.
  const meQuery = useQuery({
    queryKey: meQueryKey,
    queryFn: restoreSession,
    retry: false,
    staleTime: Infinity,
  })

  const loginMutation = useMutation({
    mutationFn: async ({ email, password }: { email: string; password: string }): Promise<CurrentUser> => {
      // 앱 시작 시 세션 복원이 아직 진행 중이면 그 결과가 로그인 결과를 덮어쓰지 못하게 한다.
      await queryClient.cancelQueries({ queryKey: meQueryKey })
      const { accessToken } = await loginRequest(email, password)
      setAccessToken(accessToken)
      try {
        return await fetchCurrentUser()
      } catch (error) {
        clearAccessToken()
        throw error
      }
    },
    onSuccess: (user) => queryClient.setQueryData(meQueryKey, user),
  })

  async function login(email: string, password: string) {
    clearActorMode()
    await loginMutation.mutateAsync({ email, password })
  }

  // 서버 세션과 무관하게 이 브라우저의 로그인 상태(토큰, 선택한 모드, 이전 사용자의 업무 데이터 캐시)를 지운다.
  const endLocalSession = useCallback(() => {
    clearActiveActorMode()
    setActiveActorModeState(null)
    clearAccessToken()
    queryClient.setQueryData(meQueryKey, null)
    queryClient.removeQueries({ predicate: (query) => query.queryKey[0] !== 'auth' })
  }, [queryClient])

  function logout() {
    // refresh 세션 폐기와 쿠키 삭제는 서버가 한다. 실패해도 이 브라우저는 로그아웃한다.
    logoutRequest().catch(() => undefined)
    endLocalSession()
  }

  // access token이 만료돼 업무 API가 401을 주면 httpClient가 갱신 후 재시도하고,
  // 갱신까지 실패하면(세션 만료·폐기) 로그아웃 상태로 되돌린다.
  useEffect(() => {
    configureTokenRefresh({ refresh: refreshAccessToken, onSessionLost: endLocalSession })
    return () => configureTokenRefresh(null)
  }, [endLocalSession])

  const user = meQuery.data ?? null
  const isLoading = meQuery.isPending
  const can = (permission: Permission) => user?.permissions.includes(permission) ?? false

  useEffect(() => {
    if (!isLoading && activeActorMode && !user?.actorModes.includes(activeActorMode)) {
      clearActiveActorMode()
      // 복원할 세션이 없거나 저장된 선택이 서버의 최신 허용 모드와 다를 때 로컬 상태를 서버 판정에 맞춘다.
      // oxlint-disable-next-line react/set-state-in-effect
      setActiveActorModeState(null)
    }
  }, [activeActorMode, isLoading, user])

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
