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

/**
 * 응답을 받지 못했거나(네트워크 단절, 타임아웃) 서버가 5xx를 준 실패. 업무 상태와 무관해 잠시 뒤 다시 시도하면 되므로 오래 읽거나 조치할 필요가 없어
 * 토스트로 알려도 된다. 4xx(이미 처리됨, 수량 부족 등)는 읽고 조치해야 하므로 화면에 남긴다.
 */
export function isTransientApiError(error: unknown): boolean {
  return error instanceof ApiError && (error.status === null || error.status >= 500)
}

