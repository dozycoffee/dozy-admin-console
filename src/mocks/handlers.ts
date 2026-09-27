import { http, HttpResponse } from 'msw'
import { permissions } from '../features/auth/model/permissions'
import type { CurrentUser } from '../features/auth/model/permissions'
import { actorModeIds } from '../features/auth/model/actorModes'
import type { Warehouse } from '../features/warehouse/model/warehouseSchemas'
import type { ZoneInventorySummary } from '../features/inventory/model/inventorySchemas'
import type { CompleteInspectionRequest, Inbound, InboundStatus } from '../features/inbound/model/inboundSchemas'

// 실제 인증 서비스가 준비되기 전까지 쓰는 mock 계정 — dozy-wms-api ADR-0010의
// "포트 + mock 어댑터" 패턴을 프런트에도 동일하게 적용한 것이다.
// warehouseIds는 로컬 dev DB에 실제 등록된 창고 id를 가리켜야 하므로, 다른 환경에서는 이 값을 바꿔야 한다.
const DEMO_CREDENTIALS = { username: 'dozy', password: 'dozy1234' }
const MOCK_ACCESS_TOKEN = 'mock-access-token'
const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  actorModes: [actorModeIds.warehouseManager, actorModeIds.headquartersInventoryManager],
  permissions: [permissions.dashboardRead, permissions.inventoryRead, permissions.inboundRead, permissions.inboundWrite],
  scope: { warehouseIds: [1481] },
}

const mockWarehouse: Warehouse = {
  warehouseId: 1481,
  warehouseName: '서울 중앙 창고',
  address: '서울특별시 강남구 테헤란로 123',
  latitude: 37.5065,
  longitude: 127.0536,
  warehouseStatus: 'AVAILABLE',
}

const mockZoneSummaries: ZoneInventorySummary[] = [
  { zoneId: 1, zoneCode: 'A', warehouseId: 1481, maxCapacity: 180, usedCapacity: 128, usageRate: 128 / 180, quantityByQualityStatus: { NORMAL: 116, DEFECTIVE: 4, DISPOSAL_SCHEDULED: 8 } },
  { zoneId: 2, zoneCode: 'B', warehouseId: 1481, maxCapacity: 120, usedCapacity: 72, usageRate: 72 / 120, quantityByQualityStatus: { NORMAL: 70, DEFECTIVE: 2 } },
  { zoneId: 3, zoneCode: 'C', warehouseId: 1481, maxCapacity: 100, usedCapacity: 91, usageRate: 91 / 100, quantityByQualityStatus: { NORMAL: 86, DEFECTIVE: 5 } },
  { zoneId: 4, zoneCode: 'D', warehouseId: 1481, maxCapacity: 80, usedCapacity: 30, usageRate: 30 / 80, quantityByQualityStatus: { NORMAL: 30 } },
  { zoneId: 5, zoneCode: 'E', warehouseId: 1481, maxCapacity: 370, usedCapacity: 244, usageRate: 244 / 370, quantityByQualityStatus: { NORMAL: 244 } },
]

function createDemoInbound(id: string, supplierName: string, expectedArrivalAt: string, status: InboundStatus, productName: string, targetZoneCode: Inbound['items'][number]['targetZoneCode'], expectedQuantity: number, capacityStatus: Inbound['capacityCheck']['status'] = 'AVAILABLE', receivingAreaStatus: Inbound['receivingAreaCheck']['status'] = 'AVAILABLE'): Inbound {
  const finished = status === 'PUTAWAY_READY' || status === 'COMPLETED'
  const availableCapacity = capacityStatus === 'UNAVAILABLE' ? Math.max(expectedQuantity - 18, 0) : expectedQuantity + 42
  return {
    id, warehouseId: 1481, supplierName, expectedArrivalAt, status,
    capacityCheck: { status: capacityStatus, requiredCapacity: expectedQuantity, availableCapacity, message: capacityStatus === 'UNAVAILABLE' ? '지정 Zone에 적재 가능한 공간이 부족합니다.' : capacityStatus === 'PARTIAL' ? '여러 Location으로 나누어 적재해야 합니다.' : '지정 Zone 후보 Location에 적재 공간이 확보되어 있습니다.' },
    receivingAreaCheck: { workAreaName: '입고처리장', status: receivingAreaStatus, requiredCapacity: expectedQuantity, availableCapacity: receivingAreaStatus === 'AVAILABLE' ? expectedQuantity + 56 : Math.max(0, expectedQuantity - 24), message: receivingAreaStatus === 'AVAILABLE' ? '예상 도착 시간에 입고처리장 공간을 예약할 수 있습니다.' : '예상 도착 시간에는 입고처리장에 여유 공간이 없습니다.', nextAvailableAt: receivingAreaStatus === 'AVAILABLE' ? null : '2026-09-26 13:00' },
    items: [{ id: `${id}-ITEM`, sku: `SKU-${id.slice(-3)}`, productName, targetZoneCode, expectedQuantity, receivedQuantity: finished ? expectedQuantity : null, qualityStatus: finished ? 'NORMAL' : null, lotNumber: finished ? `LOT-${id.slice(-6)}` : null, expirationDate: null, putawayPlans: [{ locationId: `${targetZoneCode}-01`, quantity: expectedQuantity, capacity: 300, remainingCapacity: Math.max(0, 300 - expectedQuantity) }] }],
  }
}

