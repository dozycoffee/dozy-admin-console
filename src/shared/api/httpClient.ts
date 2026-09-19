import axios from 'axios'
import { ApiError } from './ApiError'
import { getAccessToken } from './authToken'

export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  timeout: 10_000,
  headers: { 'Content-Type': 'application/json' },
})

httpClient.interceptors.request.use((config) => {
  const accessToken = getAccessToken()
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`
  }
  return config
})

httpClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
)

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
  const code = getField(data, 'code')
  return typeof code === 'string' ? code : undefined
}

function getField(data: unknown, field: string): unknown {
  if (data && typeof data === 'object' && field in data) {
    return (data as Record<string, unknown>)[field]
  }
  return undefined
}
