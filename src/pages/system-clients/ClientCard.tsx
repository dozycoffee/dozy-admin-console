import { useState } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { assignableRoles } from '../../features/employee/model/roleAssignment'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { EmployeeStatusBadge } from '../../features/employee/ui/EmployeeStatusBadge'
import { ReasonModal } from '../../features/employee/ui/ReasonModal'
import type { Role } from '../../features/role/model/roleSchemas'
import type { RevealedSecret, SystemClient } from '../../features/system-client/model/systemClientSchemas'
import { useDeactivateSystemClient, useGrantClientRole, useRevokeClientRole, useRotateClientSecret } from '../../features/system-client/model/useSystemClients'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

type Props = {
  client: SystemClient
  allRoles: readonly Role[]
  writable: boolean
  onRotated: (secret: RevealedSecret) => void
}

export function ClientCard({ client, allRoles, writable, onRotated }: Props) {
  const rotate = useRotateClientSecret()
  const grant = useGrantClientRole()
  const revoke = useRevokeClientRole()
  const deactivate = useDeactivateSystemClient()
  const [selectedRole, setSelectedRole] = useState('')
  const [rotateOpen, setRotateOpen] = useState(false)
  const [deactivateOpen, setDeactivateOpen] = useState(false)
  const mutations = [rotate, grant, revoke, deactivate]
  const busy = mutations.some((mutation) => mutation.isPending)
  const error = mutations.find((mutation) => mutation.isError)?.error
  const active = client.status === 'ACTIVE'
  const deactivated = client.status === 'DEACTIVATED'
  // 시스템 클라이언트에는 일반 role만 부여할 수 있고(GOV-06) 정지·비활성화 상태에는 부여할 수 없다(GOV-07).
  const options = assignableRoles(allRoles, client.roles, false)
  const names = new Map(allRoles.map((role) => [role.fullCode, role.name]))

  // 새 작업을 시작하면 이전 작업의 에러 안내를 지운다.
  function start(run: () => void) {
    mutations.forEach((mutation) => mutation.reset())
    run()
  }

  return (
    <li className={`panel client-card ${deactivated ? 'deactivated' : ''}`}>
      <div className="panel-heading">
        <div><p className="eyebrow">{client.clientId}</p><h2>{client.name}</h2></div>
        <EmployeeStatusBadge status={client.status} />
      </div>
      <dl className="employee-fields">
        <div><dt>등록일</dt><dd>{formatDateTime(client.createdAt)}</dd></div>
        <div><dt>secret 발급</dt><dd>{client.secretRotatedAt ? formatDateTime(client.secretRotatedAt) : '-'}</dd></div>
      </dl>
      <h3 className="employee-section-title">부여된 role</h3>
      {client.roles.length > 0
        ? <ul className="employee-roles">
          {client.roles.map((role) => <li key={role} title={names.get(role)}>
            {role}
            {!deactivated && <button type="button" className="employee-role-remove" aria-label={`${role} 회수`} disabled={!writable || busy} onClick={() => start(() => revoke.mutate({ principalId: client.principalId, role }))}>×</button>}
          </li>)}
        </ul>
        : <p className="employee-no-roles">{deactivated ? '비활성화되어 role이 모두 회수되었습니다.' : '부여된 role이 없습니다. 이 클라이언트로 발급한 토큰으로는 어떤 서비스도 호출할 수 없습니다.'}</p>}
      {active && <div className="employee-role-grant">
        <label>role 추가
          <select value={selectedRole} disabled={!writable || busy} onChange={(event) => setSelectedRole(event.target.value)}>
            <option value="">선택</option>
            {options.map((role) => <option key={role.id} value={role.fullCode}>{role.name} ({role.fullCode})</option>)}
          </select>
        </label>
        <button type="button" className="inbound-action-button" disabled={!writable || busy || selectedRole === ''} onClick={() => start(() => grant.mutate({ principalId: client.principalId, role: selectedRole }, { onSuccess: () => setSelectedRole('') }))}>부여</button>
      </div>}
      {client.status === 'SUSPENDED' && <p className="employee-hint">정지된 클라이언트에는 role을 부여할 수 없습니다.</p>}
      {deactivated
        ? <p className="employee-hint">폐기된 클라이언트입니다. clientId는 새로 등록해 다시 쓸 수 있습니다.</p>
        : <div className="employee-actions">
          <button type="button" className="inbound-action-button" disabled={!writable || busy || !active} onClick={() => start(() => setRotateOpen(true))}>secret 재발급</button>
          <button type="button" className="inbound-action-button employee-danger" disabled={!writable || busy} onClick={() => start(() => setDeactivateOpen(true))}>폐기</button>
        </div>}
      {!active && !deactivated && <p className="employee-hint">secret 재발급은 활성 상태에서만 할 수 있습니다.</p>}
      {error && <p className="inbound-error" role="alert">{toAdminErrorMessage(error)}</p>}

      <ConfirmModal
        open={rotateOpen}
        title="secret을 재발급할까요?"
        description="기존 secret은 즉시 무효가 됩니다. 이 클라이언트를 쓰는 서비스에 새 secret을 반영해야 하며, 이미 발급된 토큰은 최대 10분까지 유효합니다."
        confirmLabel="재발급"
        onCancel={() => setRotateOpen(false)}
        onConfirm={() => {
          setRotateOpen(false)
          rotate.mutate(client.principalId, { onSuccess: (rotated) => { onRotated({ clientId: client.clientId, clientSecret: rotated.clientSecret }); rotate.reset() } })
        }}
      />
      <ReasonModal
        open={deactivateOpen}
        title="이 클라이언트를 폐기할까요?"
        description="되돌릴 수 없습니다. secret이 지워지고 모든 role이 회수되며 clientId가 deleted-로 시작하는 값으로 바뀝니다."
        confirmLabel="폐기"
        onCancel={() => setDeactivateOpen(false)}
        onConfirm={(reason) => { setDeactivateOpen(false); deactivate.mutate({ principalId: client.principalId, reason }) }}
      />
    </li>
  )
}
