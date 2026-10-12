import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { expiredLinkMessage, isVerificationExpired, toAccountErrorMessage } from '../../features/account/model/accountErrors'
import { validateNewPassword } from '../../features/account/model/passwordPolicy'
import { useAcceptInvitation, useInvitation } from '../../features/account/model/useAccountRecovery'
import { NewPasswordFields } from '../../features/account/ui/NewPasswordFields'

/** 초대 메일의 링크(`/invitation?token=`)가 여는 화면. 비밀번호를 정하면 계정이 활성화된다. */
export function InvitationPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const invitation = useInvitation(token)
  const accept = useAcceptInvitation()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const valid = validateNewPassword(password, confirm) === null

  function submit(event: FormEvent) {
    event.preventDefault()
    accept.mutate({ token, password }, {
      // 자동 로그인하지 않는다. 링크가 다른 기기에서 열릴 수 있기 때문이다(dozy-auth).
      onSuccess: () => navigate('/login', { replace: true, state: { notice: '비밀번호를 설정했습니다. 이메일과 비밀번호로 로그인하세요.' } }),
    })
  }

  const expired = token === '' || (invitation.isError && isVerificationExpired(invitation.error)) || (accept.isError && isVerificationExpired(accept.error))

  return (
    <div className="login-page">
      <form className="login-card" onSubmit={submit}>
        <div className="brand">DOZY <span>COFFEE</span></div>
        {expired && <>
          <p className="login-error" role="alert">{expiredLinkMessage}</p>
          <Link className="login-link" to="/login">로그인 화면으로</Link>
        </>}
        {!expired && invitation.isLoading && <p>초대를 확인하는 중입니다...</p>}
        {!expired && invitation.isError && <p className="login-error" role="alert">{toAccountErrorMessage(invitation.error)}</p>}
        {!expired && invitation.data && <>
          <p>{invitation.data.name}님, 관리자 콘솔에 초대되었습니다. 비밀번호를 정하면 계정을 사용할 수 있습니다.</p>
          <small className="login-hint">로그인 이메일: {invitation.data.maskedEmail}</small>
          <NewPasswordFields password={password} confirm={confirm} disabled={accept.isPending} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
          {accept.isError && <p className="login-error" role="alert">{toAccountErrorMessage(accept.error)}</p>}
          <button type="submit" className="button" disabled={!valid || accept.isPending}>{accept.isPending ? '설정 중...' : '비밀번호 설정'}</button>
        </>}
      </form>
    </div>
  )
}
