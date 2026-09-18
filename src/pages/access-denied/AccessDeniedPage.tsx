import { Link, useLocation } from 'react-router-dom'

type AccessDeniedState = { from?: string; permission?: string }

export function AccessDeniedPage() {
  const access = (useLocation().state ?? {}) as AccessDeniedState
  return (
    <section className="access-denied">
      <div className="lock-mark">!</div>
      <p>접근 제한</p>
      <h1>이 기능을 사용할 권한이 없습니다</h1>
      <span>필요한 권한: <strong>{access.permission ?? '확인 필요'}</strong></span>
      {access.from && <small>요청한 경로: {access.from}</small>}
      <Link to="/">대시보드로 돌아가기</Link>
    </section>
  )
}
