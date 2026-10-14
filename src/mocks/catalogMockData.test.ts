import { describe, expect, it } from 'vitest'
import { filterProducts, mockCategories, mockProducts } from './catalogMockData'

const names = (items: typeof mockProducts) => items.map((item) => item.name)

describe('filterProducts', () => {
  it('조건이 없으면 모두 돌려준다', () => {
    expect(filterProducts(mockProducts, mockCategories, {})).toHaveLength(mockProducts.length)
  })

  it('대분류를 고르면 그 아래 소분류의 상품을 모두 포함한다', () => {
    const result = filterProducts(mockProducts, mockCategories, { categoryId: 1 })
    expect(names(result)).toContain('아이스 아메리카노')
    expect(names(result)).toContain('캐모마일 티')
    expect(names(result)).not.toContain('치즈케이크')
  })

  it('상품명은 부분 일치, SKU는 완전 일치로 찾는다', () => {
    expect(names(filterProducts(mockProducts, mockCategories, { keyword: '라떼' }))).toEqual(['카페라떼', '딸기 라떼'])
    expect(names(filterProducts(mockProducts, mockCategories, { keyword: 'DZ-00000012' }))).toEqual(['아이스 아메리카노'])
    expect(filterProducts(mockProducts, mockCategories, { keyword: 'DZ-0000001' })).toEqual([])
  })

  it('모든 조건을 만족하는 상품만 남긴다', () => {
    expect(names(filterProducts(mockProducts, mockCategories, { status: 'ACTIVE', tagId: 2, groupId: 1 }))).toEqual(['아이스 아메리카노', '콜드브루'])
  })
})
