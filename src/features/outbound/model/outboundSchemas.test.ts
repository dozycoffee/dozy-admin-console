import { describe, expect, it } from 'vitest'
import { outboundItemSchema, outboundRecommendationSchema, outboundSchema, registerOutboundRequestSchema } from './outboundSchemas'

describe('outbound schemas', () => {
  it('서버 출고 응답을 파싱한다', () => {
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 543, status: 'PICKING' })).toMatchObject({ outboundId: 1, status: 'PICKING' })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => outboundSchema.parse({ outboundId: 1, warehouseId: 543, status: 'SHIPPED' })).toThrow()
  })

  it('피킹 전 품목(pickedQuantity null)과 피킹 후 부족 수량을 파싱한다', () => {
    expect(outboundItemSchema.parse({ outboundItemId: 1, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: null, shortageQuantity: null }).pickedQuantity).toBeNull()
    expect(outboundItemSchema.parse({ outboundItemId: 1, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: 7, shortageQuantity: 3 }).shortageQuantity).toBe(3)
  })

  it('출고 등록 요청은 품목이 1개 이상이고 수량이 양수여야 한다', () => {
    expect(() => registerOutboundRequestSchema.parse({ warehouseId: 1, items: [] })).toThrow()
    expect(() => registerOutboundRequestSchema.parse({ warehouseId: 1, items: [{ productId: 1, requestedQuantity: 0 }] })).toThrow()
    expect(registerOutboundRequestSchema.parse({ warehouseId: 1, items: [{ productId: 1, requestedQuantity: 5 }] }).items).toHaveLength(1)
  })

  it('우선 출고 권고 응답을 파싱한다', () => {
    expect(outboundRecommendationSchema.parse({ lotId: 1, lotNumber: 'LOT-1', productId: 2, productName: '원두', expirationDate: '2026-11-01', availableQuantity: 19, recommendedAt: '2026-10-01T01:00:00' }).lotNumber).toBe('LOT-1')
  })
})
