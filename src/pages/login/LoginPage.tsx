import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { ApiError } from '../../shared/api/ApiError'
import { useAuth } from '../../features/auth/model/useAuth'

// dozy-auth는 문구가 아니라 code로만 분기하도록 하므로 안내 문구는 콘솔이 정한다.
const loginErrorMessages: Record<string, string> = {
  INVALID_CREDENTIALS: '이메일 또는 비밀번호가 올바르지 않습니다.',
  ACCOUNT_SUSPENDED: '정지된 계정입니다. 관리자에게 문의해주세요.',
  TOO_MANY_ATTEMPTS: '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.',
  VALIDATION_FAILED: '이메일과 비밀번호를 올바르게 입력해주세요.',
}

function toLoginErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === null) return error.message
    return (error.code && loginErrorMessages[error.code]) || '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'
  }
  return '로그인에 실패했습니다.'
}

export function LoginPage() {
  const { user, login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  if (user) {
    return <Navigate to="/" replace />
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (loginError) {
      setError(toLoginErrorMessage(loginError))
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={handleSubmit}>
        <div className="brand">DOZY <span>COFFEE</span></div>
        <p>관리자 콘솔에 로그인하세요.</p>
        <label>
          이메일
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="username" />
        </label>
        <label>
          비밀번호
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="current-password"
          />
        </label>
        {error && <p className="login-error">{error}</p>}
        <button type="submit" className="button" disabled={isSubmitting}>
          {isSubmitting ? '로그인 중...' : '로그인'}
        </button>
      </form>
    </div>
  )
}
