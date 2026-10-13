import { describe, expect, it } from 'vitest'
import { addTagName, emptyToNull, tagNamesOf, validateProduct } from './productValidation'

describe('validateProduct', () => {
  it('문제가 없으면 오류가 없다', () => {
    expect(validateProduct({ name: '아메리카노', categoryId: '5', basePrice: '4500' })).toEqual({})
    expect(validateProduct({ name: ' 무료 샘플 ', categoryId: '5', basePrice: '0' })).toEqual({})
  })

  it('비어 있는 필수 입력마다 문구를 준다', () => {
    expect(validateProduct({ name: '  ', categoryId: '', basePrice: '' })).toEqual({
      name: '상품명을 입력하세요.', categoryId: '카테고리를 선택하세요.', basePrice: '기준가를 입력하세요.',
    })
  })

  it.each(['-1', '4.5', '4,500', '4500원', 'abc'])('기준가 %s는 0 이상의 정수가 아니라고 안내한다', (basePrice) => {
    expect(validateProduct({ name: '상품', categoryId: '5', basePrice }).basePrice).toMatch(/0 이상의 정수/)
  })
})

describe('addTagName', () => {
  it('이름을 다듬어 맨 뒤에 더한다', () => {
    expect(addTagName(['신메뉴'], '  베스트 ')).toEqual(['신메뉴', '베스트'])
  })

  it('빈 입력과 이미 고른 이름은 무시한다', () => {
    expect(addTagName(['신메뉴'], '   ')).toEqual(['신메뉴'])
    expect(addTagName(['신메뉴'], '신메뉴')).toEqual(['신메뉴'])
  })

  it('원래 배열을 바꾸지 않는다', () => {
    const selected = ['신메뉴']
    addTagName(selected, '베스트')
    expect(selected).toEqual(['신메뉴'])
  })
})

describe('tagNamesOf', () => {
  const tags = [{ id: 1, name: '신메뉴' }, { id: 2, name: '베스트' }]

  it('태그 id를 이름으로 바꾼다', () => {
    expect(tagNamesOf([2, 1], tags)).toEqual({ names: ['베스트', '신메뉴'], unresolved: 0 })
  })

  it('이름을 찾지 못한 id는 개수로 알려 태그를 모르는 채 잃지 않게 한다', () => {
    expect(tagNamesOf([1, 9], tags)).toEqual({ names: ['신메뉴'], unresolved: 1 })
  })
})

describe('emptyToNull', () => {
  it('빈 입력은 null로, 값이 있으면 다듬어 돌려준다', () => {
    expect(emptyToNull('   ')).toBeNull()
    expect(emptyToNull(' 설명 ')).toBe('설명')
  })
})
