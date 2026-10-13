import { useState, type FormEvent } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import type { Role } from '../../features/role/model/roleSchemas'
import { useUpdateRole } from '../../features/role/model/useRoles'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'

type Props = {
  role: Role
  writable: boolean
  deleting: boolean
  onDelete: (role: Role) => void
}

export function RoleRow({ role, writable, deleting, onDelete }: Props) {
  const update = useUpdateRole()
  const { notify } = useToast()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(role.name)
  const [description, setDescription] = useState(role.description ?? '')
  const locked = !writable || role.isSystem

  function startEdit() {
    setName(role.name)
    setDescription(role.description ?? '')
    update.reset()
    setEditing(true)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const body: { name?: string; description?: string } = {}
    if (name.trim() !== role.name) body.name = name.trim()
    // 설명을 빈 문자열로 보내면 설명이 지워진다.
    if (description.trim() !== (role.description ?? '')) body.description = description.trim()
    if (Object.keys(body).length === 0) {
      setEditing(false)
      return
    }
    update.mutate({ roleId: role.id, body }, { onSuccess: () => { setEditing(false); notify('role을 수정했습니다.') } })
  }

  return (
    <li className="role-row">
      <div className="role-main">
        <div className="role-title">
          <strong>{role.name}</strong>
          {role.isSystem && <span className="inbound-status employee-status employee-status-suspended">system</span>}
          <code className="role-code-chip">{role.fullCode}</code>
        </div>
        {role.description && <p className="role-description">{role.description}</p>}
      </div>
      <span className="role-count">{role.grantedCount}명</span>
      <div className="employee-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={locked || deleting} onClick={startEdit} title={role.isSystem ? 'system role은 수정할 수 없습니다.' : undefined}>수정</button>
        <button type="button" className="inbound-action-button employee-danger" disabled={locked || deleting} onClick={() => onDelete(role)} title={role.isSystem ? 'system role은 삭제할 수 없습니다.' : undefined}>삭제</button>
      </div>
      <Modal open={editing} title={`role 수정 · ${role.name}`} onClose={() => setEditing(false)}>
        <form onSubmit={submit} className="employee-edit">
          <p className="role-code">{role.fullCode}</p>
          <label>이름<input value={name} disabled={update.isPending} onChange={(event) => setName(event.target.value)} /></label>
          <label>설명<input value={description} disabled={update.isPending} onChange={(event) => setDescription(event.target.value)} /></label>
          <p className="employee-hint">code와 서비스는 바꿀 수 없습니다.</p>
          <div className="employee-actions">
            <button type="submit" className="inbound-action-button" disabled={update.isPending || name.trim() === ''}>{update.isPending ? '저장 중...' : '저장'}</button>
            <button type="button" className="inbound-action-button employee-secondary" disabled={update.isPending} onClick={() => setEditing(false)}>취소</button>
          </div>
          {update.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(update.error)}</p>}
        </form>
      </Modal>
    </li>
  )
}
