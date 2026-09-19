import { http, HttpResponse } from 'msw'
import { permissions } from '../features/auth/model/permissions'
import type { CurrentUser } from '../features/auth/model/permissions'

// 실제 인증 서비스가 준비되기 전까지 쓰는 mock 계정 — dozy-wms-api ADR-0010의
// "포트 + mock 어댑터" 패턴을 프런트에도 동일하게 적용한 것이다.
// warehouseIds는 로컬 dev DB에 실제 등록된 창고 id를 가리켜야 하므로, 다른 환경에서는 이 값을 바꿔야 한다.
const DEMO_CREDENTIALS = { username: 'dozy', password: 'dozy1234' }
const MOCK_ACCESS_TOKEN = 'mock-access-token'
const mockUser: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  permissions: [permissions.dashboardRead, permissions.catalogRead, permissions.inventoryRead],
  scope: { warehouseIds: [1481] },
}

export const authHandlers = [
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
