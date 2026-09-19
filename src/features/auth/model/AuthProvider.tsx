import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useState, type PropsWithChildren } from 'react'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../../shared/api/authToken'
import { fetchCurrentUser, loginRequest } from './authApi'
import { AuthContext } from './authContext'
import type { Permission } from './permissions'

export function AuthProvider({ children }: PropsWithChildren) {
  const [hasToken, setHasToken] = useState(() => getAccessToken() !== null)
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
    await loginMutation.mutateAsync({ username, password })
    await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
  }

  function logout() {
    clearAccessToken()
    setHasToken(false)
    queryClient.removeQueries({ queryKey: ['auth', 'me'] })
  }

  // accessToken이 만료/무효화되어 /api/auth/me가 실패하면 로그아웃 상태로 되돌린다.
  // meQuery는 서버(외부 시스템)의 인가 판정 결과이고, 이 effect는 그 결과를 로컬 저장소(accessToken)에
  // 동기화하는 것이라 setState-in-effect 경고는 여기선 의도된 패턴이다.
  useEffect(() => {
    if (meQuery.isError) {
      clearAccessToken()
      // oxlint-disable-next-line react/set-state-in-effect
      setHasToken(false)
    }
  }, [meQuery.isError])

  const user = meQuery.data ?? null
  const isLoading = hasToken && meQuery.isPending
  const can = (permission: Permission) => user?.permissions.includes(permission) ?? false

  return <AuthContext.Provider value={{ user, isLoading, can, login, logout }}>{children}</AuthContext.Provider>
}
