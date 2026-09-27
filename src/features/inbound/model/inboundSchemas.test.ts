import { describe, expect, it } from 'vitest'
import { completeInspectionRequestSchema, inboundSchema, paginatedInboundSchema } from './inboundSchemas'

const inbound = {
  id: 'INB-001', warehouseId: 1481, supplierName: '테스트 공급사', expectedArrivalAt: '2026-09-24 10:00', status: 'WAITING',
  capacityCheck: { status: 'AVAILABLE', requiredCapacity: 10, availableCapacity: 20, message: '공간 확보' },
  receivingAreaCheck: { workAreaName: '입고처리장', status: 'AVAILABLE', requiredCapacity: 10, availableCapacity: 30, message: '처리장 공간 확보', nextAvailableAt: null },
  items: [{ id: 'ITEM-001', sku: 'SKU-001', productName: '테스트 원두', targetZoneCode: 'A', expectedQuantity: 10, receivedQuantity: null, qualityStatus: null, lotNumber: null, expirationDate: null, putawayPlans: [] }],
}

describe('inbound schemas', () => {
  it('입고 조회 응답을 파싱한다', () => {
    expect(inboundSchema.parse(inbound)).toMatchObject({ id: 'INB-001', status: 'WAITING' })
  })

  it('입고 요청부터 완료까지의 운영 상태를 허용한다', () => {
    expect(inboundSchema.parse({ ...inbound, status: 'REQUESTED' }).status).toBe('REQUESTED')
    expect(inboundSchema.parse({ ...inbound, status: 'ARRIVED' }).status).toBe('ARRIVED')
  })

  it('검수 완료 요청에서 음수 수량을 거부한다', () => {
    expect(() => completeInspectionRequestSchema.parse({ items: [{ inboundItemId: 'ITEM-001', receivedQuantity: -1, qualityStatus: 'NORMAL' }] })).toThrow()
  })

  it('페이지 단위 입고 목록과 상태별 건수를 파싱한다', () => {
    const result = paginatedInboundSchema.parse({ items: [inbound], total: 20, page: 1, size: 6, statusCounts: { REQUESTED: 3, APPROVED: 2, ARRIVED: 1, WAITING: 2, PROCESSING: 2, PUTAWAY_READY: 3, COMPLETED: 7, REJECTED: 0 } })

    expect(result.items).toHaveLength(1)
    expect(result.statusCounts.COMPLETED).toBe(7)
  })
})
