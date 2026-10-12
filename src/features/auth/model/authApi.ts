import { ApiError } from '../../../shared/api/ApiError'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../../shared/api/authToken'
import { authHttpClient } from '../../../shared/api/httpClient'
import { loginResponseSchema, meResponseSchema } from './authSchemas'
import type { CurrentUser } from './permissions'
import { buildCurrentUser, parseWarehouseIds } from './roleMapping'

// 콘솔은 직원용이라 internal realm만 쓴다.
const REALM_PATH = '/realms/internal'

export async function loginRequest(email: string, password: string) {
  const { data } = await authHttpClient.post(`${REALM_PATH}/login`, { email, password })
  return loginResponseSchema.parse(data)
}

async function requestTokenRefresh(): Promise<string> {
  try {
    const { data } = await authHttpClient.post(`${REALM_PATH}/token/refresh`)
    return loginResponseSchema.parse(data).accessToken
  } catch (error) {
    // 동시에 들어온 갱신 요청이 방금 쿠키를 교체한 경우다. 한 번만 다시 시도한다.
    if (error instanceof ApiError && error.code === 'TOKEN_ROTATED') {
      const { data } = await authHttpClient.post(`${REALM_PATH}/token/refresh`)
      return loginResponseSchema.parse(data).accessToken
    }
    throw error
  }
}

let inflightRefresh: Promise<string> | null = null

/**
 * refresh 쿠키로 새 access token을 발급받아 메모리에 저장한다.
 * refresh token은 교체형이라 같은 쿠키로 동시에 갱신하면 재사용으로 오인될 수 있어 한 번에 하나만 보낸다.
 */
export function refreshAccessToken(): Promise<string> {
  inflightRefresh ??= requestTokenRefresh()
    .then((accessToken) => {
      setAccessToken(accessToken)
      return accessToken
    })
    .finally(() => {
      inflightRefresh = null
    })
  return inflightRefresh
}

export async function logoutRequest() {
  await authHttpClient.post(`${REALM_PATH}/logout`)
}

export async function fetchCurrentUser(): Promise<CurrentUser> {
  const { data } = await authHttpClient.get(`${REALM_PATH}/me`)
  return buildCurrentUser(meResponseSchema.parse(data), parseWarehouseIds(import.meta.env.VITE_WAREHOUSE_IDS))
}

/**
 * 앱을 열 때 이전 로그인을 이어간다. access token은 메모리에만 있어 새로고침하면 사라지므로
 * refresh 쿠키로 다시 발급받는다. 이어갈 세션이 없거나 실패하면 null(로그아웃 상태)이다.
 */
export async function restoreSession(): Promise<CurrentUser | null> {
  try {
    if (!getAccessToken()) await refreshAccessToken()
    return await fetchCurrentUser()
  } catch {
    clearAccessToken()
    return null
  }
}
