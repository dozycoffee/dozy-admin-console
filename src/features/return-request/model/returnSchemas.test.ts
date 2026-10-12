import { describe, expect, it } from 'vitest'
import { completeReturnRequestSchema, inspectReturnItemRequestSchema, registerReturnRequestSchema, returnItemSchema, returnRequestSchema } from './returnSchemas'

describe('return schemas', () => {
  it('서버 반품 응답을 파싱한다', () => {
    expect(returnRequestSchema.parse({ returnRequestId: 1, warehouseId: 543, status: 'INSPECTING' })).toMatchObject({ returnRequestId: 1, status: 'INSPECTING' })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => returnRequestSchema.parse({ returnRequestId: 1, warehouseId: 543, status: 'REQUESTED' })).toThrow()
  })

  it('검수 전 품목(actualQuantity null)과 검수 후 차이를 파싱한다', () => {
    expect(returnItemSchema.parse({ returnItemId: 1, returnRequestId: 1, productId: 2, expectedQuantity: 10, actualQuantity: null, inspectionResult: 'PENDING', quantityDiscrepancy: null }).inspectionResult).toBe('PENDING')
    expect(returnItemSchema.parse({ returnItemId: 1, returnRequestId: 1, productId: 2, expectedQuantity: 10, actualQuantity: 8, inspectionResult: 'DEFECTIVE', quantityDiscrepancy: -2 }).quantityDiscrepancy).toBe(-2)
  })

  it('반품 등록 요청은 품목이 1개 이상이고 수량이 양수여야 한다', () => {
    expect(() => registerReturnRequestSchema.parse({ warehouseId: 1, items: [] })).toThrow()
    expect(() => registerReturnRequestSchema.parse({ warehouseId: 1, items: [{ productId: 1, expectedQuantity: 0 }] })).toThrow()
  })

  it('검수 요청은 음수 수량과 PENDING 결과를 거부한다', () => {
    expect(() => inspectReturnItemRequestSchema.parse({ actualQuantity: -1, inspectionResult: 'NORMAL' })).toThrow()
    expect(() => inspectReturnItemRequestSchema.parse({ actualQuantity: 1, inspectionResult: 'PENDING' })).toThrow()
  })

  it('반품 완료 요청은 빈 Lot 번호를 거부한다', () => {
    expect(() => completeReturnRequestSchema.parse({ lotAssignments: [{ returnItemId: 1, lotNumber: '  ' }] })).toThrow()
    expect(completeReturnRequestSchema.parse({ lotAssignments: [{ returnItemId: 1, lotNumber: 'LOT-R1', expirationDate: '2027-01-01' }] }).lotAssignments).toHaveLength(1)
  })
})
