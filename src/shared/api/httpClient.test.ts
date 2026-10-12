import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from './ApiError'
import { clearAccessToken, setAccessToken } from './authToken'
import { authHttpClient, configureTokenRefresh, httpClient, toApiError } from './httpClient'

function buildResponseError(data: unknown, status: number): AxiosError {
  const response = { status, data, statusText: '', headers: {}, config: {} } as unknown as AxiosResponse
  return new AxiosError('Request failed', 'ERR_BAD_REQUEST', undefined, undefined, response)
}

describe('toApiError', () => {
  it('서버가 message/code를 내려주면 그대로 보존한다', () => {
    const error = buildResponseError({ message: '상품을 찾을 수 없습니다.', code: 'NOT_FOUND' }, 404)

    const result = toApiError(error)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.status).toBe(404)
    expect(result.message).toBe('상품을 찾을 수 없습니다.')
    expect(result.code).toBe('NOT_FOUND')
  })

  it('dozy-wms-api처럼 errorCode로 내려주는 코드도 보존한다', () => {
    const result = toApiError(buildResponseError({ message: '존재하지 않는 창고입니다.', errorCode: 'WAREHOUSE_NOT_FOUND' }, 404))

    expect(result.code).toBe('WAREHOUSE_NOT_FOUND')
  })

  it('서버 응답에 message가 없으면 status를 포함한 기본 메시지로 대체한다', () => {
    const error = buildResponseError({}, 500)

    const result = toApiError(error)

    expect(result.status).toBe(500)
    expect(result.message).toBe('요청이 실패했습니다. (status 500)')
    expect(result.code).toBeUndefined()
  })

  it('응답 없이 요청만 있으면(네트워크 에러) status는 null이다', () => {
    const error = new AxiosError('Network Error', 'ERR_NETWORK', undefined, {})

    const result = toApiError(error)

    expect(result.status).toBeNull()
    expect(result.message).toBe('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')
  })

  it('axios 에러가 아닌 경우에도 ApiError로 변환한다', () => {
    const original = new Error('boom')

    const result = toApiError(original)

    expect(result).toBeInstanceOf(ApiError)
    expect(result.status).toBeNull()
    expect(result.cause).toBe(original)
  })
})

describe('httpClient 요청 인터셉터', () => {
  afterEach(() => clearAccessToken())

  function requestWithEchoedHeaders() {
    return httpClient.get('/ping', {
      adapter: async (config) => ({ data: config.headers, status: 200, statusText: 'OK', headers: {}, config }),
    })
  }

  it('accessToken이 있으면 Authorization 헤더를 붙인다', async () => {
    setAccessToken('test-token')

    const response = await requestWithEchoedHeaders()

    expect(response.data.Authorization).toBe('Bearer test-token')
  })

  it('accessToken이 없으면 Authorization 헤더를 붙이지 않는다', async () => {
    const response = await requestWithEchoedHeaders()

    expect(response.data.Authorization).toBeUndefined()
  })
})

describe('toApiError (dozy-auth Problem Details)', () => {
  it('RFC 9457 응답의 code를 보존한다', () => {
    const result = toApiError(buildResponseError({ type: 'x', title: 'Invalid credentials', status: 401, code: 'INVALID_CREDENTIALS', traceId: 't' }, 401))

    expect(result.code).toBe('INVALID_CREDENTIALS')
    expect(result.message).toBe('요청이 실패했습니다. (status 401)')
  })
})

describe('authHttpClient', () => {
  it('refresh 쿠키를 주고받도록 credentials를 포함한다', () => {
    expect(authHttpClient.defaults.withCredentials).toBe(true)
    expect(httpClient.defaults.withCredentials).toBeFalsy()
  })
})

