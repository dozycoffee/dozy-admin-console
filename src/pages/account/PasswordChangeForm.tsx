import { useState, type FormEvent } from 'react'
import { toAccountErrorMessage } from '../../features/account/model/accountErrors'
import { validateNewPassword } from '../../features/account/model/passwordPolicy'
import { useChangePassword } from '../../features/account/model/useMyAccount'
import { NewPasswordFields } from '../../features/account/ui/NewPasswordFields'

export function PasswordChangeForm() {
  const change = useChangePassword()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const valid = currentPassword !== '' && validateNewPassword(newPassword, confirm) === null

  function submit(event: FormEvent) {
    event.preventDefault()
    change.mutate({ currentPassword, newPassword }, {
      onSuccess: () => { setCurrentPassword(''); setNewPassword(''); setConfirm('') },
    })
  }

  return (
    <form className="panel account-panel account-password" onSubmit={submit}>
      <div className="panel-heading"><div><p className="eyebrow">PASSWORD</p><h2>비밀번호 변경</h2></div></div>
      <label>현재 비밀번호
        <input type="password" value={currentPassword} disabled={change.isPending} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" />
      </label>
      <NewPasswordFields password={newPassword} confirm={confirm} disabled={change.isPending} onPasswordChange={setNewPassword} onConfirmChange={setConfirm} />
      <div className="inbound-form-actions">
        <button type="submit" className="inbound-action-button" disabled={!valid || change.isPending}>{change.isPending ? '변경 중...' : '비밀번호 변경'}</button>
      </div>
      {change.isError && <p className="inbound-error" role="alert">{toAccountErrorMessage(change.error)}</p>}
      {change.isSuccess && <p className="employee-success" role="status">비밀번호를 바꿨습니다. 이 기기를 뺀 다른 기기의 로그인은 모두 해제됩니다.</p>}
    </form>
  )
}
