import { describe, expect, it } from 'vitest'
import { defectReasonLabels, inboundItemSchema, inboundReceiptSchema, inboundSchema, inspectInboundItemRequestSchema, inspectionStatusLabels, registerInboundRequestSchema } from './inboundSchemas'

const item = { inboundItemId: 1, inboundId: 1, productId: 2, zoneId: 3, expectedQuantity: 10, expectedLotNumber: null, expectedExpirationDate: null, actualQuantity: null, inspectionStatus: 'PENDING', quantityDiscrepancy: null, receipts: [] }
const receipt = { inboundReceiptId: 5, lotNumber: 'LOT-1', manufactureDate: null, expirationDate: '2027-01-01', quantity: 8, inspectionResult: 'DEFECTIVE', defectReason: 'DAMAGED' }

describe('inbound schemas', () => {
  it('서버 입고 응답을 파싱한다', () => {
    expect(inboundSchema.parse({ inboundId: 1, warehouseId: 543, expectedArrivalDate: '2026-10-02', status: 'WAITING' })).toMatchObject({ inboundId: 1, status: 'WAITING' })
  })

  it('서버에 없는 상태는 거부한다', () => {
    expect(() => inboundSchema.parse({ inboundId: 1, warehouseId: 543, expectedArrivalDate: '2026-10-02', status: 'REQUESTED' })).toThrow()
  })

  it('검수 전 품목(수령 라인 없음, actualQuantity null)을 파싱한다', () => {
    const parsed = inboundItemSchema.parse(item)
    expect(parsed.inspectionStatus).toBe('PENDING')
    expect(parsed.receipts).toEqual([])
    expect(inspectionStatusLabels.INSPECTED).toBe('검수 완료')
  })

  it('예정 Lot 정보가 응답에 없어도 파싱한다', () => {
    const { expectedLotNumber: _lot, expectedExpirationDate: _expiration, ...withoutExpected } = item
    expect(inboundItemSchema.parse(withoutExpected).expectedLotNumber).toBeUndefined()
  })

  it('검수가 끝난 품목은 수령 라인과 예정 대비 차이를 가진다', () => {
    const parsed = inboundItemSchema.parse({ ...item, inspectionStatus: 'INSPECTED', actualQuantity: 8, quantityDiscrepancy: -2, expectedLotNumber: 'LOT-1', receipts: [receipt] })
    expect(parsed.receipts[0]).toMatchObject({ lotNumber: 'LOT-1', quantity: 8, defectReason: 'DAMAGED' })
    expect(parsed.quantityDiscrepancy).toBe(-2)
  })

  it('이전 계약의 inspectionResult 필드만 있는 품목은 거부한다', () => {
    const { inspectionStatus: _status, receipts: _receipts, ...legacy } = item
    expect(() => inboundItemSchema.parse({ ...legacy, inspectionResult: 'PENDING' })).toThrow()
  })

  it('수령 라인의 판정과 불량 사유는 서버가 주는 값만 받는다', () => {
    expect(inboundReceiptSchema.parse({ ...receipt, inspectionResult: 'NORMAL', defectReason: null }).defectReason).toBeNull()
    expect(() => inboundReceiptSchema.parse({ ...receipt, inspectionResult: 'PENDING' })).toThrow()
    expect(() => inboundReceiptSchema.parse({ ...receipt, defectReason: 'LOST' })).toThrow()
    expect(defectReasonLabels.EXPIRED).toBe('유통기한 경과')
  })

  it('입고 등록 요청은 품목이 1개 이상이고 수량이 양수여야 한다', () => {
    expect(() => registerInboundRequestSchema.parse({ warehouseId: 1, expectedArrivalDate: '2026-10-02', items: [] })).toThrow()
    expect(() => registerInboundRequestSchema.parse({ warehouseId: 1, expectedArrivalDate: '2026-10-02', items: [{ productId: 1, expectedQuantity: 0 }] })).toThrow()
  })

  it('검수 요청은 수령 라인 목록이고 미도착은 빈 목록이다', () => {
    expect(inspectInboundItemRequestSchema.parse({ receipts: [] }).receipts).toEqual([])
    expect(inspectInboundItemRequestSchema.parse({ receipts: [{ lotNumber: 'LOT-1', quantity: 3, inspectionResult: 'NORMAL', expirationDate: '2027-01-01' }] }).receipts).toHaveLength(1)
  })

  it('검수 요청은 빈 Lot 번호·0 이하 수량·PENDING 판정을 거부한다', () => {
    const line = { lotNumber: 'LOT-1', quantity: 3, inspectionResult: 'NORMAL' }
    expect(() => inspectInboundItemRequestSchema.parse({ receipts: [{ ...line, lotNumber: '  ' }] })).toThrow()
    expect(() => inspectInboundItemRequestSchema.parse({ receipts: [{ ...line, quantity: 0 }] })).toThrow()
    expect(() => inspectInboundItemRequestSchema.parse({ receipts: [{ ...line, inspectionResult: 'PENDING' }] })).toThrow()
  })
})
