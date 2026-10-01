import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import type { Outbound, OutboundStatus } from '../../features/outbound/model/outboundSchemas'
import { useCompleteOutbound, useOutboundItems, useOutbounds, useStartOutboundInspecting, useStartOutboundPicking } from '../../features/outbound/model/useOutbounds'
import { OutboundStatusBadge } from '../../features/outbound/ui/OutboundStatusBadge'
import { OutboundItemsSummary } from '../../features/outbound/ui/OutboundItemsSummary'
import { RegisterOutboundForm } from '../../features/outbound/ui/RegisterOutboundForm'
import { OutboundRecommendations } from '../../features/outbound/ui/OutboundRecommendations'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

type WorkGroup = 'ALL' | 'REQUESTED' | 'IN_PROGRESS' | 'COMPLETED'
// COMPLETED 탭은 작업 큐가 아니라 "최근 완료 건 미리보기"다 — 전체는 /outbounds/history로 보낸다.
const RECENT_HISTORY_SIZE = 10
const workGroups: Array<{ id: WorkGroup; label: string; statuses: OutboundStatus[] }> = [
  { id: 'ALL', label: '전체 작업', statuses: [] },
  { id: 'REQUESTED', label: '출고 요청', statuses: ['REQUESTED'] },
  { id: 'IN_PROGRESS', label: '피킹·검수', statuses: ['PICKING', 'INSPECTING'] },
  { id: 'COMPLETED', label: '완료', statuses: ['COMPLETED'] },
]
const emptyOutbounds: Outbound[] = []
const emptyCounts = { REQUESTED: 0, PICKING: 0, INSPECTING: 0, COMPLETED: 0 }

type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

