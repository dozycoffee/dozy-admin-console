import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import type { Inbound, InboundStatus } from '../../features/inbound/model/inboundSchemas'
import { useCompleteInbound, useInboundItems, useInbounds, useInspectInboundItem, useStartInboundProcessing, type InboundItemView } from '../../features/inbound/model/useInbounds'
import { InboundStatusBadge } from '../../features/inbound/ui/InboundStatusBadge'
import { InboundItemsSummary } from '../../features/inbound/ui/InboundItemsSummary'
import { InboundReceiptsForm } from '../../features/inbound/ui/InboundReceiptsForm'
import { toDisplayMessage } from '../../shared/api/displayMessage'
import { RegisterInboundForm } from '../../features/inbound/ui/RegisterInboundForm'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

type WorkGroup = 'ALL' | 'WAITING' | 'PROCESSING' | 'COMPLETED'
// COMPLETED 탭은 작업 큐가 아니라 "최근 완료 건 미리보기"다 — 전체는 /inbounds/history로 보낸다.
const RECENT_HISTORY_SIZE = 10
const workGroups: Array<{ id: WorkGroup; label: string; statuses: InboundStatus[] }> = [
  { id: 'ALL', label: '전체 작업', statuses: [] },
  { id: 'WAITING', label: '입고 대기', statuses: ['EXPECTED', 'WAITING'] },
  { id: 'PROCESSING', label: '검수·처리중', statuses: ['PROCESSING'] },
  { id: 'COMPLETED', label: '완료', statuses: ['COMPLETED'] },
]
const emptyInbounds: Inbound[] = []
const emptyCounts = { EXPECTED: 0, WAITING: 0, PROCESSING: 0, COMPLETED: 0 }

type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

