import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { toAccountErrorMessage } from '../../features/account/model/accountErrors'
import { useRequestPasswordReset } from '../../features/account/model/useAccountRecovery'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function ForgotPasswordPage() {
  const request = useRequestPasswordReset()
  const [email, setEmail] = useState('')
  const valid = emailPattern.test(email.trim())

  function submit(event: FormEvent) {
    event.preventDefault()
    request.mutate(email.trim())
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">DOZY <span>COFFEE</span></div>
        <p>가입한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.</p>
        <label>
          이메일
          <input type="email" value={email} disabled={request.isPending} autoComplete="username" onChange={(event) => setEmail(event.target.value)} />
        </label>
        {request.isError && <p className="login-error" role="alert">{toAccountErrorMessage(request.error)}</p>}
        {/* 계정 존재 여부가 드러나지 않도록 성공 안내는 항상 같다(dozy-auth LGN-04). */}
        {request.isSuccess && <p className="login-notice" role="status">해당 이메일로 가입된 계정이 있으면 재설정 링크를 보냈습니다. 메일함을 확인해 주세요.</p>}
        <button type="submit" className="button" disabled={!valid || request.isPending}>{request.isPending ? '보내는 중...' : '재설정 링크 보내기'}</button>
        <Link className="login-link" to="/login">로그인 화면으로</Link>
      </form>
    </div>
  )
}