describe('access token 만료 시 자동 갱신', () => {
  afterEach(() => {
    configureTokenRefresh(null)
    clearAccessToken()
  })

  /** 첫 호출은 expired 응답을, 이후 호출은 성공 응답을 주는 adapter. 받은 Authorization 헤더를 기록한다. */
  function adapterReturning(first: { status: number; data: unknown }) {
    const seen: Array<string | undefined> = []
    const adapter = vi.fn(async (config) => {
      seen.push(config.headers.Authorization as string | undefined)
      if (seen.length === 1) {
        throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { ...first, statusText: '', headers: {}, config } as AxiosResponse)
      }
      return { data: 'ok', status: 200, statusText: 'OK', headers: {}, config }
    })
    return { adapter, seen }
  }

  it('401 UNAUTHENTICATED면 토큰을 갱신하고 새 토큰으로 한 번 재시도한다', async () => {
    setAccessToken('expired')
    const refresh = vi.fn(async () => {
      setAccessToken('fresh')
      return 'fresh'
    })
    configureTokenRefresh({ refresh, onSessionLost: vi.fn() })
    const { adapter, seen } = adapterReturning({ status: 401, data: { code: 'UNAUTHENTICATED' } })

    const response = await httpClient.get('/ping', { adapter })

    expect(response.data).toBe('ok')
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(seen).toEqual(['Bearer expired', 'Bearer fresh'])
  })

  it('갱신에 실패하면 세션 만료를 알리고 원래 에러를 던진다', async () => {
    setAccessToken('expired')
    const onSessionLost = vi.fn()
    configureTokenRefresh({ refresh: vi.fn().mockRejectedValue(new Error('session expired')), onSessionLost })
    const { adapter } = adapterReturning({ status: 401, data: { code: 'UNAUTHENTICATED' } })

    await expect(httpClient.get('/ping', { adapter })).rejects.toMatchObject({ status: 401, code: 'UNAUTHENTICATED' })

    expect(onSessionLost).toHaveBeenCalledTimes(1)
  })

  it('재시도도 401이면 다시 갱신하지 않고 에러를 던진다', async () => {
    setAccessToken('expired')
    const refresh = vi.fn().mockResolvedValue('fresh')
    configureTokenRefresh({ refresh, onSessionLost: vi.fn() })
    const adapter = vi.fn(async (config) => {
      throw new AxiosError('failed', 'ERR_BAD_REQUEST', config, {}, { status: 401, data: { code: 'UNAUTHENTICATED' }, statusText: '', headers: {}, config } as AxiosResponse)
    })

    await expect(httpClient.get('/ping', { adapter })).rejects.toBeInstanceOf(ApiError)

    expect(refresh).toHaveBeenCalledTimes(1)
    expect(adapter).toHaveBeenCalledTimes(2)
  })

  it('UNAUTHENTICATED가 아닌 401(로그인 실패 등)은 갱신하지 않는다', async () => {
    setAccessToken('token')
    const refresh = vi.fn()
    configureTokenRefresh({ refresh, onSessionLost: vi.fn() })
    const { adapter } = adapterReturning({ status: 401, data: { code: 'INVALID_CREDENTIALS' } })

    await expect(httpClient.get('/ping', { adapter })).rejects.toMatchObject({ code: 'INVALID_CREDENTIALS' })

    expect(refresh).not.toHaveBeenCalled()
  })

  it('토큰 없이 보낸 요청의 401은 갱신하지 않는다', async () => {
    const refresh = vi.fn()
    configureTokenRefresh({ refresh, onSessionLost: vi.fn() })
    const { adapter } = adapterReturning({ status: 401, data: { code: 'UNAUTHENTICATED' } })

    await expect(httpClient.get('/ping', { adapter })).rejects.toBeInstanceOf(ApiError)

    expect(refresh).not.toHaveBeenCalled()
  })

  it('갱신 로직이 연결되지 않았으면 그대로 에러를 던진다', async () => {
    setAccessToken('expired')
    const { adapter } = adapterReturning({ status: 401, data: { code: 'UNAUTHENTICATED' } })

    await expect(httpClient.get('/ping', { adapter })).rejects.toMatchObject({ status: 401 })
  })

  it('401이 아닌 에러는 갱신하지 않는다', async () => {
    setAccessToken('token')
    const refresh = vi.fn()
    configureTokenRefresh({ refresh, onSessionLost: vi.fn() })
    const { adapter } = adapterReturning({ status: 500, data: {} })

    await expect(httpClient.get('/ping', { adapter })).rejects.toMatchObject({ status: 500 })

    expect(refresh).not.toHaveBeenCalled()
  })
})