export function InboundManagementPage() {
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
  const inboundsQuery = useInbounds(warehouseIds, activeGroup.statuses, page, isHistoryPreview ? RECENT_HISTORY_SIZE : 4)
  const inboundPage = inboundsQuery.data
  const inbounds = inboundPage?.items ?? emptyInbounds
  const selected = inbounds.find((inbound) => inbound.inboundId === selectedId) ?? inbounds[0]
  const counts = inboundPage?.statusCounts ?? emptyCounts
  const totalPages = Math.max(1, Math.ceil((inboundPage?.total ?? 0) / (inboundPage?.size ?? 4)))
  const writable = can(permissions.inboundWrite)

  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (inboundsQuery.isLoading) return <section className="panel"><p>입고 관리 정보를 불러오는 중입니다...</p></section>
  if (inboundsQuery.isError) return <section className="panel"><h1>입고 정보를 불러오지 못했습니다</h1><p>{toDisplayMessage(inboundsQuery.error)}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>INBOUND OPERATIONS</p><h1>입고 관리</h1></div><Link className="inbound-history-back" to="/inbounds/history">입고 히스토리</Link></header>
    <section className="inbound-summary-grid" aria-label="입고 작업 요약">
      <button type="button" onClick={() => selectWorkGroup('WAITING', true)}><span>입고 대기</span><strong>{counts.EXPECTED + counts.WAITING}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('PROCESSING', true)}><span>검수·처리중</span><strong>{counts.PROCESSING}<small> 건</small></strong></button>
      <button type="button" className="summary-ok" onClick={() => selectWorkGroup('COMPLETED', true)}><span>입고 완료</span><strong>{counts.COMPLETED}<small> 건</small></strong></button>
    </section>
    {warehouseIds[0] !== undefined && <RegisterInboundForm warehouseId={warehouseIds[0]} writable={writable} onRegistered={(id) => { setWorkGroup('ALL'); setPage(1); setSelectedId(id) }} />}
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}>
        <div className="panel-heading"><div><p className="eyebrow">INBOUND QUEUE</p><h2>입고 작업 목록</h2></div><small>{inboundPage?.total ?? 0}건</small></div>
        <div className="inbound-work-tabs" role="tablist" aria-label="입고 작업 단계">{workGroups.map((group) => {
          const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, value) => total + value, 0)
          return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button>
        })}</div>
        <div className="inbound-list">
          {inbounds.map((inbound) => <button type="button" key={inbound.inboundId} className={`inbound-list-item ${selected?.inboundId === inbound.inboundId ? 'selected' : ''}`} onClick={() => setSelectedId(inbound.inboundId)}><span><InboundStatusBadge status={inbound.status} /><time>{inbound.expectedArrivalDate}</time></span><strong>입고 #{inbound.inboundId}</strong></button>)}
          {inbounds.length === 0 && <p className="inbound-empty">이 단계에서 처리할 입고 건이 없습니다.</p>}
        </div>
        {isHistoryPreview ? (inboundPage && inboundPage.total > RECENT_HISTORY_SIZE && <div className="inbound-history-link"><Link to="/inbounds/history">전체 완료 이력 보기 ({inboundPage.total}건)</Link></div>) : (totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button></div>)}
      </aside>
      {selected ? <InboundDetail key={selected.inboundId} inbound={selected} warehouseIds={warehouseIds} writable={writable} confirm={setPendingConfirm} /> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">INBOUND QUEUE</p><h2>처리할 입고 작업이 없습니다</h2><span>위에서 새 입고를 등록하거나 다른 단계 탭을 선택하세요.</span></div></section>}
    </section>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}

function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }

function InboundDetail({ inbound, warehouseIds, writable, confirm }: { inbound: Inbound; warehouseIds: number[]; writable: boolean; confirm: (pending: PendingConfirm) => void }) {
  const itemsQuery = useInboundItems(inbound.inboundId, warehouseIds)
  const items = itemsQuery.data
  const startProcessing = useStartInboundProcessing()
  const completeInbound = useCompleteInbound()
  const busy = startProcessing.isPending || completeInbound.isPending
  const actionError = startProcessing.error ?? completeInbound.error
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">INBOUND #{inbound.inboundId}</p><h2>입고 #{inbound.inboundId}</h2><div className="inbound-detail-meta"><span><b>도착 예정일</b>{inbound.expectedArrivalDate}</span><span><b>품목</b>{items ? `${items.length}개` : '-'}</span></div></div><InboundStatusBadge status={inbound.status} /></div>
    {itemsQuery.isLoading && <p>품목을 불러오는 중입니다...</p>}
    {itemsQuery.isError && <p className="inbound-error" role="alert">{toDisplayMessage(itemsQuery.error, '품목을 불러오지 못했습니다.')}</p>}
    {items && (inbound.status === 'EXPECTED' || inbound.status === 'WAITING') && <section className="inbound-stage"><h3>입고 대기</h3><p>Zone 용량 점검을 통과한 입고 건입니다. 물품이 입고처리장에 도착하면 입고 처리를 시작하세요. 시작하면 입고 수량만큼 입고처리장이 점유됩니다.</p><InboundItemsSummary items={items} /><ActionButton disabled={!writable || busy || inbound.status === 'EXPECTED'} onClick={() => confirm({ title: '입고 처리를 시작할까요?', description: '입고처리장 공간이 점유되며 되돌릴 수 없습니다.', confirmLabel: '처리 시작', run: () => startProcessing.mutate(inbound.inboundId) })}>입고 처리 시작</ActionButton></section>}
    {items && inbound.status === 'PROCESSING' && <ProcessingStage items={items} writable={writable} busy={busy} confirm={confirm} onComplete={() => completeInbound.mutate(inbound.inboundId)} />}
    {items && inbound.status === 'COMPLETED' && <section className="inbound-stage completed"><h3>입고 완료</h3><p>검수 결과대로 Lot·재고가 등록되었습니다. 불량 수량은 폐기 요청으로 연계됩니다.</p><InboundItemsSummary items={items} /></section>}
    {actionError && <p className="inbound-error" role="alert">{toDisplayMessage(actionError)}</p>}
  </section>
}

function ProcessingStage({ items, writable, busy, confirm, onComplete }: { items: InboundItemView[]; writable: boolean; busy: boolean; confirm: (pending: PendingConfirm) => void; onComplete: () => void }) {
  const inspect = useInspectInboundItem()
  const pendingItems = items.filter((item) => item.inspectionStatus === 'PENDING')
  const inspectedItems = items.filter((item) => item.inspectionStatus === 'INSPECTED')
  const allInspected = pendingItems.length === 0
  return <section className="inbound-stage">
    <h3>수량·품질 검수</h3><p>품목마다 실제로 도착한 수령 라인(Lot·수량·판정)을 입력해 저장합니다. 같은 품목이 Lot 여러 개로 오거나 일부만 파손된 경우 라인을 나눠 입력하세요. 검수는 품목당 한 번만 저장할 수 있고, 불량 라인은 폐기 요청으로 연계됩니다.</p>
    {pendingItems.map((item) => <InboundReceiptsForm key={item.inboundItemId} item={item} writable={writable} pending={inspect.isPending} onSubmit={(body) => confirm({ title: `${item.productName} 검수를 저장할까요?`, description: '검수는 품목당 한 번만 저장할 수 있고 저장한 뒤에는 수정할 수 없습니다.', confirmLabel: '검수 저장', run: () => inspect.mutate({ inboundItemId: item.inboundItemId, body }) })} />)}
    {inspectedItems.length > 0 && <><h3>검수 완료 품목</h3><InboundItemsSummary items={inspectedItems} /></>}
    {inspect.isError && <p className="inbound-error" role="alert">{toDisplayMessage(inspect.error)}</p>}
    {allInspected ? <ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '입고를 완료할까요?', description: '수령 라인 기준으로 Lot·재고가 등록되고 입고처리장이 해제됩니다. 불량 라인은 폐기 요청으로 연계됩니다. 되돌릴 수 없습니다.', confirmLabel: '입고 완료', run: onComplete })}>입고 완료 · 재고 등록</ActionButton>
      : <p className="inbound-empty">모든 품목의 검수를 저장하면 입고를 완료할 수 있습니다.</p>}
  </section>
}
