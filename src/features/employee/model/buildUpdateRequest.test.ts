import { describe, expect, it } from 'vitest'
import { buildUpdateRequest } from './buildUpdateRequest'

const employee = { name: '김도윤', phone: '010-1234-5678', address: '서울시' }

describe('buildUpdateRequest', () => {
  it('바뀐 필드만 담는다', () => {
    expect(buildUpdateRequest(employee, { name: '김도윤', phone: '010-0000-0000', address: '서울시' })).toEqual({ phone: '010-0000-0000' })
  })

  it('바뀐 것이 없으면 빈 객체다', () => {
    expect(buildUpdateRequest(employee, { name: '김도윤', phone: '010-1234-5678', address: '서울시' })).toEqual({})
  })

  it('앞뒤 공백은 제거하고 비교한다', () => {
    expect(buildUpdateRequest(employee, { name: '  김도윤 ', phone: ' 010-1234-5678', address: '서울시  ' })).toEqual({})
  })

  it('전화번호·주소를 비우면 null(삭제)로 보낸다', () => {
    expect(buildUpdateRequest(employee, { name: '김도윤', phone: '', address: '  ' })).toEqual({ phone: null, address: null })
  })

  it('원래 값이 없고 비워 둔 필드는 보내지 않는다', () => {
    expect(buildUpdateRequest({ name: '김도윤', phone: null, address: undefined }, { name: '김도윤', phone: '', address: '' })).toEqual({})
  })
})
