import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import type { Disposal, DisposalStatus } from '../../features/disposal/model/disposalSchemas'
import { useApproveDisposal, useCompleteDisposal, useDisposalItems, useDisposals } from '../../features/disposal/model/useDisposals'
import { DisposalStatusBadge } from '../../features/disposal/ui/DisposalStatusBadge'
import { DisposalItemsSummary } from '../../features/disposal/ui/DisposalItemsSummary'
import { RegisterDisposalForm } from '../../features/disposal/ui/RegisterDisposalForm'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

type WorkGroup = 'ALL' | 'REQUESTED' | 'APPROVED' | 'COMPLETED'
// COMPLETED 탭은 작업 큐가 아니라 "최근 완료 건 미리보기"다 — 전체는 /disposals/history로 보낸다.
const RECENT_HISTORY_SIZE = 10
const workGroups: Array<{ id: WorkGroup; label: string; statuses: DisposalStatus[] }> = [
  { id: 'ALL', label: '전체 작업', statuses: [] },
  { id: 'REQUESTED', label: '승인 대기', statuses: ['REQUESTED'] },
  { id: 'APPROVED', label: '폐기 처리중', statuses: ['APPROVED'] },
  { id: 'COMPLETED', label: '완료', statuses: ['COMPLETED'] },
]
const emptyDisposals: Disposal[] = []
const emptyCounts = { REQUESTED: 0, APPROVED: 0, COMPLETED: 0 }

type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

