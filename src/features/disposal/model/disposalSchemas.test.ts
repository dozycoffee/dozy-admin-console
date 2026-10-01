import { describe, expect, it } from 'vitest'
import { disposalItemSchema, disposalSchema, manualDisposalReasons, registerDisposalRequestSchema } from './disposalSchemas'

describe('disposal schemas', () => {
  it('서버 폐기 응답을 파싱한다', () => {
    expect(disposalSchema.parse({ disposalId: 1, warehouseId: 543, status: 'APPROVED' })).toMatchObject({ disposalId: 1, status: 'APPROVED' })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => disposalSchema.parse({ disposalId: 1, warehouseId: 543, status: 'REJECTED' })).toThrow()
  })

  it('폐기 품목의 사유를 파싱한다', () => {
    expect(disposalItemSchema.parse({ disposalItemId: 1, disposalId: 1, inventoryId: 9, quantity: 3, reason: 'INSPECTION_DEFECT' }).reason).toBe('INSPECTION_DEFECT')
    expect(() => disposalItemSchema.parse({ disposalItemId: 1, disposalId: 1, inventoryId: 9, quantity: 3, reason: 'UNKNOWN' })).toThrow()
  })

  it('폐기 등록 요청은 품목이 1개 이상이고 수량이 양수여야 한다', () => {
    expect(() => registerDisposalRequestSchema.parse({ warehouseId: 1, items: [] })).toThrow()
    expect(() => registerDisposalRequestSchema.parse({ warehouseId: 1, items: [{ inventoryId: 1, quantity: 0, reason: 'OTHER' }] })).toThrow()
    expect(registerDisposalRequestSchema.parse({ warehouseId: 1, items: [{ inventoryId: 1, quantity: 2, reason: 'EXPIRED' }] }).items).toHaveLength(1)
  })

  it('직접 등록 사유에는 자동 연계 사유(검수·반품 불량)를 넣지 않는다', () => {
    expect(manualDisposalReasons).toEqual(['EXPIRED', 'OTHER'])
  })
})
