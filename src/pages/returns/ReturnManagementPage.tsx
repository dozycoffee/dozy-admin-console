import { useRef, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import type { ReturnRequest, ReturnStatus } from '../../features/return-request/model/returnSchemas'
import { useCompleteReturn, useInspectReturnItem, useReturnItems, useReturns, useStartReturnInspecting, type ReturnItemView } from '../../features/return-request/model/useReturns'
import { ReturnStatusBadge } from '../../features/return-request/ui/ReturnStatusBadge'
import { ReturnItemsSummary } from '../../features/return-request/ui/ReturnItemsSummary'
import { RegisterReturnForm } from '../../features/return-request/ui/RegisterReturnForm'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

type WorkGroup = 'ALL' | 'RECEIVED' | 'INSPECTING' | 'COMPLETED'
// COMPLETED 탭은 작업 큐가 아니라 "최근 완료 건 미리보기"다 — 전체는 /returns/history로 보낸다.
const RECENT_HISTORY_SIZE = 10
const workGroups: Array<{ id: WorkGroup; label: string; statuses: ReturnStatus[] }> = [
  { id: 'ALL', label: '전체 작업', statuses: [] },
  { id: 'RECEIVED', label: '반품 접수', statuses: ['RECEIVED'] },
  { id: 'INSPECTING', label: '검수중', statuses: ['INSPECTING'] },
  { id: 'COMPLETED', label: '완료', statuses: ['COMPLETED'] },
]
const emptyReturns: ReturnRequest[] = []
const emptyCounts = { RECEIVED: 0, INSPECTING: 0, COMPLETED: 0 }

type InspectionDraft = Record<number, { actualQuantity: string; inspectionResult: 'NORMAL' | 'DEFECTIVE' }>
type LotDraft = Record<number, { lotNumber: string; manufactureDate: string; expirationDate: string }>
type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

export function ReturnManagementPage() {
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
  const returnsQuery = useReturns(warehouseIds, activeGroup.statuses, page, isHistoryPreview ? RECENT_HISTORY_SIZE : 4)
  const returnPage = returnsQuery.data
  const returns = returnPage?.items ?? emptyReturns
  const selected = returns.find((request) => request.returnRequestId === selectedId) ?? returns[0]
  const counts = returnPage?.statusCounts ?? emptyCounts
  const totalPages = Math.max(1, Math.ceil((returnPage?.total ?? 0) / (returnPage?.size ?? 4)))
  const writable = can(permissions.returnWrite)

  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (returnsQuery.isLoading) return <section className="panel"><p>반품 관리 정보를 불러오는 중입니다...</p></section>
  if (returnsQuery.isError) return <section className="panel"><h1>반품 정보를 불러오지 못했습니다</h1><p>{returnsQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>RETURN OPERATIONS</p><h1>반품 관리</h1></div><Link className="inbound-history-back" to="/returns/history">반품 히스토리</Link></header>
    <section className="inbound-summary-grid" aria-label="반품 작업 요약">
      <button type="button" onClick={() => selectWorkGroup('RECEIVED', true)}><span>반품 접수</span><strong>{counts.RECEIVED}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('INSPECTING', true)}><span>검수중</span><strong>{counts.INSPECTING}<small> 건</small></strong></button>
      <button type="button" className="summary-ok" onClick={() => selectWorkGroup('COMPLETED', true)}><span>반품 완료</span><strong>{counts.COMPLETED}<small> 건</small></strong></button>
    </section>
    {warehouseIds[0] !== undefined && <RegisterReturnForm warehouseId={warehouseIds[0]} writable={writable} onRegistered={(id) => { setWorkGroup('ALL'); setPage(1); setSelectedId(id) }} />}
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}>
        <div className="panel-heading"><div><p className="eyebrow">RETURN QUEUE</p><h2>반품 작업 목록</h2></div><small>{returnPage?.total ?? 0}건</small></div>
        <div className="inbound-work-tabs" role="tablist" aria-label="반품 작업 단계">{workGroups.map((group) => {
          const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, value) => total + value, 0)
          return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button>
        })}</div>
        <div className="inbound-list">
          {returns.map((request) => <button type="button" key={request.returnRequestId} className={`inbound-list-item ${selected?.returnRequestId === request.returnRequestId ? 'selected' : ''}`} onClick={() => setSelectedId(request.returnRequestId)}><span><ReturnStatusBadge status={request.status} /></span><strong>반품 #{request.returnRequestId}</strong></button>)}
          {returns.length === 0 && <p className="inbound-empty">이 단계에서 처리할 반품 건이 없습니다.</p>}
        </div>
        {isHistoryPreview ? (returnPage && returnPage.total > RECENT_HISTORY_SIZE && <div className="inbound-history-link"><Link to="/returns/history">전체 완료 이력 보기 ({returnPage.total}건)</Link></div>) : (totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button></div>)}
      </aside>
      {selected ? <ReturnDetail key={selected.returnRequestId} request={selected} writable={writable} confirm={setPendingConfirm} /> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">RETURN QUEUE</p><h2>처리할 반품 작업이 없습니다</h2><span>위에서 반품을 접수하거나 다른 단계 탭을 선택하세요.</span></div></section>}
    </section>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}

function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }

function ReturnDetail({ request, writable, confirm }: { request: ReturnRequest; writable: boolean; confirm: (pending: PendingConfirm) => void }) {
  const itemsQuery = useReturnItems(request.returnRequestId)
  const items = itemsQuery.data
  const startInspecting = useStartReturnInspecting()
  const completeReturn = useCompleteReturn()
  const busy = startInspecting.isPending || completeReturn.isPending
  const actionError = startInspecting.error ?? completeReturn.error
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">RETURN #{request.returnRequestId}</p><h2>반품 #{request.returnRequestId}</h2><div className="inbound-detail-meta"><span><b>품목</b>{items ? `${items.length}개` : '-'}</span></div></div><ReturnStatusBadge status={request.status} /></div>
    {itemsQuery.isLoading && <p>품목을 불러오는 중입니다...</p>}
    {itemsQuery.isError && <p className="inbound-error" role="alert">{itemsQuery.error instanceof Error ? itemsQuery.error.message : '품목을 불러오지 못했습니다.'}</p>}
    {items && request.status === 'RECEIVED' && <section className="inbound-stage"><h3>반품 접수</h3><p>반품 물품이 반품 처리장에 도착하면 검수를 시작하세요. 시작하면 신고 수량만큼 반품 처리장이 점유됩니다.</p><ReturnItemsSummary items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '반품 검수를 시작할까요?', description: '반품 처리장 공간이 점유되며 되돌릴 수 없습니다.', confirmLabel: '검수 시작', run: () => startInspecting.mutate(request.returnRequestId) })}>검수 시작</ActionButton></section>}
    {items && request.status === 'INSPECTING' && <InspectingStage items={items} writable={writable} busy={busy} confirm={confirm} onComplete={(body) => completeReturn.mutate({ returnRequestId: request.returnRequestId, body })} />}
    {items && request.status === 'COMPLETED' && <section className="inbound-stage completed"><h3>반품 완료</h3><p>정상 수량은 재고로 복귀했고, 불량 수량은 폐기 요청으로 연계되었습니다.</p><ReturnItemsSummary items={items} /></section>}
    {actionError && <p className="inbound-error" role="alert">{actionError.message}</p>}
  </section>
}

