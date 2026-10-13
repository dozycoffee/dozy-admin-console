import { useState, type ReactNode } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { blockedReason, NO_WRITE_REASON, type ProtectedAction } from '../../features/employee/model/accountProtection'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import {
  useCancelInvitation, useDeactivateEmployee, useEmployee, useReactivateEmployee, useResendInvitation, useSendPasswordReset, useSuspendEmployee,
} from '../../features/employee/model/useEmployees'
import { EditEmployeeForm } from '../../features/employee/ui/EditEmployeeForm'
import { EmployeeStatusBadge } from '../../features/employee/ui/EmployeeStatusBadge'
import { ReasonModal } from '../../features/employee/ui/ReasonModal'
import { Modal } from '../../shared/ui/Modal'
import { Tooltip } from '../../shared/ui/Tooltip'
import { EmployeeRoles } from './EmployeeRoles'

export type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

type Props = {
  principalId: string
  writable: boolean
  confirm: (pending: PendingConfirm) => void
}

const DEACTIVATED_REASON = '비활성화된 계정은 변경할 수 없습니다.'

type ReasonAction = 'suspend' | 'deactivate'

export function EmployeeDetail({ principalId, writable, confirm }: Props) {
  const { can } = useAuth()
  const detailQuery = useEmployee(principalId)
  const resend = useResendInvitation()
  const cancel = useCancelInvitation()
  const suspend = useSuspendEmployee()
  const reactivate = useReactivateEmployee()
  const deactivate = useDeactivateEmployee()
  const passwordReset = useSendPasswordReset()
  const [editOpen, setEditOpen] = useState(false)
  const [reasonAction, setReasonAction] = useState<ReasonAction | null>(null)
  const mutations = [resend, cancel, suspend, reactivate, deactivate, passwordReset]
  const busy = mutations.some((mutation) => mutation.isPending)
  const actionError = mutations.find((mutation) => mutation.isError)?.error
  const employee = detailQuery.data
  const isOwner = can(permissions.accountManage)

  if (detailQuery.isLoading) return <section className="panel inbound-detail-panel"><p>직원 정보를 불러오는 중입니다...</p></section>
  if (detailQuery.isError || !employee) return <section className="panel inbound-detail-panel"><p className="inbound-error" role="alert">{toAdminErrorMessage(detailQuery.error)}</p></section>

  // 이전 작업의 에러·성공 안내가 남지 않도록 새 작업을 시작할 때 모든 mutation 상태를 지운다.
  function start(run: () => void) {
    mutations.forEach((mutation) => mutation.reset())
    run()
  }

  const blocked = (action: ProtectedAction) => blockedReason(action, employee.roles, isOwner)
  const { status } = employee
  // 비활성화 사유(없으면 null). 사유가 있는 버튼은 툴팁으로 이유를 알려 준다.
  const reasonFor = (action: ProtectedAction) => status === 'DEACTIVATED' ? DEACTIVATED_REASON : blocked(action) ?? (writable ? null : NO_WRITE_REASON)
  const canAct = (action: ProtectedAction) => !busy && reasonFor(action) === null
  const gate = (action: ProtectedAction, button: ReactNode) => <Tooltip content={reasonFor(action)}>{button}</Tooltip>
  const invitationExpired = employee.invitation ? new Date(employee.invitation.expiresAt) < new Date() : false

  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading">
      <div><p className="eyebrow">EMPLOYEE</p><h2>{employee.name}</h2></div>
      <EmployeeStatusBadge status={status} />
    </div>
    {/* 헤더(라벨·이름·상태)는 카드 가장자리에 붙이고 나머지 내용은 좌우로 들여 쓴다 */}
    <div className="employee-detail-body">
      {/* 상태에 따라 나타났다 사라지는 정보(초대 만료, 로그인 잠금)는 항상 있는 기본 정보와 분리해 안내 박스로 보여준다.
          정상적인 초대 대기는 배지가 이미 상태를 알려 주므로 만료일만 한 줄의 작은 박스로, 조치가 필요한 상태(만료·잠금)는 제목이 있는 풀폭 박스로 강조한다 */}
      {(employee.invitation || employee.lockedUntil) && <div className="employee-notices">
        {employee.invitation && (invitationExpired
          ? <div className="employee-notice danger">
            <strong>초대가 만료되었습니다</strong>
            <span className="employee-notice-detail"><span>초대 만료</span><time dateTime={employee.invitation.expiresAt}>{formatDateTime(employee.invitation.expiresAt)}</time><em>초대를 재발송하세요</em></span>
          </div>
          : <div className="employee-notice warning compact">
            <span>초대 만료</span>
            <time dateTime={employee.invitation.expiresAt}>{formatDateTime(employee.invitation.expiresAt)}</time>
          </div>)}
        {employee.lockedUntil && <div className="employee-notice danger">
          <strong>로그인 잠금</strong>
          <span className="employee-notice-detail"><span>해제 예정</span><time dateTime={employee.lockedUntil}>{formatDateTime(employee.lockedUntil)}</time></span>
        </div>}
      </div>}
      <h3 className="employee-section-title">기본 정보</h3>
      <dl className="employee-fields">
        <div><dt>이메일</dt><dd>{employee.email}</dd></div>
        <div><dt>전화번호</dt><dd>{employee.phone || '-'}</dd></div>
        <div><dt>주소</dt><dd>{employee.address || '-'}</dd></div>
        <div><dt>등록일</dt><dd>{formatDateTime(employee.createdAt)}</dd></div>
      </dl>
      <EmployeeRoles employee={employee} writable={writable} confirm={confirm} />


      <div className="employee-actions">
        {gate('edit', <button type="button" className="inbound-action-button employee-secondary" disabled={!canAct('edit')} onClick={() => start(() => setEditOpen(true))}>정보 수정</button>)}
        {status === 'PENDING' && <>
          {gate('invitation', <button type="button" className="inbound-action-button" disabled={!canAct('invitation')} onClick={() => confirm({ title: '초대 메일을 다시 보낼까요?', description: '이전 초대 링크는 무효가 되고 새 링크가 발송됩니다.', confirmLabel: '재발송', run: () => start(() => resend.mutate(employee.principalId)) })}>초대 재발송</button>)}
          {gate('invitation', <button type="button" className="inbound-action-button employee-danger" disabled={!canAct('invitation')} onClick={() => confirm({ title: '초대를 취소할까요?', description: '계정이 비활성화되며 되돌릴 수 없습니다. 같은 이메일로 다시 초대할 수 있습니다.', confirmLabel: '초대 취소', run: () => start(() => cancel.mutate(employee.principalId)) })}>초대 취소</button>)}
        </>}
        {status === 'ACTIVE' && <>
          {gate('password-reset', <button type="button" className="inbound-action-button" disabled={!canAct('password-reset')} onClick={() => confirm({ title: '비밀번호 재설정 메일을 보낼까요?', description: '메일만 발송하며 현재 비밀번호와 세션은 바뀌지 않습니다. 계정 탈취가 의심되면 먼저 정지하세요.', confirmLabel: '메일 발송', run: () => start(() => passwordReset.mutate(employee.principalId)) })}>재설정 메일 발송</button>)}
          {gate('suspend', <button type="button" className="inbound-action-button employee-danger" disabled={!canAct('suspend')} onClick={() => start(() => setReasonAction('suspend'))}>정지</button>)}
        </>}
        {status === 'SUSPENDED' && gate('reactivate', <button type="button" className="inbound-action-button" disabled={!canAct('reactivate')} onClick={() => confirm({ title: '정지를 해제할까요?', description: '정지할 때 폐기된 세션은 되살아나지 않으므로 해제 후 다시 로그인해야 합니다. 계정 탈취로 정지했다면 해제 후 재설정 메일을 보내세요.', confirmLabel: '정지 해제', run: () => start(() => reactivate.mutate(employee.principalId)) })}>정지 해제</button>)}
        {(status === 'ACTIVE' || status === 'SUSPENDED') && gate('deactivate', <button type="button" className="inbound-action-button employee-danger" disabled={!canAct('deactivate')} onClick={() => start(() => setReasonAction('deactivate'))}>비활성화</button>)}
      </div>

      {resend.isSuccess && <p className="employee-success" role="status">초대 메일을 다시 보냈습니다. 새 초대는 {formatDateTime(resend.data.invitationExpiresAt)}까지 유효합니다.</p>}
      {passwordReset.isSuccess && <p className="employee-success" role="status">비밀번호 재설정 메일을 보냈습니다.</p>}
      {actionError && <p className="inbound-error" role="alert">{toAdminErrorMessage(actionError)}</p>}
    </div>

    <Modal open={editOpen} title={`정보 수정 · ${employee.name}`} onClose={() => setEditOpen(false)}>
      <EditEmployeeForm employee={employee} disabled={!canAct('edit')} onDone={() => setEditOpen(false)} />
    </Modal>
    <ReasonModal
      open={reasonAction === 'suspend'}
      title="계정을 정지할까요?"
      description="모든 로그인 세션이 폐기됩니다. 이미 발급된 access token은 최대 10분간 유효할 수 있습니다."
      confirmLabel="정지"
      onCancel={() => setReasonAction(null)}
      onConfirm={(reason) => { setReasonAction(null); start(() => suspend.mutate({ principalId: employee.principalId, reason })) }}
    />
    <ReasonModal
      open={reasonAction === 'deactivate'}
      title="계정을 비활성화할까요?"
      description="되돌릴 수 없습니다. 모든 세션과 role이 삭제되고 이메일·이름 등 개인정보가 파기됩니다."
      confirmLabel="비활성화"
      onCancel={() => setReasonAction(null)}
      onConfirm={(reason) => { setReasonAction(null); start(() => deactivate.mutate({ principalId: employee.principalId, reason })) }}
    />
  </section>
}