export function OutboundManagementPage() {
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
  const outboundsQuery = useOutbounds(warehouseIds, activeGroup.statuses, page, isHistoryPreview ? RECENT_HISTORY_SIZE : 4)
  const outboundPage = outboundsQuery.data
  const outbounds = outboundPage?.items ?? emptyOutbounds
  const selected = outbounds.find((outbound) => outbound.outboundId === selectedId) ?? outbounds[0]
  const counts = outboundPage?.statusCounts ?? emptyCounts
  const totalPages = Math.max(1, Math.ceil((outboundPage?.total ?? 0) / (outboundPage?.size ?? 4)))
  const writable = can(permissions.outboundWrite)

  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (outboundsQuery.isLoading) return <section className="panel"><p>출고 관리 정보를 불러오는 중입니다...</p></section>
  if (outboundsQuery.isError) return <section className="panel"><h1>출고 정보를 불러오지 못했습니다</h1><p>{outboundsQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>OUTBOUND OPERATIONS</p><h1>출고 관리</h1></div><Link className="inbound-history-back" to="/outbounds/history">출고 히스토리</Link></header>
    <section className="inbound-summary-grid" aria-label="출고 작업 요약">
      <button type="button" onClick={() => selectWorkGroup('REQUESTED', true)}><span>출고 요청</span><strong>{counts.REQUESTED}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('IN_PROGRESS', true)}><span>피킹·검수</span><strong>{counts.PICKING + counts.INSPECTING}<small> 건</small></strong></button>
      <button type="button" className="summary-ok" onClick={() => selectWorkGroup('COMPLETED', true)}><span>출고 완료</span><strong>{counts.COMPLETED}<small> 건</small></strong></button>
    </section>
    <OutboundRecommendations />
    {warehouseIds[0] !== undefined && <RegisterOutboundForm warehouseId={warehouseIds[0]} writable={writable} onRegistered={(id) => { setWorkGroup('ALL'); setPage(1); setSelectedId(id) }} />}
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}>
        <div className="panel-heading"><div><p className="eyebrow">OUTBOUND QUEUE</p><h2>출고 작업 목록</h2></div><small>{outboundPage?.total ?? 0}건</small></div>
        <div className="inbound-work-tabs" role="tablist" aria-label="출고 작업 단계">{workGroups.map((group) => {
          const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, value) => total + value, 0)
          return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button>
        })}</div>
        <div className="inbound-list">
          {outbounds.map((outbound) => <button type="button" key={outbound.outboundId} className={`inbound-list-item ${selected?.outboundId === outbound.outboundId ? 'selected' : ''}`} onClick={() => setSelectedId(outbound.outboundId)}><span><OutboundStatusBadge status={outbound.status} /></span><strong>출고 #{outbound.outboundId}</strong></button>)}
          {outbounds.length === 0 && <p className="inbound-empty">이 단계에서 처리할 출고 건이 없습니다.</p>}
        </div>
        {isHistoryPreview ? (outboundPage && outboundPage.total > RECENT_HISTORY_SIZE && <div className="inbound-history-link"><Link to="/outbounds/history">전체 완료 이력 보기 ({outboundPage.total}건)</Link></div>) : (totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button></div>)}
      </aside>
      {selected ? <OutboundDetail key={selected.outboundId} outbound={selected} writable={writable} confirm={setPendingConfirm} /> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">OUTBOUND QUEUE</p><h2>처리할 출고 작업이 없습니다</h2><span>위에서 새 출고를 요청하거나 다른 단계 탭을 선택하세요.</span></div></section>}
    </section>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}

function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }

function OutboundDetail({ outbound, writable, confirm }: { outbound: Outbound; writable: boolean; confirm: (pending: PendingConfirm) => void }) {
  const itemsQuery = useOutboundItems(outbound.outboundId)
  const items = itemsQuery.data
  const startPicking = useStartOutboundPicking()
  const startInspecting = useStartOutboundInspecting()
  const complete = useCompleteOutbound()
  const busy = startPicking.isPending || startInspecting.isPending || complete.isPending
  const actionError = startPicking.error ?? startInspecting.error ?? complete.error
  const hasShortage = items?.some((item) => (item.shortageQuantity ?? 0) > 0) ?? false
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">OUTBOUND #{outbound.outboundId}</p><h2>출고 #{outbound.outboundId}</h2><div className="inbound-detail-meta"><span><b>품목</b>{items ? `${items.length}개` : '-'}</span></div></div><OutboundStatusBadge status={outbound.status} /></div>
    {itemsQuery.isLoading && <p>품목을 불러오는 중입니다...</p>}
    {itemsQuery.isError && <p className="inbound-error" role="alert">{itemsQuery.error instanceof Error ? itemsQuery.error.message : '품목을 불러오지 못했습니다.'}</p>}
    {items && outbound.status === 'REQUESTED' && <section className="inbound-stage"><h3>출고 요청</h3><p>피킹을 시작하면 유통기한이 빠른 정상 재고부터(FIFO) 자동으로 점유합니다. 재고가 부족하면 확보 가능한 만큼만 피킹되고 부족 수량이 표시됩니다.</p><OutboundItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '피킹을 시작할까요?', description: '재고가 점유되고 출고장 공간이 사용되며 되돌릴 수 없습니다.', confirmLabel: '피킹 시작', run: () => startPicking.mutate(outbound.outboundId) })}>피킹 시작</ActionButton></section>}
    {items && outbound.status === 'PICKING' && <section className="inbound-stage"><h3>피킹 완료 · 검수 대기</h3><p>피킹 결과를 확인하고 검수를 시작하세요.</p>{hasShortage && <p className="inbound-error" role="alert">재고 부족으로 요청 수량을 모두 피킹하지 못한 품목이 있습니다.</p>}<OutboundItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => startInspecting.mutate(outbound.outboundId)}>검수 시작</ActionButton></section>}
    {items && outbound.status === 'INSPECTING' && <section className="inbound-stage"><h3>출고 검수</h3><p>피킹된 수량을 확인한 뒤 출고를 완료하세요. 완료하면 재고 점유가 확정되고 Location·출고장 공간이 해제됩니다.</p>{hasShortage && <p className="inbound-error" role="alert">부족 수량이 있는 채로 출고됩니다.</p>}<OutboundItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '출고를 완료할까요?', description: '재고가 확정 차감되며 되돌릴 수 없습니다.', confirmLabel: '출고 완료', run: () => complete.mutate(outbound.outboundId) })}>출고 완료</ActionButton></section>}
    {items && outbound.status === 'COMPLETED' && <section className="inbound-stage completed"><h3>출고 완료</h3><p>피킹된 수량만큼 재고가 차감되었습니다.</p><OutboundItemsSummary items={items} /></section>}
    {actionError && <p className="inbound-error" role="alert">{actionError.message}</p>}
  </section>
}