const additionalMockInbounds: Inbound[] = [
  createDemoInbound('INB-20260925-004', '카페 솔루션', '2026-09-25 17:00', 'REQUESTED', '헤이즐넛 시럽', 'B', 48),
  createDemoInbound('INB-20260925-005', '밀크앤코', '2026-09-26 08:00', 'REQUESTED', '오트밀크', 'D', 72, 'AVAILABLE', 'UNAVAILABLE'),
  createDemoInbound('INB-20260925-006', '패키지랩', '2026-09-26 09:00', 'REQUESTED', '컵 리드', 'E', 150),
  createDemoInbound('INB-20260925-007', '빈 브라더스', '2026-09-25 13:30', 'APPROVED', '케냐 AA', 'A', 55),
  createDemoInbound('INB-20260925-008', '브루웍스', '2026-09-25 14:00', 'ARRIVED', '디카페인 원두', 'A', 36),
  createDemoInbound('INB-20260925-009', '로컬 유통', '2026-09-25 14:20', 'ARRIVED', '초콜릿 파우더', 'C', 64),
  createDemoInbound('INB-20260925-010', '도지 서플라이', '2026-09-25 08:30', 'WAITING', '카라멜 시럽', 'B', 32),
  createDemoInbound('INB-20260925-011', '그레인 하우스', '2026-09-25 09:10', 'WAITING', '말차 파우더', 'C', 42),
  createDemoInbound('INB-20260925-012', '프레시 데일리', '2026-09-25 09:40', 'PROCESSING', '저지방 우유', 'D', 80),
  createDemoInbound('INB-20260925-013', '브루잉 컴퍼니', '2026-09-25 10:30', 'PROCESSING', '과테말라 안티구아', 'A', 44),
  createDemoInbound('INB-20260924-014', '도지 패키징', '2026-09-24 15:00', 'PUTAWAY_READY', '포장 박스', 'E', 110, 'PARTIAL'),
  createDemoInbound('INB-20260924-015', '굿즈 팩토리', '2026-09-24 16:00', 'PUTAWAY_READY', '로고 머그컵', 'F', 38),
  createDemoInbound('INB-20260923-016', '스페셜티 커피', '2026-09-23 10:00', 'COMPLETED', '코스타리카 따라주', 'A', 60),
  createDemoInbound('INB-20260923-017', '컵앤컵', '2026-09-23 11:00', 'COMPLETED', '16oz 종이컵', 'E', 200),
  createDemoInbound('INB-20260922-018', '시럽 마켓', '2026-09-22 09:00', 'COMPLETED', '메이플 시럽', 'B', 24),
  createDemoInbound('INB-20260922-019', 'MD 스토어', '2026-09-22 14:00', 'COMPLETED', '텀블러', 'F', 36),
]

