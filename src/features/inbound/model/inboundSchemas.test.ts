import { describe, expect, it } from 'vitest'
import { completeInboundRequestSchema, inboundItemSchema, inboundSchema, inspectInboundItemRequestSchema, registerInboundRequestSchema } from './inboundSchemas'

describe('inbound schemas', () => {
  it('서버 입고 응답을 파싱한다', () => {
    expect(inboundSchema.parse({ inboundId: 1, warehouseId: 543, expectedArrivalDate: '2026-10-02', status: 'WAITING' })).toMatchObject({ inboundId: 1, status: 'WAITING' })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => inboundSchema.parse({ inboundId: 1, warehouseId: 543, expectedArrivalDate: '2026-10-02', status: 'REQUESTED' })).toThrow()
  })

  it('검수 전 품목(actualQuantity null)을 파싱한다', () => {
    const item = inboundItemSchema.parse({ inboundItemId: 1, inboundId: 1, productId: 2, zoneId: 3, expectedQuantity: 10, actualQuantity: null, inspectionResult: 'PENDING', quantityDiscrepancy: null })
    expect(item.inspectionResult).toBe('PENDING')
  })

  it('입고 등록 요청은 품목이 1개 이상이고 수량이 양수여야 한다', () => {
    expect(() => registerInboundRequestSchema.parse({ warehouseId: 1, expectedArrivalDate: '2026-10-02', items: [] })).toThrow()
    expect(() => registerInboundRequestSchema.parse({ warehouseId: 1, expectedArrivalDate: '2026-10-02', items: [{ productId: 1, expectedQuantity: 0 }] })).toThrow()
  })

  it('검수 요청은 음수 수량과 PENDING 결과를 거부한다', () => {
    expect(() => inspectInboundItemRequestSchema.parse({ actualQuantity: -1, inspectionResult: 'NORMAL' })).toThrow()
    expect(() => inspectInboundItemRequestSchema.parse({ actualQuantity: 1, inspectionResult: 'PENDING' })).toThrow()
  })

  it('입고 완료 요청은 빈 Lot 번호를 거부한다', () => {
    expect(() => completeInboundRequestSchema.parse({ lotAssignments: [{ inboundItemId: 1, lotNumber: '  ' }] })).toThrow()
    expect(completeInboundRequestSchema.parse({ lotAssignments: [{ inboundItemId: 1, lotNumber: 'LOT-1', expirationDate: '2027-01-01' }] }).lotAssignments).toHaveLength(1)
  })
})
