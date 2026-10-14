import { useEffect, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { employeeStatuses, employeeStatusLabels, parseEmployeeStatus, type EmployeeStatus, type EmployeeSummary } from '../../features/employee/model/employeeSchemas'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { useEmployees } from '../../features/employee/model/useEmployees'
import { EmployeeStatusBadge } from '../../features/employee/ui/EmployeeStatusBadge'
import { INVITE_STEPS, inviteStepLabels, type InviteStep } from '../../features/employee/model/inviteSteps'
import { InviteEmployeeForm } from '../../features/employee/ui/InviteEmployeeForm'
import { useRoles } from '../../features/role/model/useRoles'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'
import { EmployeeDetail, type PendingConfirm } from './EmployeeDetail'

const PAGE_SIZE = 5
const emptyEmployees: EmployeeSummary[] = []

export function EmployeesPage() {
  const { can } = useAuth()
  const writable = can(permissions.accountWrite)
  const { notify } = useToast()
  const roles = useRoles()
  const [addOpen, setAddOpen] = useState(false)
  const [addStep, setAddStep] = useState<InviteStep>(1)
  // 대시보드 카드에서 `/employees?status=PENDING`으로 들어오면 그 상태로 거른 채 시작한다(이후 필터를 바꿔도 주소는 건드리지 않는다).
  const [searchParams] = useSearchParams()
  const [status, setStatus] = useState<EmployeeStatus | ''>(() => parseEmployeeStatus(searchParams.get('status')))
  const [role, setRole] = useState('')
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)

  const employeesQuery = useEmployees({ status: status || undefined, role: role || undefined, q: search, page: page - 1, size: PAGE_SIZE })
  const employees = employeesQuery.data?.items ?? emptyEmployees
  const totalElements = employeesQuery.data?.page.totalElements ?? 0
  const totalPages = Math.max(1, employeesQuery.data?.page.totalPages ?? 1)
  const selected = employees.find((employee) => employee.principalId === selectedId) ?? employees[0]

  // 마지막 페이지의 직원이 필터에서 빠지는 경우(예: 활성 필터에서 마지막 페이지의 직원을 정지) 현재 페이지가 마지막 페이지를 넘으면 마지막 페이지로 되돌린다.
  const lastPage = Math.max(1, employeesQuery.data?.page.totalPages ?? 1)
  useEffect(() => {
    if (employeesQuery.data && page > lastPage) {
      // oxlint-disable-next-line react/set-state-in-effect
      setPage(lastPage)
      // oxlint-disable-next-line react/set-state-in-effect
      setSelectedId(null)
    }
  }, [employeesQuery.data, page, lastPage])

  function resetPaging() {
    setPage(1)
    setSelectedId(null)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput)
    resetPaging()
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>ACCOUNT ADMINISTRATION</p><h1>직원 관리</h1></div>
      {writable && <button type="button" className="inbound-action-button employee-invite-toggle" aria-haspopup="dialog" onClick={() => setAddOpen(true)}>직원 추가</button>}
    </header>
    <Modal open={addOpen} title="직원 추가" titleAddon={<span className="form-modal-step" aria-live="polite"><b>{addStep} / {INVITE_STEPS}</b>{inviteStepLabels[addStep]}</span>} onClose={() => setAddOpen(false)}>
      <InviteEmployeeForm
        writable={writable}
        onCancel={() => setAddOpen(false)}
        onStepChange={setAddStep}
        onInvited={(invited) => {
          // 새 직원은 최신순 목록의 맨 앞에 있으므로 필터를 풀고 1페이지에서 선택해 보여준다.
          setAddOpen(false)
          notify(`직원을 추가했습니다. 초대 메일을 보냈으며, ${formatDateTime(invited.invitationExpiresAt)}까지 비밀번호를 정하면 계정이 활성화됩니다.`)
          setStatus(''); setRole(''); setSearchInput(''); setSearch(''); setPage(1); setSelectedId(invited.principalId)
        }}
      />
    </Modal>
    <form className="panel employee-filters" onSubmit={submitSearch} role="search" aria-label="직원 검색">
      <label>상태
        <select value={status} onChange={(event) => { setStatus(event.target.value as EmployeeStatus | ''); resetPaging() }}>
          <option value="">전체</option>
          {employeeStatuses.map((value) => <option key={value} value={value}>{employeeStatusLabels[value]}</option>)}
        </select>
      </label>
      <label>role
        <select value={role} onChange={(event) => { setRole(event.target.value); resetPaging() }}>
          <option value="">전체</option>
          {roles.data?.map((item) => <option key={item.id} value={item.fullCode}>{item.name} ({item.fullCode})</option>)}
        </select>
      </label>
      <label className="employee-filter-search">이름·이메일
        <input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="검색어" />
      </label>
      <button type="submit" className="inbound-action-button">검색</button>
    </form>
    {employeesQuery.isLoading && <section className="panel"><p>직원 목록을 불러오는 중입니다...</p></section>}
    {employeesQuery.isError && <section className="panel"><h2>직원 목록을 불러오지 못했습니다</h2><p>{toAdminErrorMessage(employeesQuery.error)}</p></section>}
    {employeesQuery.data && <section className="inbound-workspace employee-workspace">
      <aside className="panel inbound-list-panel">
        <div className="panel-heading"><div><p className="eyebrow">EMPLOYEES</p><h2>직원 목록</h2></div><small>{totalElements}명</small></div>
        <div className="inbound-list">
          {employees.map((employee) => <button type="button" key={employee.principalId} className={`inbound-list-item ${selected?.principalId === employee.principalId ? 'selected' : ''}`} onClick={() => setSelectedId(employee.principalId)}>
            <span><EmployeeStatusBadge status={employee.status} /></span>
            <strong>{employee.name}</strong>
            <small title={employee.email}>{employee.email}</small>
          </button>)}
          {employees.length === 0 && <p className="inbound-empty">조건에 맞는 직원이 없습니다.</p>}
        </div>
        {totalPages > 1 && <div className="inbound-pagination">
          <button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button>
        </div>}
      </aside>
      {selected
        ? <EmployeeDetail key={selected.principalId} principalId={selected.principalId} writable={writable} confirm={setPendingConfirm} />
        : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">EMPLOYEES</p><h2>선택한 직원이 없습니다</h2><span>목록에서 직원을 선택하거나 새 직원을 추가하세요.</span></div></section>}
    </section>}
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}