export function DisposalManagementPage() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const [workGroup, setWorkGroup] = useState<WorkGroup>('ALL')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const queueRef = useRef<HTMLElement>(null)
  const warehouseIds = user.scope.warehouseIds
  const activeGroup = workGroups.find((group) => group.id === workGroup)!
  const isHistoryPreview = activeGroup.id === 'COMPLETED'
  const disposalsQuery = useDisposals(warehouseIds, activeGroup.statuses, page, isHistoryPreview ? RECENT_HISTORY_SIZE : 4)
  const disposalPage = disposalsQuery.data
  const disposals = disposalPage?.items ?? emptyDisposals
  const selected = disposals.find((disposal) => disposal.disposalId === selectedId) ?? disposals[0]
  const counts = disposalPage?.statusCounts ?? emptyCounts
  const totalPages = Math.max(1, Math.ceil((disposalPage?.total ?? 0) / (disposalPage?.size ?? 4)))
  const writable = can(permissions.disposalWrite)

  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (disposalsQuery.isLoading) return <section className="panel"><p>폐기 관리 정보를 불러오는 중입니다...</p></section>
  if (disposalsQuery.isError) return <section className="panel"><h1>폐기 정보를 불러오지 못했습니다</h1><p>{disposalsQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>DISPOSAL OPERATIONS</p><h1>폐기 관리</h1></div><Link className="inbound-history-back" to="/disposals/history">폐기 히스토리</Link></header>
    <section className="inbound-summary-grid" aria-label="폐기 작업 요약">
      <button type="button" onClick={() => selectWorkGroup('REQUESTED', true)}><span>승인 대기</span><strong>{counts.REQUESTED}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('APPROVED', true)}><span>폐기 처리중</span><strong>{counts.APPROVED}<small> 건</small></strong></button>
      <button type="button" className="summary-ok" onClick={() => selectWorkGroup('COMPLETED', true)}><span>폐기 완료</span><strong>{counts.COMPLETED}<small> 건</small></strong></button>
    </section>
    {warehouseIds[0] !== undefined && <RegisterDisposalForm warehouseId={warehouseIds[0]} warehouseIds={warehouseIds} writable={writable} onRegistered={(id) => { setWorkGroup('ALL'); setPage(1); setSelectedId(id) }} />}
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}>
        <div className="panel-heading"><div><p className="eyebrow">DISPOSAL QUEUE</p><h2>폐기 작업 목록</h2></div><small>{disposalPage?.total ?? 0}건</small></div>
        <div className="inbound-work-tabs" role="tablist" aria-label="폐기 작업 단계">{workGroups.map((group) => {
          const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, value) => total + value, 0)
          return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button>
        })}</div>
        <div className="inbound-list">
          {disposals.map((disposal) => <button type="button" key={disposal.disposalId} className={`inbound-list-item ${selected?.disposalId === disposal.disposalId ? 'selected' : ''}`} onClick={() => setSelectedId(disposal.disposalId)}><span><DisposalStatusBadge status={disposal.status} /></span><strong>폐기 #{disposal.disposalId}</strong></button>)}
          {disposals.length === 0 && <p className="inbound-empty">이 단계에서 처리할 폐기 건이 없습니다.</p>}
        </div>
        {isHistoryPreview ? (disposalPage && disposalPage.total > RECENT_HISTORY_SIZE && <div className="inbound-history-link"><Link to="/disposals/history">전체 완료 이력 보기 ({disposalPage.total}건)</Link></div>) : (totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button></div>)}
      </aside>
      {selected ? <DisposalDetail key={selected.disposalId} disposal={selected} warehouseIds={warehouseIds} writable={writable} confirm={setPendingConfirm} /> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">DISPOSAL QUEUE</p><h2>처리할 폐기 작업이 없습니다</h2><span>위에서 폐기를 요청하거나 다른 단계 탭을 선택하세요.</span></div></section>}
    </section>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}

function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }

function DisposalDetail({ disposal, warehouseIds, writable, confirm }: { disposal: Disposal; warehouseIds: number[]; writable: boolean; confirm: (pending: PendingConfirm) => void }) {
  const itemsQuery = useDisposalItems(disposal.disposalId, warehouseIds)
  const items = itemsQuery.data
  const approve = useApproveDisposal()
  const complete = useCompleteDisposal()
  const busy = approve.isPending || complete.isPending
  const actionError = approve.error ?? complete.error
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">DISPOSAL #{disposal.disposalId}</p><h2>폐기 #{disposal.disposalId}</h2><div className="inbound-detail-meta"><span><b>품목</b>{items ? `${items.length}개` : '-'}</span></div></div><DisposalStatusBadge status={disposal.status} /></div>
    {itemsQuery.isLoading && <p>품목을 불러오는 중입니다...</p>}
    {itemsQuery.isError && <p className="inbound-error" role="alert">{itemsQuery.error instanceof Error ? itemsQuery.error.message : '품목을 불러오지 못했습니다.'}</p>}
    {items && disposal.status === 'REQUESTED' && <section className="inbound-stage"><h3>폐기 승인 대기</h3><p>승인하면 대상 재고가 폐기 처리장으로 이동하며 폐기 처리장 공간이 점유됩니다.</p><DisposalItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '폐기를 승인할까요?', description: '재고가 폐기 처리장으로 이동하며 되돌릴 수 없습니다.', confirmLabel: '폐기 승인', run: () => approve.mutate(disposal.disposalId) })}>폐기 승인</ActionButton></section>}
    {items && disposal.status === 'APPROVED' && <section className="inbound-stage"><h3>폐기 처리중</h3><p>폐기 처리장의 물품을 실제로 폐기한 뒤 완료 처리하세요. 완료하면 재고가 제외되고 폐기 처리장 공간이 해제됩니다.</p><DisposalItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '폐기를 완료할까요?', description: '재고가 영구 제외되며 되돌릴 수 없습니다.', confirmLabel: '폐기 완료', run: () => complete.mutate(disposal.disposalId) })}>폐기 완료</ActionButton></section>}
    {items && disposal.status === 'COMPLETED' && <section className="inbound-stage completed"><h3>폐기 완료</h3><p>대상 재고가 폐기되어 더 이상 재고로 조회되지 않습니다.</p><DisposalItemsSummary items={items} /></section>}
    {actionError && <p className="inbound-error" role="alert">{actionError.message}</p>}
  </section>
}