function InspectingStage({ items, writable, busy, confirm, onComplete }: { items: ReturnItemView[]; writable: boolean; busy: boolean; confirm: (pending: PendingConfirm) => void; onComplete: (body: { lotAssignments: Array<{ returnItemId: number; lotNumber: string; manufactureDate?: string; expirationDate?: string }> }) => void }) {
  const inspect = useInspectReturnItem()
  const [draft, setDraft] = useState<InspectionDraft>({})
  const [lots, setLots] = useState<LotDraft>({})
  const allInspected = items.every((item) => item.inspectionResult !== 'PENDING')
  const lotsReady = items.every((item) => (lots[item.returnItemId]?.lotNumber ?? '').trim() !== '')
  function changeDraft(id: number, patch: Partial<InspectionDraft[number]>, item: ReturnItemView) { setDraft((current) => ({ ...current, [id]: { ...{ actualQuantity: String(item.expectedQuantity), inspectionResult: 'NORMAL' as const }, ...current[id], ...patch } })) }
  function changeLot(id: number, patch: Partial<LotDraft[number]>) { setLots((current) => ({ ...current, [id]: { ...{ lotNumber: '', manufactureDate: '', expirationDate: '' }, ...current[id], ...patch } })) }
  function complete() {
    onComplete({ lotAssignments: items.map((item) => { const lot = lots[item.returnItemId]; return { returnItemId: item.returnItemId, lotNumber: lot.lotNumber.trim(), ...(lot.manufactureDate && { manufactureDate: lot.manufactureDate }), ...(lot.expirationDate && { expirationDate: lot.expirationDate }) } }) })
  }
  return <section className="inbound-stage">
    <h3>수량·품질 검수</h3><p>품목별로 실수량과 품질을 저장합니다. 검수는 품목당 한 번만 기록할 수 있고, 불량은 폐기 요청으로 연계됩니다.</p>
    <div className="inspection-table">{items.map((item) => {
      const value = draft[item.returnItemId] ?? { actualQuantity: String(item.expectedQuantity), inspectionResult: 'NORMAL' as const }
      const done = item.inspectionResult !== 'PENDING'
      return <div className="inspection-row" key={item.returnItemId}>
        <div><strong>{item.productName}</strong><small>{item.productCode} · 신고 {item.expectedQuantity} ea</small></div>
        <label>실수량<input type="number" min="0" disabled={done || !writable} value={done ? (item.actualQuantity ?? 0) : value.actualQuantity} onChange={(event) => changeDraft(item.returnItemId, { actualQuantity: event.target.value }, item)} /></label>
        <label>품질<select disabled={done || !writable} value={done ? item.inspectionResult : value.inspectionResult} onChange={(event) => changeDraft(item.returnItemId, { inspectionResult: event.target.value as 'NORMAL' | 'DEFECTIVE' }, item)}>{done && <option value={item.inspectionResult}>{item.inspectionResult === 'NORMAL' ? '정상' : '불량'}</option>}<option value="NORMAL">정상</option><option value="DEFECTIVE">불량</option></select></label>
        {done ? <span className="quality-status quality-normal">검수 완료</span> : <button type="button" disabled={!writable || inspect.isPending || value.actualQuantity === '' || Number(value.actualQuantity) < 0} onClick={() => inspect.mutate({ returnItemId: item.returnItemId, body: { actualQuantity: Number(value.actualQuantity), inspectionResult: value.inspectionResult } })}>검수 저장</button>}
      </div>
    })}</div>
    {inspect.isError && <p className="inbound-error" role="alert">{inspect.error.message}</p>}
    {allInspected ? <>
      <h3>Lot 확정</h3><p>모든 품목의 검수가 끝났습니다. 품목별 Lot 번호(필수)와 제조·유통기한(선택)을 입력하면 재고로 등록됩니다.</p>
      {items.map((item) => <div className="lot-row" key={item.returnItemId}>
        <strong>{item.productName}</strong>
        <label>Lot 번호<input type="text" disabled={!writable} value={lots[item.returnItemId]?.lotNumber ?? ''} onChange={(event) => changeLot(item.returnItemId, { lotNumber: event.target.value })} /></label>
        <label>제조일<input type="date" disabled={!writable} value={lots[item.returnItemId]?.manufactureDate ?? ''} onChange={(event) => changeLot(item.returnItemId, { manufactureDate: event.target.value })} /></label>
        <label>유통기한<input type="date" disabled={!writable} value={lots[item.returnItemId]?.expirationDate ?? ''} onChange={(event) => changeLot(item.returnItemId, { expirationDate: event.target.value })} /></label>
      </div>)}
      <ActionButton disabled={!writable || busy || !lotsReady} onClick={() => confirm({ title: '반품을 완료할까요?', description: '정상 수량은 재고로 복귀하고 불량 수량은 폐기 요청이 생성되며, 반품 처리장이 해제됩니다. 되돌릴 수 없습니다.', confirmLabel: '반품 완료', run: complete })}>반품 완료 · 재고 복귀</ActionButton>
    </> : <p className="inbound-empty">모든 품목의 검수를 저장하면 Lot 확정 단계가 열립니다.</p>}
  </section>
}
