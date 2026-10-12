import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { expiredLinkMessage, isVerificationExpired, toAccountErrorMessage } from '../../features/account/model/accountErrors'
import { validateNewPassword } from '../../features/account/model/passwordPolicy'
import { useResetPassword } from '../../features/account/model/useAccountRecovery'
import { NewPasswordFields } from '../../features/account/ui/NewPasswordFields'

/** 비밀번호 재설정 메일의 링크(`/password/reset?token=`)가 여는 화면. */
export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const reset = useResetPassword()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const valid = validateNewPassword(password, confirm) === null
  const expired = token === '' || (reset.isError && isVerificationExpired(reset.error))

  function submit(event: FormEvent) {
    event.preventDefault()
    reset.mutate({ token, newPassword: password }, {
      // 자동 로그인하지 않고 모든 세션이 폐기된다. 새 비밀번호로 다시 로그인한다.
      onSuccess: () => navigate('/login', { replace: true, state: { notice: '비밀번호를 바꿨습니다. 새 비밀번호로 로그인하세요.' } }),
    })
  }

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">DOZY <span>COFFEE</span></div>
        {expired
          ? <>
            <p className="login-error" role="alert">{expiredLinkMessage}</p>
            <Link className="login-link" to="/password/forgot">재설정 링크 다시 받기</Link>
          </>
          : <>
            <p>새 비밀번호를 정해 주세요.</p>
            <NewPasswordFields password={password} confirm={confirm} disabled={reset.isPending} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
            {reset.isError && <p className="login-error" role="alert">{toAccountErrorMessage(reset.error)}</p>}
            <button type="submit" className="button" disabled={!valid || reset.isPending}>{reset.isPending ? '변경 중...' : '비밀번호 변경'}</button>
          </>}
      </form>
    </div>
  )
}
