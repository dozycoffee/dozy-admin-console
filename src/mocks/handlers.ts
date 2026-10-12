import { http, HttpResponse } from 'msw'
import { permissions } from '../features/auth/model/permissions'
import type { CurrentUser } from '../features/auth/model/permissions'
import { actorModeIds } from '../features/auth/model/actorModes'

// 실제 인증 서비스가 준비되기 전까지 쓰는 mock 계정 — dozy-wms-api ADR-0010의
// "포트 + mock 어댑터" 패턴을 프런트에도 동일하게 적용한 것이다.
// warehouseIds는 MOCK_WAREHOUSE_ID가 실 DB의 창고 id를 가리켜야 한다.
const DEMO_CREDENTIALS = { username: 'dozy', password: 'dozy1234' }
// 실제 dozy-wms-api에 등록된 창고 id. warehouses/zone-summary는 mock이 아니라 실 API를 호출하므로
// 로컬 DB에 존재하는 id여야 하고, 환경마다 다르면 VITE_MOCK_WAREHOUSE_ID로 덮어쓴다.
const MOCK_WAREHOUSE_ID = Number(import.meta.env.VITE_MOCK_WAREHOUSE_ID ?? 543)
const MOCK_ACCESS_TOKEN = 'mock-access-token'
const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  actorModes: [actorModeIds.warehouseManager, actorModeIds.headquartersInventoryManager],
  permissions: [permissions.dashboardRead, permissions.inventoryRead, permissions.inboundRead, permissions.inboundWrite, permissions.outboundRead, permissions.outboundWrite, permissions.disposalRead, permissions.disposalWrite, permissions.returnRead, permissions.returnWrite],
  scope: { warehouseIds: [MOCK_WAREHOUSE_ID] },
}

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
]
