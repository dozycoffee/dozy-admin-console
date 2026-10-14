import { describe, expect, it } from 'vitest'
import { warehouseListSchema, warehouseSchema } from './warehouseSchemas'

const validWarehouse = {
  warehouseId: 1,
  warehouseName: '서울 중앙 창고',
  address: '서울시 성동구',
  latitude: 37.5,
  longitude: 127.0,
  warehouseStatus: 'AVAILABLE',
}

describe('warehouseSchema', () => {
  it('서버 응답 형태를 파싱한다', () => {
    const result = warehouseSchema.parse(validWarehouse)

    expect(result.warehouseName).toBe('서울 중앙 창고')
    expect(result.warehouseStatus).toBe('AVAILABLE')
  })

  it('알 수 없는 warehouseStatus 값이면 파싱에 실패한다', () => {
    expect(() => warehouseSchema.parse({ ...validWarehouse, warehouseStatus: 'CLOSED' })).toThrow()
  })
})

describe('warehouseListSchema', () => {
  it('items 래퍼의 창고 목록을 파싱한다', () => {
    const result = warehouseListSchema.parse({ items: [validWarehouse, { ...validWarehouse, warehouseId: 2 }] })

    expect(result.items.map((warehouse) => warehouse.warehouseId)).toEqual([validWarehouse.warehouseId, 2])
  })

  it('빈 목록도 파싱하고 items가 없으면 실패한다', () => {
    expect(warehouseListSchema.parse({ items: [] }).items).toEqual([])
    expect(() => warehouseListSchema.parse([validWarehouse])).toThrow()
  })
})
