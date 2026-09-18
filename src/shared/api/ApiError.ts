export type ApiErrorOptions = {
  status: number | null
  code?: string
  cause?: unknown
}

/**
 * httpClient를 거치는 모든 요청 실패(네트워크 에러, 4xx, 5xx)가 공통으로 변환되는 에러 타입.
 * status가 null이면 서버 응답 자체를 받지 못한 경우(네트워크 단절, 타임아웃 등)다.
 */
export class ApiError extends Error {
  readonly status: number | null
  readonly code?: string

  constructor(message: string, { status, code, cause }: ApiErrorOptions) {
    super(message, { cause })
    this.name = 'ApiError'
    this.status = status
    this.code = code
  }
}
