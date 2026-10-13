import { useId, useState } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { assignableRoles } from '../../features/employee/model/roleAssignment'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { EmployeeStatusBadge } from '../../features/employee/ui/EmployeeStatusBadge'
import { ReasonModal } from '../../features/employee/ui/ReasonModal'
import type { Role } from '../../features/role/model/roleSchemas'
import type { RevealedSecret, SystemClient } from '../../features/system-client/model/systemClientSchemas'
import { useDeactivateSystemClient, useGrantClientRole, useRevokeClientRole, useRotateClientSecret } from '../../features/system-client/model/useSystemClients'
import { RoleOptions } from '../../features/role/ui/RoleOptions'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useToast } from '../../shared/ui/toastContext'

const NO_WRITE_REASON = '시스템 클라이언트를 변경할 권한이 없습니다.'
const ROLE_CHANGED_NOTICE = 'role을 변경했습니다. 이미 발급된 토큰에는 최대 10분 뒤에 반영됩니다.'

type Props = {
  client: SystemClient
  allRoles: readonly Role[]
  writable: boolean
  onRotated: (secret: RevealedSecret) => void
  /** 상세(정보·role·작업)를 펼쳐 보여줄지. 접어도 이름·clientId·상태·role 수는 보인다. */
  expanded: boolean
  onToggle: () => void
}

export function ClientCard({ client, allRoles, writable, onRotated, expanded, onToggle }: Props) {
  const bodyId = useId()
  const { notify } = useToast()
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
  const deactivated = client.status === 'DEACTIVATED'
  // 시스템 클라이언트에는 일반 role만 부여할 수 있고(GOV-06) 정지·비활성화 상태에는 부여할 수 없다(GOV-07).
  const options = assignableRoles(allRoles, client.roles, false)
  const names = new Map(allRoles.map((role) => [role.fullCode, role.name]))
  // 컨트롤은 상태와 관계없이 항상 같은 자리에 두고, 할 수 없는 이유는 비활성 컨트롤의 툴팁으로 알려 준다.
  const writeReason = writable ? null : NO_WRITE_REASON
  const grantReason = writeReason ?? (client.status === 'SUSPENDED' ? '정지된 클라이언트에는 role을 부여할 수 없습니다.' : deactivated ? '폐기된 클라이언트에는 role을 부여할 수 없습니다.' : null)
  const rotateReason = writeReason ?? (client.status === 'SUSPENDED' ? '정지된 클라이언트는 secret을 재발급할 수 없습니다. 활성 상태에서만 할 수 있습니다.' : deactivated ? '폐기된 클라이언트는 secret을 재발급할 수 없습니다.' : null)
  const deactivateReason = writeReason ?? (deactivated ? '이미 폐기된 클라이언트입니다. clientId는 새로 등록해 다시 쓸 수 있습니다.' : null)

  // 새 작업을 시작하면 이전 작업의 에러 안내를 지운다.
  function start(run: () => void) {
    mutations.forEach((mutation) => mutation.reset())
    run()
  }

  return (
    <li className={`panel client-card ${deactivated ? 'deactivated' : ''} ${expanded ? '' : 'collapsed'}`}>
      <div className="panel-heading client-heading">
        <div>
          <p className="eyebrow">{client.clientId}</p>
          <h2>
            <button type="button" className="client-toggle" aria-expanded={expanded} aria-controls={bodyId} onClick={onToggle}>
              {client.name}<span className="client-chevron" aria-hidden="true" />
            </button>
          </h2>
        </div>
        <div className="client-heading-meta">
          <span className="client-role-count">role {client.roles.length}개</span>
          <EmployeeStatusBadge status={client.status} />
        </div>
      </div>
      <div id={bodyId} hidden={!expanded}>
      <dl className="employee-fields">
        <div><dt>등록일</dt><dd>{formatDateTime(client.createdAt)}</dd></div>
        <div><dt>secret 발급</dt><dd>{client.secretRotatedAt ? formatDateTime(client.secretRotatedAt) : '-'}</dd></div>
      </dl>
      <h3 className="employee-section-title">부여된 role</h3>
      {client.roles.length > 0
        ? <ul className="employee-roles">
          {client.roles.map((role) => <li key={role} title={names.get(role)}>
            {role}
            {!deactivated && <Tooltip content={writeReason}>
              <button type="button" className="employee-role-remove" aria-label={`${role} 회수`} disabled={writeReason !== null || busy} title={writeReason ? undefined : '회수'} onClick={() => start(() => revoke.mutate({ principalId: client.principalId, role }, { onSuccess: () => notify(ROLE_CHANGED_NOTICE) }))}>×</button>
            </Tooltip>}
          </li>)}
        </ul>
        : <p className="employee-no-roles">{deactivated ? '비활성화되어 role이 모두 회수되었습니다.' : '부여된 role이 없습니다. 이 클라이언트로 발급한 토큰으로는 어떤 서비스도 호출할 수 없습니다.'}</p>}
      <Tooltip content={grantReason} className="employee-role-grant-anchor">
        <div className="employee-role-grant">
          <label>role 추가
            <select value={selectedRole} disabled={grantReason !== null || busy} onChange={(event) => setSelectedRole(event.target.value)}>
              <option value="">선택</option>
              <RoleOptions roles={options} />
            </select>
          </label>
          <button type="button" className="inbound-action-button" disabled={grantReason !== null || busy || selectedRole === ''} onClick={() => start(() => grant.mutate({ principalId: client.principalId, role: selectedRole }, { onSuccess: () => { setSelectedRole(''); notify(ROLE_CHANGED_NOTICE) } }))}>부여</button>
        </div>
      </Tooltip>
      <div className="employee-actions">
        <Tooltip content={rotateReason}>
          <button type="button" className="inbound-action-button" disabled={rotateReason !== null || busy} onClick={() => start(() => setRotateOpen(true))}>secret 재발급</button>
        </Tooltip>
        <Tooltip content={deactivateReason}>
          <button type="button" className="inbound-action-button employee-danger" disabled={deactivateReason !== null || busy} onClick={() => start(() => setDeactivateOpen(true))}>폐기</button>
        </Tooltip>
      </div>
      {error && <p className="inbound-error" role="alert">{toAdminErrorMessage(error)}</p>}
      </div>

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
        onConfirm={(reason) => { setDeactivateOpen(false); deactivate.mutate({ principalId: client.principalId, reason }, { onSuccess: () => notify('클라이언트를 폐기했습니다.') }) }}
      />
    </li>
  )
}