let mockInbounds: Inbound[] = [
  { id: 'INB-20260925-001', warehouseId: 1481, supplierName: '그린빈 트레이딩', expectedArrivalAt: '2026-09-26 10:00', status: 'REQUESTED', capacityCheck: { status: 'AVAILABLE', requiredCapacity: 120, availableCapacity: 172, message: 'A, B Zone의 후보 Location에 충분한 여유 공간이 있습니다. 승인 후 해당 공간을 입고 예정 수량으로 확보합니다.' }, receivingAreaCheck: { workAreaName: '입고처리장', status: 'AVAILABLE', requiredCapacity: 120, availableCapacity: 129, message: '예상 도착 시간에 입고처리장 공간을 예약할 수 있습니다.', nextAvailableAt: null }, items: [
    { id: 'INB-ITEM-001', sku: 'BEAN-ETH-01', productName: '에티오피아 싱글 오리진', targetZoneCode: 'A', expectedQuantity: 80, receivedQuantity: null, qualityStatus: null, lotNumber: null, expirationDate: '2027-09-23', putawayPlans: [{ locationId: 'A-02', quantity: 50, capacity: 270, remainingCapacity: 157 }, { locationId: 'A-03', quantity: 30, capacity: 230, remainingCapacity: 46 }] },
    { id: 'INB-ITEM-002', sku: 'SYR-VAN-01', productName: '바닐라 시럽', targetZoneCode: 'B', expectedQuantity: 40, receivedQuantity: null, qualityStatus: null, lotNumber: null, expirationDate: '2028-03-24', putawayPlans: [{ locationId: 'B-02', quantity: 40, capacity: 280, remainingCapacity: 84 }] },
  ] },
  { id: 'INB-20260925-002', warehouseId: 1481, supplierName: '로스터스 유니온', expectedArrivalAt: '2026-09-25 15:00', status: 'APPROVED', capacityCheck: { status: 'AVAILABLE', requiredCapacity: 60, availableCapacity: 82, message: '공간 확보가 완료되었습니다. 실제 물품 도착을 기다리고 있습니다.' }, receivingAreaCheck: { workAreaName: '입고처리장', status: 'AVAILABLE', requiredCapacity: 60, availableCapacity: 110, message: '입고처리장 공간이 예약되었습니다.', nextAvailableAt: null }, items: [
    { id: 'INB-ITEM-003', sku: 'BEAN-BRA-02', productName: '브라질 세하도', targetZoneCode: 'A', expectedQuantity: 60, receivedQuantity: null, qualityStatus: null, lotNumber: null, expirationDate: '2027-08-30', putawayPlans: [{ locationId: 'A-02', quantity: 60, capacity: 270, remainingCapacity: 157 }] },
  ] },
  { id: 'INB-20260925-003', warehouseId: 1481, supplierName: '커피 파트너스', expectedArrivalAt: '2026-09-25 09:30', status: 'WAITING', capacityCheck: { status: 'AVAILABLE', requiredCapacity: 30, availableCapacity: 82, message: '입고처리장 이동이 완료되었습니다. 검수를 시작할 수 있습니다.' }, receivingAreaCheck: { workAreaName: '입고처리장', status: 'AVAILABLE', requiredCapacity: 30, availableCapacity: 101, message: '입고처리장에 물품이 배치되어 있습니다.', nextAvailableAt: null }, items: [
    { id: 'INB-ITEM-006', sku: 'BEAN-COL-01', productName: '콜롬비아 수프리모', targetZoneCode: 'A', expectedQuantity: 30, receivedQuantity: null, qualityStatus: null, lotNumber: null, expirationDate: '2027-08-30', putawayPlans: [{ locationId: 'A-02', quantity: 30, capacity: 270, remainingCapacity: 157 }] },
  ] },
  { id: 'INB-20260923-003', warehouseId: 1481, supplierName: '도지 패키징', expectedArrivalAt: '2026-09-23 16:00', status: 'PUTAWAY_READY', capacityCheck: { status: 'PARTIAL', requiredCapacity: 220, availableCapacity: 220, message: 'E Zone 두 Location으로 분할 적재가 필요합니다.' }, receivingAreaCheck: { workAreaName: '입고처리장', status: 'AVAILABLE', requiredCapacity: 220, availableCapacity: 230, message: '검수 완료 후 적재를 기다리고 있습니다.', nextAvailableAt: null }, items: [
    { id: 'INB-ITEM-004', sku: 'CUP-12OZ-01', productName: '12oz 종이컵', targetZoneCode: 'E', expectedQuantity: 220, receivedQuantity: 214, qualityStatus: 'NORMAL', lotNumber: 'LOT-260923-P', expirationDate: null, putawayPlans: [{ locationId: 'E-03', quantity: 120, capacity: 420, remainingCapacity: 140 }, { locationId: 'E-04', quantity: 94, capacity: 360, remainingCapacity: 117 }] },
  ] },
  ...additionalMockInbounds,
]
function findInbound(id: string) { return mockInbounds.find((inbound) => inbound.id === id) }

