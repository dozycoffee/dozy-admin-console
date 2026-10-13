import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toCatalogErrorMessage } from './catalogErrors'

describe('toCatalogErrorMessage', () => {
  it('code로 분기해 콘솔이 정한 문구를 쓴다', () => {
    expect(toCatalogErrorMessage(new ApiError('서버 detail', { status: 409, code: 'VERSION_CONFLICT' }))).toMatch(/다른 사용자가 먼저 수정/)
    expect(toCatalogErrorMessage(new ApiError('x', { status: 403, code: 'FORBIDDEN' }))).toBe('이 작업을 할 권한이 없습니다.')
  })

  it('서버 detail은 화면에 그대로 보여주지 않는다', () => {
    expect(toCatalogErrorMessage(new ApiError('Draft 상태의 상품만 삭제할 수 있습니다: 상품 12', { status: 409, code: 'UNKNOWN_CODE' }))).toBe('요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.')
  })

  it('서버에 닿지 못한 오류는 연결 안내를 그대로 쓴다', () => {
    expect(toCatalogErrorMessage(new ApiError('서버에 연결할 수 없습니다.', { status: null }))).toBe('서버에 연결할 수 없습니다.')
  })
})
