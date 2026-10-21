import { describe, expect, it } from 'vitest'
import { countStockAuditItemRequestSchema, registerStockAuditRequestSchema, stockAuditItemSchema, stockAuditSchema } from './stockAuditSchemas'

describe('stock audit schemas', () => {
  it('서버 실사 응답을 파싱하고 담당자·승인자 null을 허용한다', () => {
    expect(stockAuditSchema.parse({ stockAuditId: 1, warehouseId: 543, zoneId: 3, status: 'SCHEDULED', assignee: null, approvedBy: null })).toMatchObject({ status: 'SCHEDULED', assignee: null })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => stockAuditSchema.parse({ stockAuditId: 1, warehouseId: 543, zoneId: 3, status: 'APPROVED', assignee: null, approvedBy: null })).toThrow()
  })

  it('카운트 전 항목은 실사 수량·차이가 null이다', () => {
    const item = stockAuditItemSchema.parse({ stockAuditItemId: 1, stockAuditId: 1, locationStockId: 9, snapshotQuantity: 5, countedQuantity: null, discrepancy: null, hasUncommittedMovement: false })
    expect(item.countedQuantity).toBeNull()
    expect(item.discrepancy).toBeNull()
  })

  it('등록 요청은 창고와 Zone을, 카운트 요청은 0 이상 정수를 요구한다', () => {
    expect(registerStockAuditRequestSchema.parse({ warehouseId: 543, zoneId: 3 })).toEqual({ warehouseId: 543, zoneId: 3 })
    expect(countStockAuditItemRequestSchema.parse({ countedQuantity: 0 })).toEqual({ countedQuantity: 0 })
    expect(() => countStockAuditItemRequestSchema.parse({ countedQuantity: -1 })).toThrow()
    expect(() => countStockAuditItemRequestSchema.parse({ countedQuantity: 1.5 })).toThrow()
  })
})
