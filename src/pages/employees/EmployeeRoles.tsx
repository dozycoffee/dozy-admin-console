import { useState } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { blockedReason, NO_WRITE_REASON } from '../../features/employee/model/accountProtection'
import type { EmployeeDetail } from '../../features/employee/model/employeeSchemas'
import { assignableRoles, grantBlockedReason, revokeBlockedReason } from '../../features/employee/model/roleAssignment'
import { useGrantRoles, useRevokeRole } from '../../features/employee/model/useEmployees'
import { RoleOptions } from '../../features/role/ui/RoleOptions'
import { useRoles } from '../../features/role/model/useRoles'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useToast } from '../../shared/ui/toastContext'
import type { PendingConfirm } from './EmployeeDetail'

type Props = {
  employee: EmployeeDetail
  writable: boolean
  confirm: (pending: PendingConfirm) => void
}

const ADMIN_ROLE = 'auth:admin'

/** 직원 상세의 role 영역: 부여된 role 표시, 회수, 새 role 부여. */
export function EmployeeRoles({ employee, writable, confirm }: Props) {
  const { can, user } = useAuth()
  const { notify } = useToast()
  const isOwner = can(permissions.accountManage)
  const roles = useRoles()
  const grant = useGrantRoles()
  const revoke = useRevokeRole()
  const [selected, setSelected] = useState('')
  const busy = grant.isPending || revoke.isPending
  const protectedReason = blockedReason('role', employee.roles, isOwner)
  const grantReason = protectedReason ? 'owner·admin 계정의 role은 owner만 변경할 수 있습니다.' : grantBlockedReason({ status: employee.status, isSelf: user?.id === employee.principalId })
  const options = assignableRoles(roles.data ?? [], employee.roles, isOwner)
  const names = new Map(roles.data?.map((role) => [role.fullCode, role.name]))
  const grantDisabledReason = grantReason ?? (writable ? null : NO_WRITE_REASON)
  const error = grant.error ?? revoke.error

  function notifyChanged() {
    notify('role을 변경했습니다. 직원의 다음 로그인·토큰 갱신(최대 10분)부터 권한에 반영됩니다.')
  }

  function startGrant(roleCode: string) {
    grant.reset()
    revoke.reset()
    grant.mutate({ principalId: employee.principalId, roles: [roleCode] }, { onSuccess: () => { setSelected(''); notifyChanged() } })
  }

  function requestGrant() {
    if (selected === '') return
    if (selected === ADMIN_ROLE) {
      confirm({
        title: '이 직원을 admin으로 임명할까요?',
        description: 'admin은 직원·role 관리 권한을 가집니다. owner에게 즉시 알림 메일이 발송됩니다.',
        confirmLabel: '임명',
        run: () => startGrant(selected),
      })
      return
    }
    startGrant(selected)
  }

  function requestRevoke(roleCode: string) {
    const isAdmin = roleCode === ADMIN_ROLE
    confirm({
      title: isAdmin ? '이 직원을 admin에서 해임할까요?' : `${roleCode} role을 회수할까요?`,
      description: isAdmin ? 'admin 권한이 회수됩니다. owner에게 즉시 알림 메일이 발송됩니다.' : '회수한 role은 다시 부여할 수 있습니다.',
      confirmLabel: isAdmin ? '해임' : '회수',
      run: () => {
        grant.reset()
        revoke.reset()
        revoke.mutate({ principalId: employee.principalId, role: roleCode }, { onSuccess: notifyChanged })
      },
    })
  }

  return <>
    <h3 className="employee-section-title">부여된 role</h3>
    {employee.roles.length > 0
      ? <ul className="employee-roles">
        {employee.roles.map((roleCode) => {
          const reason = protectedReason ?? revokeBlockedReason(roleCode, isOwner)
          const disabledReason = reason ?? (writable ? null : NO_WRITE_REASON)
          const showRevoke = roleCode !== 'auth:owner'
          return <li key={roleCode} title={names.get(roleCode)}>
            {roleCode}
            {showRevoke && <Tooltip content={disabledReason}>
              <button type="button" className="employee-role-remove" aria-label={`${roleCode} 회수`} disabled={disabledReason !== null || busy} title={disabledReason ? undefined : '회수'} onClick={() => requestRevoke(roleCode)}>×</button>
            </Tooltip>}
          </li>
        })}
      </ul>
      : <p className="employee-no-roles">부여된 role이 없습니다. role이 없는 직원은 콘솔의 어떤 업무 모드도 사용할 수 없습니다.</p>}
    <Tooltip content={grantDisabledReason} className="employee-role-grant-anchor">
      <div className="employee-role-grant">
        <label>role 추가
          <select value={selected} disabled={grantDisabledReason !== null || busy} onChange={(event) => setSelected(event.target.value)}>
            <option value="">선택</option>
            <RoleOptions roles={options} />
          </select>
        </label>
        <button type="button" className="inbound-action-button" disabled={grantDisabledReason !== null || busy || selected === ''} onClick={requestGrant}>부여</button>
      </div>
    </Tooltip>
    {error && <p className="inbound-error" role="alert">{toAdminErrorMessage(error)}</p>}
  </>
}
