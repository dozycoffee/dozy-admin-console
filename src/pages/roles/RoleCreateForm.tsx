import { useState, type FormEvent } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { CODE_PATTERN, type Audience } from '../../features/role/model/roleSchemas'
import { useCreateRole } from '../../features/role/model/useRoles'

type Props = { audiences: Audience[]; writable: boolean }

export function RoleCreateForm({ audiences, writable }: Props) {
  const create = useCreateRole()
  const [audience, setAudience] = useState('')
  const [code, setCode] = useState('')
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const codeInvalid = code !== '' && !CODE_PATTERN.test(code)
  const valid = audience !== '' && CODE_PATTERN.test(code) && name.trim() !== ''
  const disabled = !writable || create.isPending

  function submit(event: FormEvent) {
    event.preventDefault()
    create.mutate(
      { audience, code, name: name.trim(), ...(description.trim() && { description: description.trim() }) },
      { onSuccess: () => { setCode(''); setName(''); setDescription('') } },
    )
  }

  return (
    <form className="panel employee-invite" onSubmit={submit}>
      <div className="panel-heading"><div><p className="eyebrow">NEW ROLE</p><h2>role 등록</h2></div></div>
      <div className="employee-invite-grid">
        <label>서비스
          <select value={audience} disabled={disabled} onChange={(event) => setAudience(event.target.value)}>
            <option value="">선택</option>
            {audiences.map((item) => <option key={item.id} value={item.code}>{item.name} ({item.code})</option>)}
          </select>
        </label>
        <label>code
          <input value={code} disabled={disabled} onChange={(event) => setCode(event.target.value)} placeholder="예: warehouse_manager" autoComplete="off" aria-invalid={codeInvalid} />
        </label>
        <label>이름<input value={name} disabled={disabled} onChange={(event) => setName(event.target.value)} autoComplete="off" /></label>
        <label>설명 (선택)<input value={description} disabled={disabled} onChange={(event) => setDescription(event.target.value)} autoComplete="off" /></label>
      </div>
      <p className={codeInvalid ? 'inbound-error' : 'employee-hint'}>code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있으며, 등록한 뒤에는 code와 서비스를 바꿀 수 없습니다.</p>
      <div className="inbound-form-actions">
        <button type="submit" className="inbound-action-button" disabled={disabled || !valid}>{create.isPending ? '등록 중...' : 'role 등록'}</button>
      </div>
      {create.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(create.error)}</p>}
      {create.isSuccess && <p className="employee-success" role="status">role을 등록했습니다. 등록만으로는 아무에게도 권한이 생기지 않습니다.</p>}
    </form>
  )
}