export const mockHandlers = [
  http.post('*/api/auth/login', async ({ request }) => {
    const body = (await request.json()) as { username?: string; password?: string }
    if (body.username === DEMO_CREDENTIALS.username && body.password === DEMO_CREDENTIALS.password) {
      return HttpResponse.json({ accessToken: MOCK_ACCESS_TOKEN })
    }
    return HttpResponse.json(
      { message: '아이디 또는 비밀번호가 올바르지 않습니다.', code: 'INVALID_CREDENTIALS' },
      { status: 401 },
    )
  }),

  http.get('*/api/auth/me', ({ request }) => {
    const authorization = request.headers.get('Authorization')
    if (authorization === `Bearer ${MOCK_ACCESS_TOKEN}`) {
      return HttpResponse.json(mockUser)
    }
    return HttpResponse.json({ message: '인증이 필요합니다.', code: 'UNAUTHORIZED' }, { status: 401 })
  }),

  http.get('*/api/warehouses/:warehouseId', ({ params }) => {
    if (Number(params.warehouseId) === mockWarehouse.warehouseId) return HttpResponse.json(mockWarehouse)
    return HttpResponse.json({ message: '창고를 찾을 수 없습니다.', code: 'WAREHOUSE_NOT_FOUND' }, { status: 404 })
  }),

  http.get('*/api/inventories/zone-summary', ({ request }) => {
    const warehouseIds = new URL(request.url).searchParams.getAll('warehouseIds').map(Number)
    const filtered = warehouseIds.length === 0 ? mockZoneSummaries : mockZoneSummaries.filter((summary) => warehouseIds.includes(summary.warehouseId))
    return HttpResponse.json(filtered)
  }),

  http.get('*/api/inbounds', ({ request }) => {
    const params = new URL(request.url).searchParams
    const warehouseIds = params.getAll('warehouseIds').map(Number)
    const scoped = warehouseIds.length ? mockInbounds.filter((inbound) => warehouseIds.includes(inbound.warehouseId)) : mockInbounds
    const statuses = params.get('statuses')?.split(',').filter(Boolean) as InboundStatus[] | undefined
    const filtered = statuses?.length ? scoped.filter((inbound) => statuses.includes(inbound.status)) : scoped
    const page = Math.max(1, Number(params.get('page') ?? 1))
    const size = Math.max(1, Number(params.get('size') ?? 4))
    const statusCounts = Object.fromEntries(['REQUESTED', 'APPROVED', 'ARRIVED', 'WAITING', 'PROCESSING', 'PUTAWAY_READY', 'COMPLETED', 'REJECTED'].map((status) => [status, scoped.filter((inbound) => inbound.status === status).length]))
    return HttpResponse.json({ items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts })
  }),

  http.post('*/api/inbounds/:inboundId/approve', ({ params }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'REQUESTED') return HttpResponse.json({ message: '입고 요청 상태의 건만 승인할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    if (inbound.capacityCheck.status === 'UNAVAILABLE') return HttpResponse.json({ message: '적재 공간이 부족하여 승인할 수 없습니다.', code: 'INSUFFICIENT_CAPACITY' }, { status: 409 })
    if (inbound.receivingAreaCheck.status === 'UNAVAILABLE') return HttpResponse.json({ message: '입고처리장 공간이 부족하여 승인할 수 없습니다.', code: 'RECEIVING_AREA_UNAVAILABLE' }, { status: 409 })
    inbound.status = 'APPROVED'
    return HttpResponse.json(inbound)
  }),

  http.post('*/api/inbounds/:inboundId/mark-arrived', ({ params }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'APPROVED') return HttpResponse.json({ message: '승인된 입고 건만 도착 처리할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    inbound.status = 'ARRIVED'
    return HttpResponse.json(inbound)
  }),

  http.post('*/api/inbounds/:inboundId/move-to-receiving-area', ({ params }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'ARRIVED') return HttpResponse.json({ message: '도착한 입고 건만 입고처리장으로 이동할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    inbound.status = 'WAITING'
    return HttpResponse.json(inbound)
  }),

  http.post('*/api/inbounds/:inboundId/start-inspection', ({ params }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'WAITING') return HttpResponse.json({ message: '검수 대기 상태의 건만 검수를 시작할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    inbound.status = 'PROCESSING'
    return HttpResponse.json(inbound)
  }),

  http.post('*/api/inbounds/:inboundId/complete-inspection', async ({ params, request }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'PROCESSING') return HttpResponse.json({ message: '검수 중인 건만 완료할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    const body = (await request.json()) as CompleteInspectionRequest
    body.items.forEach((result) => {
      const item = inbound.items.find((candidate) => candidate.id === result.inboundItemId)
      if (item) { item.receivedQuantity = result.receivedQuantity; item.qualityStatus = result.qualityStatus; item.lotNumber = item.lotNumber ?? `LOT-260924-${item.targetZoneCode}` }
    })
    inbound.status = 'PUTAWAY_READY'
    return HttpResponse.json(inbound)
  }),

  http.post('*/api/inbounds/:inboundId/complete-putaway', ({ params }) => {
    const inbound = findInbound(String(params.inboundId))
    if (!inbound) return HttpResponse.json({ message: '입고 건을 찾을 수 없습니다.', code: 'INBOUND_NOT_FOUND' }, { status: 404 })
    if (inbound.status !== 'PUTAWAY_READY') return HttpResponse.json({ message: '적재 대기 상태의 건만 완료할 수 있습니다.', code: 'INVALID_INBOUND_STATUS' }, { status: 409 })
    inbound.status = 'COMPLETED'
    return HttpResponse.json(inbound)
  }),
]
