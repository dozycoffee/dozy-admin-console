import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../model/useAuth'

export function RequireAuth() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="auth-loading">인증 확인 중입니다...</div>
  }
  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />
  }
  return <Outlet />
}
