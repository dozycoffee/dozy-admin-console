import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRoles } from '../../role/model/useRoles'
import { toAdminErrorMessage } from '../../auth/model/adminErrors'
import { validateInvite, type InviteField } from '../model/inviteValidation'
import type { InviteStep } from '../model/inviteSteps'
import { useInviteEmployee } from '../model/useEmployees'

export type InvitedEmployee = { principalId: string; invitationExpiresAt: string }

type Props = {
  writable: boolean
  /** 추가에 성공했을 때 부른다. 안내 문구는 모달을 닫은 뒤 화면이 보여준다. */
  onInvited: (invited: InvitedEmployee) => void
  onCancel: () => void
  /** 단계가 바뀔 때(처음 열 때 포함) 부른다. 모달 제목 옆에 단계를 보여주는 데 쓴다. */
  onStepChange?: (step: InviteStep) => void
}

/** role 선택지를 audience별로 묶는다. audience와 그 안의 role은 입력 순서(서버가 내려준 순서)를 유지한다. */
function groupByAudience<T extends { audience: string }>(items: readonly T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(item.audience, [...(groups.get(item.audience) ?? []), item])
  return [...groups]
}

/**
 * 직원 추가 폼(모달 안에서 쓴다). 두 단계로 나눈다: 1) 기본 정보, 2) 함께 부여할 role(선택).
 * role이 늘어나도 기본 정보 입력이 밀려나지 않도록 role은 다음 단계에서 audience별로 묶어 보여준다.
 * 추가하면 초대 메일이 발송된다.
 */
export function InviteEmployeeForm({ writable, onInvited, onCancel, onStepChange }: Props) {
  const roles = useRoles()
  const invite = useInviteEmployee()
  const [email, setEmail] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [address, setAddress] = useState('')
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [step, setStep] = useState<InviteStep>(1)
  useEffect(() => onStepChange?.(step), [step, onStepChange])
  // system role(auth:owner, auth:admin)은 직원을 추가할 때 지정할 수 없다. admin 임명은 role 관리에서 한다.
  const assignableRoles = roles.data?.filter((role) => !role.isSystem) ?? []
  const errors = validateInvite({ email, name })
  // 오류는 필드를 벗어났거나(blur) '다음'을 눌러 본 뒤에만 보여준다. 입력 중에는 띄우지 않는다.
  const [touched, setTouched] = useState<Partial<Record<InviteField, boolean>>>({})
  const emailRef = useRef<HTMLInputElement>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const shownError = (field: InviteField) => (touched[field] ? errors[field] : undefined)
  const disabled = !writable || invite.isPending
  const roleGroups = groupByAudience(assignableRoles)

  function toggleRole(fullCode: string) {
    setSelectedRoles((current) => (current.includes(fullCode) ? current.filter((code) => code !== fullCode) : [...current, fullCode]))
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    // 첫 단계에서는 Enter를 눌러도 추가하지 않고 다음 단계로 넘어간다
    if (step === 1) {
      if (errors.email || errors.name) {
        setTouched({ email: true, name: true })
        ;(errors.email ? emailRef : nameRef).current?.focus()
        return
      }
      setStep(2)
      return
    }
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
          setStep(1)
          setTouched({})
          onInvited({ principalId: created.principalId, invitationExpiresAt: created.invitationExpiresAt })
        },
      },
    )
  }

  return (
    <form className="employee-invite employee-invite-form" onSubmit={submit}>
      {step === 1 && <>
        <div className="employee-invite-grid">
          <div className="employee-invite-field">
            <label>이메일
              <input ref={emailRef} type="email" value={email} disabled={disabled} placeholder="name@dozycoffee.com" aria-invalid={shownError('email') ? true : undefined} aria-describedby={shownError('email') ? 'invite-email-error' : undefined} onChange={(event) => setEmail(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, email: true }))} autoComplete="off" />
            </label>
            <small id="invite-email-error" className="field-error">{shownError('email')}</small>
          </div>
          <div className="employee-invite-field">
            <label>이름
              <input ref={nameRef} value={name} disabled={disabled} placeholder="홍길동" aria-invalid={shownError('name') ? true : undefined} aria-describedby={shownError('name') ? 'invite-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched((current) => ({ ...current, name: true }))} autoComplete="off" />
            </label>
            <small id="invite-name-error" className="field-error">{shownError('name')}</small>
          </div>
          <div className="employee-invite-field">
            <label>전화번호 (선택)<input value={phone} disabled={disabled} placeholder="010-1234-5678" onChange={(event) => setPhone(event.target.value)} autoComplete="off" /></label>
            <small className="field-error" aria-hidden="true" />
          </div>
          <div className="employee-invite-field">
            <label>주소 (선택)<input value={address} disabled={disabled} placeholder="서울특별시 강남구 테헤란로 152" onChange={(event) => setAddress(event.target.value)} autoComplete="off" /></label>
            <small className="field-error" aria-hidden="true" />
          </div>
        </div>
        <div className="inbound-form-actions">
          <button type="button" className="inbound-action-button employee-secondary" onClick={onCancel}>취소</button>
          <button type="submit" className="inbound-action-button" disabled={disabled}>다음</button>
        </div>
      </>}
      {step === 2 && <>
        <fieldset className="employee-role-picker" disabled={disabled}>
          <legend>함께 부여할 role (선택)</legend>
          {roles.isLoading && <p>role 목록을 불러오는 중입니다...</p>}
          {roles.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(roles.error)}</p>}
          {roles.data && assignableRoles.length === 0 && <p>부여할 수 있는 role이 아직 없습니다. role 정의는 dozy-auth 관리 API로 등록합니다.</p>}
          {roleGroups.map(([audience, groupRoles]) => (
            <div key={audience} role="group" aria-label={`${audience.toUpperCase()} role`} className="employee-role-group">
              <h3 className="employee-role-audience">{audience.toUpperCase()}</h3>
              {groupRoles.map((role) => (
                <label key={role.id}>
                  <input type="checkbox" checked={selectedRoles.includes(role.fullCode)} onChange={() => toggleRole(role.fullCode)} />
                  {role.name} <small>{role.fullCode}</small>
                </label>
              ))}
            </div>
          ))}
        </fieldset>
        <p className="employee-hint">추가하면 입력한 이메일로 초대 메일이 발송됩니다. 직원이 링크에서 비밀번호를 정하면 계정이 활성화되고, 그 전까지는 "초대 대기" 상태입니다.</p>
        <div className="inbound-form-actions">
          <button type="button" className="inbound-action-button employee-secondary" disabled={invite.isPending} onClick={() => setStep(1)}>이전</button>
          <button type="submit" className="inbound-action-button" disabled={disabled}>{invite.isPending ? '추가 중...' : '직원 추가하기'}</button>
        </div>
      </>}
      {invite.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(invite.error)}</p>}
    </form>
  )
}
