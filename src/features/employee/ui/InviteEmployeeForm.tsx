import { useState, type FormEvent } from 'react'
import { useRoles } from '../../role/model/useRoles'
import { toAdminErrorMessage } from '../../auth/model/adminErrors'
import { formatDateTime } from '../model/formatDateTime'
import { useInviteEmployee } from '../model/useEmployees'

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type Props = {
  writable: boolean
  onInvited: (principalId: string) => void
}

export function InviteEmployeeForm({ writable, onInvited }: Props) {
  const roles = useRoles()
  const invite = useInviteEmployee()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  // system role(auth:owner, auth:admin)은 초대 때 지정할 수 없다. admin 임명은 role 관리에서 한다.
  const assignableRoles = roles.data?.filter((role) => !role.isSystem) ?? []
  const valid = emailPattern.test(email.trim()) && name.trim() !== ''
  const disabled = !writable || invite.isPending

  function toggleRole(fullCode: string) {
    setSelectedRoles((current) => (current.includes(fullCode) ? current.filter((code) => code !== fullCode) : [...current, fullCode]))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    invite.mutate(
      {
        email: email.trim(),
        name: name.trim(),
        ...(phone.trim() && { phone: phone.trim() }),
        ...(address.trim() && { address: address.trim() }),
        ...(selectedRoles.length > 0 && { roles: selectedRoles }),
      },
      {
        onSuccess: (created) => {
          setEmail('')
          setName('')
          setPhone('')
          setAddress('')
          setSelectedRoles([])
          onInvited(created.principalId)
        },
      },
    )
  }

  return (
    <form className="panel employee-invite" onSubmit={submit}>
      <div className="panel-heading"><div><p className="eyebrow">NEW EMPLOYEE</p><h2>직원 초대</h2></div></div>
      <div className="employee-invite-grid">
        <label>이메일<input type="email" value={email} disabled={disabled} onChange={(event) => setEmail(event.target.value)} autoComplete="off" /></label>
        <label>이름<input value={name} disabled={disabled} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label>
        <label>전화번호 (선택)<input value={phone} disabled={disabled} onChange={(event) => setPhone(event.target.value)} autoComplete="off" /></label>
        <label>주소 (선택)<input value={address} disabled={disabled} onChange={(event) => setAddress(event.target.value)} autoComplete="off" /></label>
      </div>
      <fieldset className="employee-role-picker" disabled={disabled}>
        <legend>함께 부여할 role (선택)</legend>
        {roles.isLoading && <p>role 목록을 불러오는 중입니다...</p>}
        {roles.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(roles.error)}</p>}
        {roles.data && assignableRoles.length === 0 && <p>부여할 수 있는 role이 아직 없습니다. role 정의는 dozy-auth 관리 API로 등록합니다.</p>}
        {assignableRoles.map((role) => (
          <label key={role.id}>
            <input type="checkbox" checked={selectedRoles.includes(role.fullCode)} onChange={() => toggleRole(role.fullCode)} />
            {role.name} <small>{role.fullCode}</small>
          </label>
        ))}
      </fieldset>
      <div className="inbound-form-actions">
        <button type="submit" className="inbound-action-button" disabled={disabled || !valid}>{invite.isPending ? '초대 중...' : '초대 메일 보내기'}</button>
      </div>
      {invite.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(invite.error)}</p>}
      {invite.isSuccess && <p className="employee-success" role="status">초대 메일을 보냈습니다. 초대는 {formatDateTime(invite.data.invitationExpiresAt)}까지 유효합니다.</p>}
    </form>
  )
}
