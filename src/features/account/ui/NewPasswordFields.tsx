import { useState } from 'react'
import { PASSWORD_MAX_LENGTH, PASSWORD_MIN_LENGTH, validateNewPassword } from '../model/passwordPolicy'

type Props = {
  password: string
  confirm: string
  disabled: boolean
  onPasswordChange: (value: string) => void
  onConfirmChange: (value: string) => void
}

/** 새 비밀번호와 확인 입력. 확인 입력을 건드린 뒤에 정책 위반·불일치를 안내한다. */
export function NewPasswordFields({ password, confirm, disabled, onPasswordChange, onConfirmChange }: Props) {
  const [touched, setTouched] = useState(false)
  const problem = touched ? validateNewPassword(password, confirm) : null

  return <>
    <label>
      새 비밀번호
      <input type="password" value={password} disabled={disabled} autoComplete="new-password" onChange={(event) => onPasswordChange(event.target.value)} />
    </label>
    <label>
      새 비밀번호 확인
      <input type="password" value={confirm} disabled={disabled} autoComplete="new-password" onChange={(event) => { setTouched(true); onConfirmChange(event.target.value) }} />
    </label>
    <small className="login-hint">{PASSWORD_MIN_LENGTH}~{PASSWORD_MAX_LENGTH}자. 문자 조합 제한은 없지만 이메일과 같은 비밀번호는 쓸 수 없습니다.</small>
    {problem && <p className="login-error" role="alert">{problem}</p>}
  </>
}
