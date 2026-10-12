import type { RequestHandler } from 'msw'

// 지금은 MSW로 목킹하는 API가 없다(인증은 dozy-auth 실서버로 연동됨).
// 백엔드 계약이 아직 없는 도메인이 생기면 이 목록에 핸들러를 추가한다.
export const mockHandlers: RequestHandler[] = []
