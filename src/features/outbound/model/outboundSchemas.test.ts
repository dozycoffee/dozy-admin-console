import { describe, expect, it } from 'vitest'
import { outboundAllocationSchema, outboundItemSchema, outboundSchema, outboundStatusLabels, reportPickingShortageRequestSchema } from './outboundSchemas'

describe('outbound schemas', () => {
  it('서버 출고 응답을 파싱한다', () => {
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 543, status: 'PICKING' })).toMatchObject({ outboundId: 1, status: 'PICKING' })
  })

  it('예약 정보(reservationId·channel·externalOrderId)가 있는 출고와 없는 출고를 모두 파싱한다', () => {
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 1, status: 'REQUESTED', reservationId: 9, channel: 'APP', externalOrderId: 'ORD-1' })).toMatchObject({ reservationId: 9, channel: 'APP', externalOrderId: 'ORD-1' })
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 1, status: 'REQUESTED', reservationId: null, channel: null, externalOrderId: null }).reservationId).toBeNull()
  })

  it('취소 요청과 취소 상태를 파싱하고 이름을 가진다', () => {
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 1, status: 'CANCEL_REQUESTED' }).status).toBe('CANCEL_REQUESTED')
    expect(outboundSchema.parse({ outboundId: 1, warehouseId: 1, status: 'CANCELED' }).status).toBe('CANCELED')
    expect(outboundStatusLabels.CANCEL_REQUESTED).toBe('취소 승인 대기')
    expect(outboundStatusLabels.CANCELED).toBe('취소됨')
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => outboundSchema.parse({ outboundId: 1, warehouseId: 543, status: 'SHIPPED' })).toThrow()
  })

  it('피킹 전 품목(pickedQuantity null)과 피킹 후 부족 수량을 파싱한다', () => {
    expect(outboundItemSchema.parse({ outboundItemId: 1, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: null, shortageQuantity: null }).pickedQuantity).toBeNull()
    expect(outboundItemSchema.parse({ outboundItemId: 1, outboundId: 1, productId: 2, requestedQuantity: 10, pickedQuantity: 7, shortageQuantity: 3 }).shortageQuantity).toBe(3)
  })

  it('피킹 계획(할당)을 파싱한다', () => {
    const allocation = { outboundAllocationId: 5, outboundItemId: 1, productId: 2, inventoryId: 30, lotNumber: 'LOT-1', expirationDate: '2026-12-01', quantity: 8, pickedQuantity: null }
    expect(outboundAllocationSchema.parse(allocation).lotNumber).toBe('LOT-1')
    expect(outboundAllocationSchema.parse({ ...allocation, expirationDate: null, pickedQuantity: 8 }).pickedQuantity).toBe(8)
  })

  it('부족 보고는 1건 이상이고 수량이 양의 정수여야 한다', () => {
    expect(() => reportPickingShortageRequestSchema.parse({ shortages: [] })).toThrow()
    expect(() => reportPickingShortageRequestSchema.parse({ shortages: [{ outboundAllocationId: 1, shortageQuantity: 0 }] })).toThrow()
    expect(() => reportPickingShortageRequestSchema.parse({ shortages: [{ outboundAllocationId: 1, shortageQuantity: 1.5 }] })).toThrow()
    expect(reportPickingShortageRequestSchema.parse({ shortages: [{ outboundAllocationId: 1, shortageQuantity: 2 }] }).shortages).toHaveLength(1)
  })
})
