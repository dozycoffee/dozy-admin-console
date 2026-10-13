import { useState, type FormEvent } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { useRoles } from '../../features/role/model/useRoles'
import { CLIENT_NAME_MAX_LENGTH, isValidClientId, type RevealedSecret } from '../../features/system-client/model/systemClientSchemas'
import { useRegisterSystemClient } from '../../features/system-client/model/useSystemClients'

type Props = {
  writable: boolean
  /** 등록 응답의 secret을 한 번 보여주기 위해 넘긴다. */
  onRegistered: (secret: RevealedSecret) => void
}

export function RegisterClientForm({ writable, onRegistered }: Props) {
  const roles = useRoles()
  const register = useRegisterSystemClient()
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  // system role(auth:owner, auth:admin)은 시스템 클라이언트에 부여할 수 없다(GOV-06).
  const assignable = roles.data?.filter((role) => !role.isSystem) ?? []
  const clientIdInvalid = clientId !== '' && !isValidClientId(clientId)
  const valid = isValidClientId(clientId) && name.trim() !== '' && name.trim().length <= CLIENT_NAME_MAX_LENGTH
  const disabled = !writable || register.isPending

  function toggle(fullCode: string) {
    setSelected((current) => (current.includes(fullCode) ? current.filter((code) => code !== fullCode) : [...current, fullCode]))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    register.mutate(
      { clientId, name: name.trim(), ...(selected.length > 0 && { roles: selected }) },
      {
        onSuccess: (created) => {
          setClientId('')
          setName('')
          setSelected([])
          onRegistered({ clientId: created.clientId, clientSecret: created.clientSecret })
          register.reset()
        },
      },
    )
  }

  return (
    <form className="panel employee-invite" onSubmit={submit}>
      <div className="panel-heading"><div><p className="eyebrow">NEW SYSTEM CLIENT</p><h2>시스템 클라이언트 등록</h2></div></div>
      <div className="employee-invite-grid">
        <label>clientId
          <input value={clientId} disabled={disabled} onChange={(event) => setClientId(event.target.value)} placeholder="예: svc-store" autoComplete="off" aria-invalid={clientIdInvalid} />
        </label>
        <label>이름<input value={name} maxLength={CLIENT_NAME_MAX_LENGTH} disabled={disabled} onChange={(event) => setName(event.target.value)} placeholder="예: Store 서비스" autoComplete="off" /></label>
      </div>
      <p className={clientIdInvalid ? 'inbound-error' : 'employee-hint'}>clientId는 <code>svc-</code>로 시작하는 소문자·숫자·하이픈 형식입니다(예: svc-store, svc-store-sync). 등록한 뒤에는 바꿀 수 없습니다.</p>
      <fieldset className="employee-role-picker" disabled={disabled}>
        <legend>부여할 role (선택)</legend>
        {roles.isLoading && <p>role 목록을 불러오는 중입니다...</p>}
        {roles.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(roles.error)}</p>}
        {roles.data && assignable.length === 0 && <p>부여할 수 있는 role이 아직 없습니다.</p>}
        {assignable.map((role) => (
          <label key={role.id}>
            <input type="checkbox" checked={selected.includes(role.fullCode)} onChange={() => toggle(role.fullCode)} />
            {role.name} <small>{role.fullCode}</small>
          </label>
        ))}
      </fieldset>
      <div className="inbound-form-actions">
        <button type="submit" className="inbound-action-button" disabled={disabled || !valid}>{register.isPending ? '등록 중...' : '시스템 클라이언트 등록'}</button>
      </div>
      {register.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(register.error)}</p>}
    </form>
  )
}
