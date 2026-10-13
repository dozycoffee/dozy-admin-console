import type { RequestHandler } from 'msw'
import { catalogMockHandlers } from './catalogHandlers'

// 기본은 MSW로 목킹하는 API가 없다(인증은 dozy-auth, 창고는 dozy-wms-api 실서버로 연동됨).
// 백엔드 계약이 아직 없는 도메인이 생기면 이 목록에 핸들러를 추가한다.
// `VITE_MOCK_CATALOG=true`면 실서버 없이 MD 화면을 볼 수 있도록 로그인과 Catalog 조회를 목으로 응답한다.
export const mockHandlers: RequestHandler[] = import.meta.env.VITE_MOCK_CATALOG === 'true' ? catalogMockHandlers : []
