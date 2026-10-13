import { useRef, useState, type CSSProperties, type FormEvent } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { groupByAudience } from '../../features/role/model/groupRoles'
import { useRoles } from '../../features/role/model/useRoles'
import { CLIENT_ID_RULE, validateRegister, type RegisterField } from '../../features/system-client/model/registerValidation'
import { CLIENT_NAME_MAX_LENGTH, type RevealedSecret } from '../../features/system-client/model/systemClientSchemas'
import { useRegisterSystemClient } from '../../features/system-client/model/useSystemClients'
import { FieldTip } from '../../shared/ui/FieldTip'

type Props = {
  writable: boolean
  /** 등록 응답의 secret을 한 번 보여주기 위해 넘긴다. */
  onRegistered: (secret: RevealedSecret) => void
  onCancel: () => void
}

/** 시스템 클라이언트 등록 폼(모달 안에서 쓴다). 등록하면 secret을 한 번만 보여준다. */
export function RegisterClientForm({ writable, onRegistered, onCancel }: Props) {
  const roles = useRoles()
  const register = useRegisterSystemClient()
  const [clientId, setClientId] = useState('')
  const [name, setName] = useState('')
  const [selected, setSelected] = useState<string[]>([])
  // 오류는 필드를 벗어났거나(blur) '등록'을 눌러 본 뒤에만 보여준다. 입력 중에는 띄우지 않는다.
  const [touched, setTouched] = useState<Partial<Record<RegisterField, boolean>>>({})
  const clientIdRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  // system role(auth:owner, auth:admin)은 시스템 클라이언트에 부여할 수 없다(GOV-06).
  const assignable = roles.data?.filter((role) => !role.isSystem) ?? []
  const roleGroups = groupByAudience(assignable)
  const errors = validateRegister({ clientId, name })
  const shownError = (field: RegisterField) => (touched[field] ? errors[field] : undefined)
  const disabled = !writable || register.isPending

  function toggle(fullCode: string) {
    setSelected((current) => (current.includes(fullCode) ? current.filter((code) => code !== fullCode) : [...current, fullCode]))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if (errors.clientId || errors.name) {
      setTouched({ clientId: true, name: true })
      ;(errors.clientId ? clientIdRef : nameRef).current?.focus()
      return
    }
    register.mutate(
      { clientId, name: name.trim(), ...(selected.length > 0 && { roles: selected }) },
      {
        onSuccess: (created) => {
          setClientId('')
          setName('')
          setSelected([])
          setTouched({})
          onRegistered({ clientId: created.clientId, clientSecret: created.clientSecret })
          register.reset()
        },
      },
    )
  }

  return (
    <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
      <div className="employee-invite-grid">
        <div className="employee-invite-field field-with-tip" style={{ '--tip-left': '56px' } as CSSProperties}>
          <label>clientId
            <input ref={clientIdRef} value={clientId} disabled={disabled} placeholder="svc-store" aria-invalid={shownError('clientId') ? true : undefined} aria-describedby={shownError('clientId') ? 'register-client-id-error' : undefined} onChange={(event) => setClientId(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, clientId: true }))} autoComplete="off" />
          </label>
          <FieldTip label="clientId 입력 규칙">{CLIENT_ID_RULE + ' 등록한 뒤에는 바꿀 수 없습니다.'}</FieldTip>
          <small id="register-client-id-error" className="field-error">{shownError('clientId')}</small>
        </div>
        <div className="employee-invite-field">
          <label>이름
            <input ref={nameRef} value={name} maxLength={CLIENT_NAME_MAX_LENGTH} disabled={disabled} placeholder="Store 서비스" aria-invalid={shownError('name') ? true : undefined} aria-describedby={shownError('name') ? 'register-client-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, name: true }))} autoComplete="off" />
          </label>
          <small id="register-client-name-error" className="field-error">{shownError('name')}</small>
        </div>
      </div>
      <fieldset className="employee-role-picker" disabled={disabled}>
        <legend>부여할 role (선택)</legend>
        {roles.isLoading && <p>role 목록을 불러오는 중입니다...</p>}
        {roles.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(roles.error)}</p>}
        {roles.data && assignable.length === 0 && <p>부여할 수 있는 role이 아직 없습니다.</p>}
        {roleGroups.map(([audience, groupRoles]) => (
          <div key={audience} role="group" aria-label={`${audience.toUpperCase()} role`} className="employee-role-group">
            <h3 className="employee-role-audience">{audience.toUpperCase()}</h3>
            {groupRoles.map((role) => (
              <label key={role.id}>
                <input type="checkbox" checked={selected.includes(role.fullCode)} onChange={() => toggle(role.fullCode)} />
                {role.name} <small>{role.fullCode}</small>
              </label>
            ))}
          </div>
        ))}
      </fieldset>
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={register.isPending} onClick={onCancel}>취소</button>
        <button type="submit" className="inbound-action-button" disabled={disabled}>{register.isPending ? '등록 중...' : '시스템 클라이언트 등록'}</button>
      </div>
      {register.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(register.error)}</p>}
    </form>
  )
}
