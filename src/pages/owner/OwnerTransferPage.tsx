import { useState, type FormEvent } from 'react'
import { useAuth } from '../../features/auth/model/useAuth'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { useEmployees } from '../../features/employee/model/useEmployees'
import { toOwnerTransferErrorMessage } from '../../features/owner-transfer/model/ownerTransferErrors'
import { useCancelOwnerTransfer, useRequestOwnerTransfer } from '../../features/owner-transfer/model/useOwnerTransfer'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

const CANDIDATE_LIMIT = 50

/** 현재 owner가 owner 권한을 다른 직원에게 넘기는 화면. 되돌리기 어려운 작업이라 영향을 먼저 안내한다. */
export function OwnerTransferPage() {
  const { user } = useAuth()
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [targetId, setTargetId] = useState('')
  const [requestOpen, setRequestOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [requested, setRequested] = useState<{ name: string; expiresAt: string } | null>(null)
  const employees = useEmployees({ status: 'ACTIVE', q: search, page: 0, size: CANDIDATE_LIMIT })
  const request = useRequestOwnerTransfer()
  const cancel = useCancelOwnerTransfer()
  // 대상은 활성 직원이어야 하며 자기 자신은 안 된다(GOV-09).
  const candidates = employees.data?.items.filter((employee) => employee.principalId !== user?.id) ?? []
  const target = candidates.find((employee) => employee.principalId === targetId)
  const busy = request.isPending || cancel.isPending

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setSearch(searchInput)
    setTargetId('')
  }

  function confirmRequest() {
    if (!target) return
    setRequestOpen(false)
    cancel.reset()
    request.mutate(target.principalId, {
      onSuccess: (result) => { setRequested({ name: target.name, expiresAt: result.expiresAt }); setTargetId('') },
    })
  }

  function confirmCancel() {
    setCancelOpen(false)
    request.reset()
    cancel.mutate(undefined, { onSuccess: () => setRequested(null) })
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>ACCOUNT ADMINISTRATION</p><h1>owner 양도</h1></div>
    </header>
    <section className="panel owner-warning">
      <h2>양도 전에 확인하세요</h2>
      <ul>
        <li>owner는 정확히 한 명입니다. 양도하면 <b>나는 role이 없는 직원</b>이 되고 <b>모든 로그인 세션이 폐기</b>되어 다시 로그인해야 합니다.</li>
        <li>대상 직원이 <b>본인 계정으로 로그인한 상태에서 메일 링크를 열어 수락</b>해야 양도됩니다. 수락 전까지는 owner 권한이 바뀌지 않으며 언제든 취소할 수 있습니다.</li>
        <li>진행 중인 양도는 한 번에 하나만 있을 수 있고, 수락 링크는 72시간 동안 한 번만 쓸 수 있습니다.</li>
        <li>대상은 활성 직원이어야 합니다. owner에게는 양도 요청·완료 때 알림 메일이 갑니다.</li>
      </ul>
    </section>
    <section className="panel owner-request">
      <div className="panel-heading"><div><p className="eyebrow">REQUEST</p><h2>양도 대상 선택</h2></div></div>
      <form className="owner-search" onSubmit={submitSearch} role="search" aria-label="양도 대상 검색">
        <label>이름·이메일<input value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="검색어" /></label>
        <button type="submit" className="inbound-action-button">검색</button>
      </form>
      {employees.isLoading && <p>직원 목록을 불러오는 중입니다...</p>}
      {employees.isError && <p className="inbound-error" role="alert">{toAdminErrorMessage(employees.error)}</p>}
      {employees.data && candidates.length === 0 && <p className="inbound-empty">양도할 수 있는 활성 직원이 없습니다.</p>}
      <ul className="owner-candidates" role="radiogroup" aria-label="양도 대상">
        {candidates.map((employee) => (
          <li key={employee.principalId}>
            <label>
              <input type="radio" name="owner-target" value={employee.principalId} checked={targetId === employee.principalId} disabled={busy} onChange={() => setTargetId(employee.principalId)} />
              <span><strong>{employee.name}</strong> <small>{employee.email}</small></span>
            </label>
          </li>
        ))}
      </ul>
      {employees.data && employees.data.page.totalElements > CANDIDATE_LIMIT && <p className="employee-hint">검색 결과가 많아 {CANDIDATE_LIMIT}명까지만 보입니다. 검색어로 좁혀 주세요.</p>}
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-danger" disabled={!target || busy} onClick={() => setRequestOpen(true)}>owner 양도 요청</button>
      </div>
      {request.isError && <p className="inbound-error" role="alert">{toOwnerTransferErrorMessage(request.error, 'request')}</p>}
      {requested && <p className="employee-success" role="status">{requested.name}님에게 수락 메일을 보냈습니다. 링크는 {formatDateTime(requested.expiresAt)}까지 유효합니다. 대상이 수락하면 owner가 바뀌고 나는 로그아웃됩니다.</p>}
    </section>
    <section className="panel owner-cancel">
      <div className="panel-heading"><div><p className="eyebrow">CANCEL</p><h2>진행 중인 양도 취소</h2></div></div>
      <p className="employee-hint">수락 전의 양도를 취소하면 발송한 수락 링크가 무효가 됩니다. 진행 중인 양도 상태는 조회할 수 없어, 요청한 뒤 마음이 바뀌었을 때 여기서 취소합니다.</p>
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={busy} onClick={() => setCancelOpen(true)}>양도 취소</button>
      </div>
      {cancel.isError && <p className="inbound-error" role="alert">{toOwnerTransferErrorMessage(cancel.error, 'cancel')}</p>}
      {cancel.isSuccess && <p className="employee-success" role="status">진행 중인 양도를 취소했습니다. 발송한 수락 링크는 더 이상 쓸 수 없습니다.</p>}
    </section>
    <ConfirmModal
      open={requestOpen}
      title={`${target?.name ?? ''}님에게 owner를 양도할까요?`}
      description="대상이 수락하면 나는 role 없는 직원이 되고 모든 세션이 폐기됩니다. 수락 전에는 취소할 수 있습니다. 대상에게 수락 메일이 발송됩니다."
      confirmLabel="양도 요청"
      onCancel={() => setRequestOpen(false)}
      onConfirm={confirmRequest}
    />
    <ConfirmModal
      open={cancelOpen}
      title="진행 중인 양도를 취소할까요?"
      description="발송한 수락 링크가 무효가 됩니다. 진행 중인 양도가 없으면 취소할 수 없다는 안내가 나옵니다."
      confirmLabel="양도 취소"
      onCancel={() => setCancelOpen(false)}
      onConfirm={confirmCancel}
    />
  </>
}
