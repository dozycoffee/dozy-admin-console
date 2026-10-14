import { describe, expect, it } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { toStockErrorMessage } from './stockErrors'

describe('toStockErrorMessage', () => {
  it('오류 코드별 안내를 돌려준다', () => {
    expect(toStockErrorMessage(new ApiError('x', { status: 400, code: 'INV_INVALID_INVENTORY_QUERY' }))).toMatch(/조회 조건을 확인/)
    expect(toStockErrorMessage(new ApiError('x', { status: 404, code: 'INV_INVENTORY_NOT_FOUND' }))).toMatch(/찾을 수 없습니다/)
    expect(toStockErrorMessage(new ApiError('x', { status: 403, code: 'INV_WAREHOUSE_ACCESS_DENIED' }))).toBe('접근 권한이 없는 창고입니다.')
  })

  it('코드가 없는 403은 권한 안내, 그 밖의 오류는 일반 안내를 돌려준다', () => {
    expect(toStockErrorMessage(new ApiError('x', { status: 403, code: 'FORBIDDEN' }))).toBe('이 정보를 볼 권한이 없습니다.')
    expect(toStockErrorMessage(new ApiError('x', { status: 500 }))).toMatch(/불러오지 못했습니다/)
    expect(toStockErrorMessage(new Error('boom'))).toMatch(/불러오지 못했습니다/)
  })

  it('서버에 연결하지 못한 오류는 그 안내 문구를 그대로 쓴다', () => {
    expect(toStockErrorMessage(new ApiError('서버에 연결할 수 없습니다.', { status: null }))).toBe('서버에 연결할 수 없습니다.')
  })
})
