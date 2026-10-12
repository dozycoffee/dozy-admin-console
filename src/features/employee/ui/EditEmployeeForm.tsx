import { useState, type FormEvent } from 'react'
import { toEmployeeErrorMessage } from '../model/employeeErrors'
import { buildUpdateRequest } from '../model/buildUpdateRequest'
import type { EmployeeDetail } from '../model/employeeSchemas'
import { useUpdateEmployee } from '../model/useEmployees'

type Props = {
  employee: EmployeeDetail
  disabled: boolean
  onDone: () => void
}

export function EditEmployeeForm({ employee, disabled, onDone }: Props) {
  const update = useUpdateEmployee()
  const [name, setName] = useState(employee.name)
  const [phone, setPhone] = useState(employee.phone ?? '')
  const [address, setAddress] = useState(employee.address ?? '')
  const locked = disabled || update.isPending

  function submit(event: FormEvent) {
    event.preventDefault()
    const body = buildUpdateRequest(employee, { name, phone, address })
    if (Object.keys(body).length === 0) {
      onDone()
      return
    }
    update.mutate({ principalId: employee.principalId, body }, { onSuccess: onDone })
  }

  return (
    <form className="employee-edit" onSubmit={submit}>
      <label>이름<input value={name} disabled={locked} onChange={(event) => setName(event.target.value)} /></label>
      <label>전화번호<input value={phone} disabled={locked} onChange={(event) => setPhone(event.target.value)} /></label>
      <label>주소<input value={address} disabled={locked} onChange={(event) => setAddress(event.target.value)} /></label>
      <p className="employee-hint">이메일(로그인 ID)은 바꿀 수 없습니다.</p>
      <div className="employee-actions">
        <button type="submit" className="inbound-action-button" disabled={locked || name.trim() === ''}>{update.isPending ? '저장 중...' : '저장'}</button>
        <button type="button" className="inbound-action-button employee-secondary" disabled={update.isPending} onClick={onDone}>취소</button>
      </div>
      {update.isError && <p className="inbound-error" role="alert">{toEmployeeErrorMessage(update.error)}</p>}
    </form>
  )
}
