import { useState } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import type { Role } from '../../features/role/model/roleSchemas'
import { useAudiences, useDeleteRole, useRoles } from '../../features/role/model/useRoles'
import { ApiError } from '../../shared/api/ApiError'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { AudiencePanel } from './AudiencePanel'
import { RoleCreateForm } from './RoleCreateForm'
import { RoleRow } from './RoleRow'

type DeleteTarget = { role: Role; inUse: boolean }

export function RolesPage() {
  const { can } = useAuth()
  const writable = can(permissions.accountWrite)
  const [audienceFilter, setAudienceFilter] = useState('')
  const audiencesQuery = useAudiences()
  const rolesQuery = useRoles(audienceFilter || undefined)
  const deleteRole = useDeleteRole()
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null)
  const audiences = audiencesQuery.data ?? []
  const roles = rolesQuery.data ?? []

  function requestDelete(role: Role) {
    deleteRole.reset()
    setDeleteTarget({ role, inUse: false })
  }

  // 먼저 그냥 삭제를 요청하고, 부여된 직원이 있어 거부(ROLE_IN_USE)되면 영향 인원을 보여준 뒤 확인을 받아 revokeAll로 다시 요청한다.
  function confirmDelete() {
    if (!deleteTarget) return
    const target = deleteTarget
    setDeleteTarget(null)
    deleteRole.mutate({ roleId: target.role.id, revokeAll: target.inUse }, {
      onError: (error) => {
        if (!target.inUse && error instanceof ApiError && error.code === 'ROLE_IN_USE') {
          const latest = rolesQuery.data?.find((role) => role.id === target.role.id) ?? target.role
          setDeleteTarget({ role: latest, inUse: true })
        }
      },
    })
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>ACCOUNT ADMINISTRATION</p><h1>role 관리</h1></div>
    </header>
    <p className="employee-hint role-intro">role은 서비스(audience)별 권한 묶음입니다. 여기서는 role 정의만 관리하며, 직원에게 부여하는 것은 직원 관리에서 합니다.</p>
    {audiencesQuery.isError && <section className="panel"><p className="inbound-error" role="alert">{toAdminErrorMessage(audiencesQuery.error)}</p></section>}
    {audiencesQuery.data && <AudiencePanel audiences={audiences} canCreate={can(permissions.accountManage)} />}
    {audiencesQuery.data && <RoleCreateForm audiences={audiences} writable={writable} />}
    <section className="panel role-list-panel">
      <div className="panel-heading">
        <div><p className="eyebrow">ROLES</p><h2>role 목록</h2></div>
        <label className="role-filter">audience
          <select value={audienceFilter} onChange={(event) => setAudienceFilter(event.target.value)}>
            <option value="">전체</option>
            {audiences.map((audience) => <option key={audience.id} value={audience.code}>{audience.name} ({audience.code})</option>)}
          </select>
        </label>
      </div>
      {rolesQuery.isLoading && <p>role 목록을 불러오는 중입니다...</p>}
      {rolesQuery.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(rolesQuery.error)}</p>}
      {rolesQuery.data && roles.length === 0 && <p className="inbound-empty">등록된 role이 없습니다.</p>}
      <ul className="role-list">
        {roles.map((role) => <RoleRow key={role.id} role={role} writable={writable} deleting={deleteRole.isPending} onDelete={requestDelete} />)}
      </ul>
      {deleteRole.isError && !deleteTarget && <p className="inbound-error" role="alert">{toAdminErrorMessage(deleteRole.error)}</p>}
      {deleteRole.isSuccess && <p className="employee-success" role="status">role을 삭제했습니다.</p>}
    </section>
    <ConfirmModal
      open={deleteTarget !== null}
      title={deleteTarget?.inUse ? `${deleteTarget.role.grantedCount}명에게 부여된 role입니다` : `"${deleteTarget?.role.name ?? ''}" role을 삭제할까요?`}
      description={deleteTarget?.inUse ? `삭제하면 부여된 ${deleteTarget.role.grantedCount}명에게서 이 role이 모두 회수됩니다. 되돌릴 수 없습니다.` : '되돌릴 수 없습니다. 부여된 직원이 있으면 영향 인원을 확인한 뒤 다시 한 번 묻습니다.'}
      confirmLabel={deleteTarget?.inUse ? '모두 회수하고 삭제' : '삭제'}
      onCancel={() => setDeleteTarget(null)}
      onConfirm={confirmDelete}
    />
  </>
}
