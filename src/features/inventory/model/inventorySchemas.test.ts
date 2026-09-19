import { describe, expect, it } from 'vitest'
import { quantityOf, zoneInventorySummaryListSchema, zoneInventorySummarySchema } from './inventorySchemas'

const validSummary = {
  zoneId: 1,
  zoneCode: 'A',
  warehouseId: 1,
  maxCapacity: 180,
  usedCapacity: 90,
  usageRate: 0.5,
  quantityByQualityStatus: { NORMAL: 85, DEFECTIVE: 5 },
}

describe('zoneInventorySummarySchema', () => {
  it('서버 응답 형태를 파싱한다', () => {
    const result = zoneInventorySummarySchema.parse(validSummary)

    expect(result.zoneCode).toBe('A')
    expect(result.warehouseId).toBe(1)
  })

  it('quantityByQualityStatus에 일부 QualityStatus 키가 없어도 파싱된다', () => {
    const result = zoneInventorySummarySchema.parse({ ...validSummary, quantityByQualityStatus: {} })

    expect(result.quantityByQualityStatus).toEqual({})
  })

  it('필수 필드가 없으면 파싱에 실패한다', () => {
    const { warehouseId: _warehouseId, ...withoutWarehouseId } = validSummary

    expect(() => zoneInventorySummarySchema.parse(withoutWarehouseId)).toThrow()
  })

  it('배열 스키마로 여러 zone을 함께 파싱한다', () => {
    const result = zoneInventorySummaryListSchema.parse([validSummary])

    expect(result).toHaveLength(1)
  })
})

describe('quantityOf', () => {
  it('해당 상태의 수량을 반환한다', () => {
    const summary = zoneInventorySummarySchema.parse(validSummary)

    expect(quantityOf(summary, 'NORMAL')).toBe(85)
  })

  it('키가 없는 상태는 0을 반환한다', () => {
    const summary = zoneInventorySummarySchema.parse(validSummary)

    expect(quantityOf(summary, 'DISPOSAL_SCHEDULED')).toBe(0)
  })
})
