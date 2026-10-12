import { useState, type FormEvent } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { employeeStatuses, employeeStatusLabels, type EmployeeStatus, type EmployeeSummary } from '../../features/employee/model/employeeSchemas'
import { useEmployees } from '../../features/employee/model/useEmployees'
import { EmployeeStatusBadge } from '../../features/employee/ui/EmployeeStatusBadge'
import { InviteEmployeeForm } from '../../features/employee/ui/InviteEmployeeForm'
import { useRoles } from '../../features/role/model/useRoles'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { EmployeeDetail, type PendingConfirm } from './EmployeeDetail'

const PAGE_SIZE = 10
const emptyEmployees: EmployeeSummary[] = []

export function EmployeesPage() {
  const { can } = useAuth()
  const writable = can(permissions.accountWrite)
  const roles = useRoles()
  const [inviting, setInviting] = useState(false)
  const [status, setStatus] = useState<EmployeeStatus | ''>('')
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
      {writable && <button type="button" className="inbound-action-button employee-invite-toggle" aria-expanded={inviting} onClick={() => setInviting((value) => !value)}>{inviting ? '초대 닫기' : '직원 초대'}</button>}
    </header>
    {inviting && <InviteEmployeeForm writable={writable} onInvited={(principalId) => { setStatus(''); setRole(''); setSearchInput(''); setSearch(''); setPage(1); setSelectedId(principalId) }} />}
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
    {employeesQuery.data && <section className="inbound-workspace">
      <aside className="panel inbound-list-panel">
        <div className="panel-heading"><div><p className="eyebrow">EMPLOYEES</p><h2>직원 목록</h2></div><small>{totalElements}명</small></div>
        <div className="inbound-list">
          {employees.map((employee) => <button type="button" key={employee.principalId} className={`inbound-list-item ${selected?.principalId === employee.principalId ? 'selected' : ''}`} onClick={() => setSelectedId(employee.principalId)}>
            <span><EmployeeStatusBadge status={employee.status} /></span>
            <strong>{employee.name}</strong>
            <small>{employee.email}</small>
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
        : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">EMPLOYEES</p><h2>선택한 직원이 없습니다</h2><span>목록에서 직원을 선택하거나 새 직원을 초대하세요.</span></div></section>}
    </section>}
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}
