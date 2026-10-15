import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toMaterialErrorMessage } from './materialErrors'

describe('toMaterialErrorMessage', () => {
  it('중복 코드는 code로 분기해 안내한다', () => {
    expect(toMaterialErrorMessage(new ApiError('conflict', { status: 409, code: 'INV_DUPLICATE_PRODUCT_CODE' }))).toBe('이미 등록된 원자재 코드입니다. 다른 코드를 입력해 주세요.')
  })

  it('없는 원자재는 새로고침을 안내한다', () => {
    expect(toMaterialErrorMessage(new ApiError('nf', { status: 404, code: 'INV_PRODUCT_NOT_FOUND' }))).toContain('새로고침')
  })

  it('403은 서버 코드와 상관없이 권한 없음을 안내한다', () => {
    expect(toMaterialErrorMessage(new ApiError('denied', { status: 403, code: 'ACCESS_DENIED' }))).toBe('이 작업을 할 권한이 없습니다.')
  })

  it('네트워크 오류는 오류 자체의 문구를 쓴다', () => {
    expect(toMaterialErrorMessage(new ApiError('서버에 연결할 수 없습니다.', { status: null }))).toBe('서버에 연결할 수 없습니다.')
  })

  it('알 수 없는 코드와 일반 오류는 기본 문구를 쓴다', () => {
    expect(toMaterialErrorMessage(new ApiError('x', { status: 500, code: 'WHATEVER' }))).toContain('다시 시도')
    expect(toMaterialErrorMessage(new Error('x'))).toContain('다시 시도')
  })
})
