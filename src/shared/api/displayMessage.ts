import { ZodError } from 'zod'

export const RESPONSE_SHAPE_MESSAGE = '서버 응답의 형식이 화면이 기대하는 것과 달라 표시할 수 없습니다. 서버와 콘솔의 버전이 맞는지 확인해 주세요.'

/**
 * 화면에 보여줄 오류 문구. 서버 응답이 스키마와 맞지 않아 생기는 검증 오류(ZodError)는 메시지가 오류 목록 JSON이라
 * 그대로 보여주지 않고 안내 문구로 바꾸며, 원인은 개발자도구 콘솔에 남긴다.
 */
export function toDisplayMessage(error: unknown, fallback = '알 수 없는 오류가 발생했습니다.'): string {
  if (error instanceof ZodError) {
    console.error('서버 응답이 스키마와 맞지 않습니다.', error.issues)
    return RESPONSE_SHAPE_MESSAGE
  }
  return error instanceof Error ? error.message : fallback
}
