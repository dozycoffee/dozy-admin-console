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

describe('쓰기 오류 문구', () => {
  it.each([
    ['CATEGORY_NOT_ASSIGNABLE', /소분류만/],
    ['INVALID_MONEY_AMOUNT', /0 이상/],
    ['PRODUCT_NOT_DELETABLE', /판매 대기 상태의 상품만/],
    ['INVALID_PRODUCT_STATUS_TRANSITION', /최신 상태를 확인/],
    ['DUPLICATE_OPTION_GROUP_LINK', /두 번/],
  ])('%s는 안내 문구로 바꾼다', (code, message) => {
    expect(toCatalogErrorMessage(new ApiError('x', { status: 409, code }))).toMatch(message)
  })
})

describe('옵션 그룹 오류 문구', () => {
  it.each([
    ['EMPTY_OPTION_GROUP', /하나 이상/],
    ['DUPLICATE_OPTION_KEY', /옵션 키가 겹칩니다/],
    ['NO_SELECTABLE_OPTION', /선택할 수 있는 옵션이 하나도 없는 상품/],
    ['OPTION_GROUP_STILL_REFERENCED', /연결한 상품이 있어 삭제할 수 없습니다/],
    ['PRODUCT_OPTION_GROUP_NOT_LINKED', /연결되지 않은 옵션 그룹/],
    ['INVALID_OPTION_GROUP_ORDER', /순서가 올바르지 않습니다/],
    ['OPTION_KEY_NOT_FOUND', /그룹에 없는 옵션/],
  ])('%s는 안내 문구로 바꾼다', (code, message) => {
    expect(toCatalogErrorMessage(new ApiError('x', { status: 422, code }))).toMatch(message)
  })
})
