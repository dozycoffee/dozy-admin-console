import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { clearAccessToken, getAccessToken, setAccessToken } from '../../../shared/api/authToken'
import { authHttpClient } from '../../../shared/api/httpClient'
import { actorModeIds } from './actorModes'
import { fetchCurrentUser, loginRequest, logoutRequest, refreshAccessToken, restoreSession } from './authApi'

const me = { principalType: 'employee', principalId: 'p-1', name: '김도윤', email: 'kim@dozycoffee.com', roles: ['wms:warehouse_manager'] }
const tokenResponse = { accessToken: 'new-token', tokenType: 'Bearer', expiresIn: 600 }

beforeEach(() => {
  vi.stubEnv('VITE_WAREHOUSE_IDS', '7')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
  clearAccessToken()
})

describe('loginRequest', () => {
  it('internal realm 로그인에 이메일과 비밀번호를 보내고 응답을 zod로 검증해 반환한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: tokenResponse })

    const result = await loginRequest('kim@dozycoffee.com', 'pw')

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/login', { email: 'kim@dozycoffee.com', password: 'pw' })
    expect(result).toEqual({ accessToken: 'new-token' })
  })
})

describe('fetchCurrentUser', () => {
  it('내 정보를 조회해 role을 모드·권한·창고 범위로 바꾼다', async () => {
    const getSpy = vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: me })

    const user = await fetchCurrentUser()

    expect(getSpy).toHaveBeenCalledWith('/realms/internal/me')
    expect(user.id).toBe('p-1')
    expect(user.actorModes).toEqual([actorModeIds.warehouseManager])
    expect(user.scope.warehouseIds).toEqual([7])
  })
})

describe('logoutRequest', () => {
  it('internal realm 로그아웃을 요청한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: undefined })

    await logoutRequest()

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/logout')
  })
})

describe('refreshAccessToken', () => {
  it('refresh 쿠키로 새 토큰을 받아 메모리에 저장한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: tokenResponse })

    await expect(refreshAccessToken()).resolves.toBe('new-token')

    expect(postSpy).toHaveBeenCalledWith('/realms/internal/token/refresh')
    expect(getAccessToken()).toBe('new-token')
  })

  it('동시에 호출해도 서버에는 한 번만 요청한다', async () => {
    const postSpy = vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: tokenResponse })

    await Promise.all([refreshAccessToken(), refreshAccessToken()])

    expect(postSpy).toHaveBeenCalledTimes(1)
  })

  it('TOKEN_ROTATED면 한 번만 다시 시도한다', async () => {
    const postSpy = vi
      .spyOn(authHttpClient, 'post')
      .mockRejectedValueOnce(new ApiError('rotated', { status: 409, code: 'TOKEN_ROTATED' }))
      .mockResolvedValueOnce({ data: tokenResponse })

    await expect(refreshAccessToken()).resolves.toBe('new-token')

    expect(postSpy).toHaveBeenCalledTimes(2)
  })

  it('TOKEN_ROTATED가 반복되면 두 번째 에러를 그대로 던진다', async () => {
    const rotated = new ApiError('rotated', { status: 409, code: 'TOKEN_ROTATED' })
    const postSpy = vi.spyOn(authHttpClient, 'post').mockRejectedValue(rotated)

    await expect(refreshAccessToken()).rejects.toBe(rotated)

    expect(postSpy).toHaveBeenCalledTimes(2)
  })

  it('SESSION_EXPIRED 같은 다른 에러는 재시도하지 않고 던진다', async () => {
    const expired = new ApiError('expired', { status: 401, code: 'SESSION_EXPIRED' })
    const postSpy = vi.spyOn(authHttpClient, 'post').mockRejectedValue(expired)

    await expect(refreshAccessToken()).rejects.toBe(expired)

    expect(postSpy).toHaveBeenCalledTimes(1)
  })
})

describe('restoreSession', () => {
  it('메모리에 토큰이 없으면 refresh 쿠키로 갱신한 뒤 내 정보를 반환한다', async () => {
    vi.spyOn(authHttpClient, 'post').mockResolvedValue({ data: tokenResponse })
    vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: me })

    const user = await restoreSession()

    expect(user?.name).toBe('김도윤')
    expect(getAccessToken()).toBe('new-token')
  })

  it('이미 토큰이 있으면 갱신 없이 내 정보만 조회한다', async () => {
    setAccessToken('existing')
    const postSpy = vi.spyOn(authHttpClient, 'post')
    vi.spyOn(authHttpClient, 'get').mockResolvedValue({ data: me })

    await restoreSession()

    expect(postSpy).not.toHaveBeenCalled()
  })

  it('복원할 세션이 없으면 토큰을 지우고 null을 반환한다', async () => {
    vi.spyOn(authHttpClient, 'post').mockRejectedValue(new ApiError('expired', { status: 401, code: 'SESSION_EXPIRED' }))

    await expect(restoreSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })

  it('내 정보 조회가 실패하면 토큰을 지우고 null을 반환한다', async () => {
    setAccessToken('existing')
    vi.spyOn(authHttpClient, 'get').mockRejectedValue(new ApiError('unauthenticated', { status: 401, code: 'UNAUTHENTICATED' }))

    await expect(restoreSession()).resolves.toBeNull()
    expect(getAccessToken()).toBeNull()
  })
})
