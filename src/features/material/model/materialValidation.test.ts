import { describe, expect, it } from 'vitest'
import { normalizeMaterialCode, toRegisterRequest, validateMaterial, type MaterialInput } from './materialValidation'

const valid: MaterialInput = { productCode: 'bean-001', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', shelfLifeDays: '180' }

describe('validateMaterial', () => {
  it('올바른 입력은 오류가 없다', () => {
    expect(validateMaterial(valid)).toEqual({})
  })

  it('유통기한 일수는 비워 둘 수 있다', () => {
    expect(validateMaterial({ ...valid, shelfLifeDays: '' })).toEqual({})
  })

  it('필수 입력이 비어 있으면 필드별 오류를 낸다', () => {
    const errors = validateMaterial({ productCode: ' ', productName: '', category: '', unit: '  ', shelfLifeDays: '' })
    expect(Object.keys(errors).sort()).toEqual(['category', 'productCode', 'productName', 'unit'])
  })

  it('길이 제한(코드 50, 이름 100, 단위 20)을 넘으면 오류를 낸다', () => {
    const errors = validateMaterial({ ...valid, productCode: 'A'.repeat(51), productName: 'B'.repeat(101), unit: 'C'.repeat(21) })
    expect(Object.keys(errors).sort()).toEqual(['productCode', 'productName', 'unit'])
    expect(validateMaterial({ ...valid, productCode: 'A'.repeat(50), productName: 'B'.repeat(100), unit: 'C'.repeat(20) })).toEqual({})
  })

  it('목록에 없는 카테고리는 거부한다', () => {
    expect(validateMaterial({ ...valid, category: 'UNKNOWN' }).category).toBeDefined()
  })

  it('유통기한 일수는 0 이상의 정수만 허용한다', () => {
    expect(validateMaterial({ ...valid, shelfLifeDays: '0' })).toEqual({})
    expect(validateMaterial({ ...valid, shelfLifeDays: '-1' }).shelfLifeDays).toBeDefined()
    expect(validateMaterial({ ...valid, shelfLifeDays: '1.5' }).shelfLifeDays).toBeDefined()
    expect(validateMaterial({ ...valid, shelfLifeDays: 'abc' }).shelfLifeDays).toBeDefined()
  })
})

describe('toRegisterRequest', () => {
  it('코드는 공백을 없애고 대문자로, 나머지는 공백을 없애 숫자로 바꾼다', () => {
    expect(toRegisterRequest({ ...valid, productCode: ' bean-001 ', productName: ' 에티오피아 원두 ', unit: ' KG ' }))
      .toEqual({ productCode: 'BEAN-001', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', shelfLifeDays: 180 })
  })

  it('유통기한 일수를 비우면 null로 보낸다', () => {
    expect(toRegisterRequest({ ...valid, shelfLifeDays: ' ' }).shelfLifeDays).toBeNull()
  })
})

describe('normalizeMaterialCode', () => {
  it('서버 저장 형식(앞뒤 공백 제거, 대문자)으로 맞춘다', () => {
    expect(normalizeMaterialCode(' bean-1 ')).toBe('BEAN-1')
  })
})
