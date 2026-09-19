import { describe, expect, it } from 'vitest'
import { productListSchema, productSchema } from './productSchemas'

const validProduct = {
  productId: 1,
  productCode: 'BEAN-001',
  productName: '에티오피아 예가체프',
  category: 'BEAN',
  unit: 'kg',
  shelfLifeDays: 365,
  productStatus: 'ACTIVE',
}

describe('productSchema', () => {
  it('서버 응답 형태를 파싱한다', () => {
    const result = productSchema.parse(validProduct)

    expect(result.productName).toBe('에티오피아 예가체프')
  })

  it('shelfLifeDays가 null이어도 파싱된다', () => {
    const result = productSchema.parse({ ...validProduct, shelfLifeDays: null })

    expect(result.shelfLifeDays).toBeNull()
  })

  it('알 수 없는 category 값이면 파싱에 실패한다', () => {
    expect(() => productSchema.parse({ ...validProduct, category: 'UNKNOWN' })).toThrow()
  })

  it('배열 스키마로 여러 상품을 함께 파싱한다', () => {
    const result = productListSchema.parse([validProduct])

    expect(result).toHaveLength(1)
  })
})
