import axios, { type AxiosInstance, type InternalAxiosRequestConfig } from 'axios'
import { ApiError } from './ApiError'
import { getAccessToken } from './authToken'

type RetriableConfig = InternalAxiosRequestConfig & { _tokenRefreshed?: boolean }

type TokenRefreshHandlers = {
  /** 새 access token을 발급받아 반환한다. 실패하면 reject한다. */
  refresh: () => Promise<string>
  /** 갱신까지 실패해 세션을 더 이어갈 수 없을 때 호출한다. */
  onSessionLost: () => void
}

let tokenRefreshHandlers: TokenRefreshHandlers | null = null

/** AuthProvider가 access token 만료(401 UNAUTHENTICATED) 시 자동 갱신 로직을 연결한다. */
export function configureTokenRefresh(handlers: TokenRefreshHandlers | null): void {
  tokenRefreshHandlers = handlers
}

function createClient(baseURL: string | undefined, options: { withCredentials?: boolean } = {}): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 10_000,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: options.withCredentials,
  })

  client.interceptors.request.use((config) => {
    const accessToken = getAccessToken()
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`
    }
    return config
  })

  client.interceptors.response.use(
    (response) => response,
    async (error: unknown) => {
      const apiError = toApiError(error)
      if (axios.isAxiosError(error) && error.config && shouldRefreshToken(error.config, apiError)) {
        const config: RetriableConfig = error.config
        config._tokenRefreshed = true
        const handlers = tokenRefreshHandlers!
        let accessToken: string
        try {
          accessToken = await handlers.refresh()
        } catch {
          handlers.onSessionLost()
          throw apiError
        }
        config.headers.Authorization = `Bearer ${accessToken}`
        return client.request(config)
      }
      throw apiError
    },
  )

  return client
}

function shouldRefreshToken(config: RetriableConfig, apiError: ApiError): boolean {
  return (
    tokenRefreshHandlers !== null &&
    !config._tokenRefreshed &&
    apiError.status === 401 &&
    apiError.code === 'UNAUTHENTICATED' &&
    // 토큰 없이 보낸 요청의 401은 갱신할 대상이 없다.
    Boolean(config.headers.Authorization)
  )
}

/** 업무 API(dozy-wms-api 등) 호출용 클라이언트 */
export const httpClient = createClient(import.meta.env.VITE_API_BASE_URL)

/** dozy-auth 호출용 클라이언트. refresh 쿠키(HttpOnly)를 주고받으므로 credentials를 포함한다. */
export const authHttpClient = createClient(import.meta.env.VITE_AUTH_BASE_URL, { withCredentials: true })

/** dozy-catalog-api 호출용 클라이언트. Bearer 토큰만 받고 쿠키는 쓰지 않으므로 credentials를 포함하지 않는다. */
export const catalogHttpClient = createClient(import.meta.env.VITE_CATALOG_BASE_URL)

export function toApiError(error: unknown): ApiError {
  if (!axios.isAxiosError(error)) {
    return new ApiError('알 수 없는 오류가 발생했습니다.', { status: null, cause: error })
  }

  if (error.response) {
    const { status, data } = error.response
    return new ApiError(extractMessage(data) ?? `요청이 실패했습니다. (status ${status})`, {
      status,
      code: extractCode(data),
      cause: error,
    })
  }

  if (error.request) {
    return new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', {
      status: null,
      cause: error,
    })
  }

  return new ApiError(error.message || '요청 중 알 수 없는 오류가 발생했습니다.', {
    status: null,
    cause: error,
  })
}

function extractMessage(data: unknown): string | undefined {
  const message = getField(data, 'message')
  return typeof message === 'string' ? message : undefined
}

function extractCode(data: unknown): string | undefined {
  // dozy-wms-api는 에러 코드를 errorCode로, dozy-auth(RFC 9457 Problem Details)와 mock 서버는 code로 내려준다.
  const code = getField(data, 'errorCode') ?? getField(data, 'code')
  return typeof code === 'string' ? code : undefined
}

function getField(data: unknown, field: string): unknown {
  if (data && typeof data === 'object' && field in data) {
    return (data as Record<string, unknown>)[field]
  }
  return undefined
}
