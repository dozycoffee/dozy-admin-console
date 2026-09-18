import { AxiosError } from 'axios'
import type { AxiosResponse } from 'axios'
import { describe, expect, it } from 'vitest'
import { ApiError } from './ApiError'
import { toApiError } from './httpClient'

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
