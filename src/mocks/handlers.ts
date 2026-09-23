import { http, HttpResponse } from 'msw'
import { permissions } from '../features/auth/model/permissions'
import type { CurrentUser } from '../features/auth/model/permissions'
import type { Warehouse } from '../features/warehouse/model/warehouseSchemas'
import type { ZoneInventorySummary } from '../features/inventory/model/inventorySchemas'

// 실제 인증 서비스가 준비되기 전까지 쓰는 mock 계정 — dozy-wms-api ADR-0010의
// "포트 + mock 어댑터" 패턴을 프런트에도 동일하게 적용한 것이다.
// warehouseIds는 로컬 dev DB에 실제 등록된 창고 id를 가리켜야 하므로, 다른 환경에서는 이 값을 바꿔야 한다.
const DEMO_CREDENTIALS = { username: 'dozy', password: 'dozy1234' }
const MOCK_ACCESS_TOKEN = 'mock-access-token'
const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  permissions: [permissions.dashboardRead, permissions.inventoryRead],
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
]
