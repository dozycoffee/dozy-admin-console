import { useState, type FormEvent } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { CODE_PATTERN, type Audience } from '../../features/role/model/roleSchemas'
import { useCreateAudience } from '../../features/role/model/useRoles'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { FieldTip } from '../../shared/ui/FieldTip'
import { useToast } from '../../shared/ui/toastContext'

const CODE_RULE = 'code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있습니다.'

type Props = { audiences: Audience[]; canCreate: boolean }

/** audience(토큰을 받는 서비스) 목록. 추가는 owner만 할 수 있다. */
export function AudiencePanel({ audiences, canCreate }: Props) {
  const create = useCreateAudience()
  const { notify } = useToast()
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const codeInvalid = code !== '' && !CODE_PATTERN.test(code)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const valid = CODE_PATTERN.test(code) && name.trim() !== ''

  // 서비스는 추가하면 삭제할 수도 code를 바꿀 수도 없으므로, 바로 추가하지 않고 먼저 확인을 받는다.
  function requestCreate(event: FormEvent) {
    event.preventDefault()
    if (valid) setConfirmOpen(true)
  }

  function confirmCreate() {
    setConfirmOpen(false)
    create.mutate(
      { code, name: name.trim(), ...(description.trim() && { description: description.trim() }) },
      { onSuccess: () => { setCode(''); setName(''); setDescription(''); notify('서비스를 추가했습니다.') } },
    )
  }

  return (
    <section className="panel role-audiences">
      <div className="panel-heading"><div><p className="eyebrow">SERVICES</p><h2>서비스</h2></div><small>{audiences.length}개</small></div>
      <ul className="employee-roles">
        {audiences.map((audience) => <li key={audience.id} title={audience.description ?? undefined}>{audience.name} <small>{audience.code}</small></li>)}
      </ul>
      {canCreate
        ? <form className="role-audience-form" onSubmit={requestCreate} aria-label="서비스 추가">
          <div className="field-with-tip">
            <label>code<input value={code} disabled={create.isPending} onChange={(event) => setCode(event.target.value)} placeholder="예: order" autoComplete="off" aria-invalid={codeInvalid} /></label>
            <FieldTip label="code 입력 규칙">{CODE_RULE + ' 등록한 뒤에는 바꿀 수 없고, 서비스는 삭제할 수 없습니다.'}</FieldTip>
          </div>
          <label>이름<input value={name} disabled={create.isPending} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label>
          <label>설명 (선택)<input value={description} disabled={create.isPending} onChange={(event) => setDescription(event.target.value)} autoComplete="off" /></label>
          <button type="submit" className="inbound-action-button" disabled={create.isPending || !valid}>서비스 추가</button>
        </form>
        : <p className="employee-hint">서비스 추가는 owner만 할 수 있습니다.</p>}
      {canCreate && codeInvalid && <p className="inbound-error">{CODE_RULE}</p>}
      {create.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(create.error)}</p>}
      <ConfirmModal
        open={confirmOpen}
        title={`"${name.trim()}" 서비스를 추가할까요?`}
        description={`추가한 서비스는 삭제할 수 없고 code(${code})도 바꿀 수 없습니다. 오타가 없는지 확인하세요.`}
        confirmLabel="추가"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmCreate}
      />
    </section>
  )
}
