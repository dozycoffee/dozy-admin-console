import { useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import { inboundStatusLabels, inspectionQualityLabels, type Inbound, type InboundStatus } from '../../features/inbound/model/inboundSchemas'
import { useApproveInbound, useCompleteInspection, useCompletePutaway, useInbounds, useMarkInboundArrived, useMoveToReceivingArea, useStartInspection } from '../../features/inbound/model/useInbounds'
import { zoneCodeLabels } from '../../features/inventory/model/inventorySchemas'

type InspectionDraft = Record<string, { receivedQuantity: number; qualityStatus: 'NORMAL' | 'DEFECTIVE' }>
type WorkGroup = 'ALL' | 'REQUEST' | 'ARRIVAL' | 'INSPECTION' | 'PUTAWAY' | 'COMPLETED'
const workGroups: Array<{ id: WorkGroup; label: string; statuses: InboundStatus[] }> = [
  { id: 'ALL', label: '전체 작업', statuses: [] },
  { id: 'REQUEST', label: '승인 처리', statuses: ['REQUESTED'] },
  { id: 'ARRIVAL', label: '물품 입고', statuses: ['APPROVED', 'ARRIVED'] },
  { id: 'INSPECTION', label: '검수', statuses: ['WAITING', 'PROCESSING'] },
  { id: 'PUTAWAY', label: '적재 대기', statuses: ['PUTAWAY_READY'] },
  { id: 'COMPLETED', label: '완료', statuses: ['COMPLETED'] },
]

function formatStatus(status: InboundStatus) { return <span className={`inbound-status inbound-${status.toLowerCase()}`}>{inboundStatusLabels[status]}</span> }
function draftFor(inbound: Inbound): InspectionDraft { return Object.fromEntries(inbound.items.map((item) => [item.id, { receivedQuantity: item.receivedQuantity ?? item.expectedQuantity, qualityStatus: item.qualityStatus ?? 'NORMAL' }])) }

export function InboundManagementPage() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const [workGroup, setWorkGroup] = useState<WorkGroup>('ALL')
  const [page, setPage] = useState(1)
  const paginationScrollTop = useRef<number | null>(null)
  const queueRef = useRef<HTMLElement>(null)
  const activeGroup = workGroups.find((group) => group.id === workGroup)!
  const inboundsQuery = useInbounds(user.scope.warehouseIds, activeGroup.statuses, page)
  const startInspection = useStartInspection()
  const approveInbound = useApproveInbound()
  const markInboundArrived = useMarkInboundArrived()
  const moveToReceivingArea = useMoveToReceivingArea()
  const completeInspection = useCompleteInspection()
  const completePutaway = useCompletePutaway()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const inboundPage = inboundsQuery.data
  const inbounds = inboundPage?.items ?? emptyInbounds
  const [draft, setDraft] = useState<InspectionDraft>({})
  const selected = inbounds.find((inbound) => inbound.id === selectedId) ?? inbounds[0]
  const counts = inboundPage?.statusCounts ?? emptyStatusCounts
  const summary = { requested: counts.REQUESTED, arrivals: counts.APPROVED + counts.ARRIVED, pending: counts.WAITING, inspecting: counts.PROCESSING, putaway: counts.PUTAWAY_READY }
  const totalPages = Math.max(1, Math.ceil((inboundPage?.total ?? 0) / (inboundPage?.size ?? 4)))
  const busy = startInspection.isPending || approveInbound.isPending || markInboundArrived.isPending || moveToReceivingArea.isPending || completeInspection.isPending || completePutaway.isPending
  const writable = can(permissions.inboundWrite)
  useLayoutEffect(() => {
    if (paginationScrollTop.current === null || inboundPage?.page !== page) return
    const scrollTop = paginationScrollTop.current
    const frame = requestAnimationFrame(() => { window.scrollTo({ top: scrollTop, behavior: 'auto' }); paginationScrollTop.current = null })
    return () => cancelAnimationFrame(frame)
  }, [inboundPage?.page, page])
  function changeDraft(itemId: string, field: 'receivedQuantity' | 'qualityStatus', value: string) { setDraft((current) => ({ ...current, [itemId]: { ...current[itemId], [field]: field === 'receivedQuantity' ? Math.max(0, Number(value)) : value as 'NORMAL' | 'DEFECTIVE' } })) }
  function inspectComplete() { if (selected) completeInspection.mutate({ id: selected.id, body: { items: selected.items.map((item) => ({ inboundItemId: item.id, ...draft[item.id] })) } }) }
  function changePage(nextPage: number) { paginationScrollTop.current = window.scrollY; setPage(nextPage); setSelectedId(null) }
  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (inboundsQuery.isLoading) return <section className="panel"><p>입고 관리 정보를 불러오는 중입니다...</p></section>
  if (inboundsQuery.isError) return <section className="panel"><h1>입고 정보를 불러오지 못했습니다</h1><p>{inboundsQuery.error instanceof Error ? inboundsQuery.error.message : '잠시 후 다시 시도해주세요.'}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>INBOUND OPERATIONS</p><h1>입고 관리</h1></div></header>
    <section className="inbound-summary-grid" aria-label="입고 작업 요약">
      <button type="button" onClick={() => selectWorkGroup('REQUEST', true)}><span>입고 승인 필요</span><strong>{summary.requested}<small> 건</small></strong></button><button type="button" className="summary-warning" onClick={() => selectWorkGroup('ARRIVAL', true)}><span>도착·이동 처리</span><strong>{summary.arrivals}<small> 건</small></strong></button><button type="button" onClick={() => selectWorkGroup('INSPECTION', true)}><span>검수 처리 필요</span><strong>{summary.pending + summary.inspecting}<small> 건</small></strong></button><button type="button" className="summary-ok" onClick={() => selectWorkGroup('PUTAWAY', true)}><span>적재 완료 필요</span><strong>{summary.putaway}<small> 건</small></strong></button>
    </section>
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}><div className="panel-heading"><div><p className="eyebrow">INBOUND QUEUE</p><h2>입고 작업 목록</h2></div><small>{inboundPage?.total ?? 0}건</small></div><div className="inbound-work-tabs" role="tablist" aria-label="입고 작업 단계">{workGroups.map((group) => { const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, count) => total + count, 0); return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button> })}</div><div className="inbound-list">{inbounds.map((inbound) => <button type="button" key={inbound.id} className={`inbound-list-item ${selected?.id === inbound.id ? 'selected' : ''}`} onClick={() => { setSelectedId(inbound.id); setDraft(draftFor(inbound)) }}><span>{formatStatus(inbound.status)}<time>{inbound.expectedArrivalAt}</time></span><strong>{inbound.supplierName}</strong><small className="inbound-list-meta"><b>{inbound.id}</b><i>{inbound.items.length}개 품목</i></small><em className={inbound.capacityCheck.status.toLowerCase()}>{inbound.capacityCheck.status === 'AVAILABLE' ? '공간 확보' : inbound.capacityCheck.status === 'PARTIAL' ? '분할 적재' : '공간 부족'}</em></button>)}{inbounds.length === 0 && <p className="inbound-empty">이 단계에서 처리할 입고 건이 없습니다.</p>}</div>{totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => changePage(page - 1)}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => changePage(page + 1)}>다음</button></div>}</aside>
      {selected ? <section className="panel inbound-detail-panel"><div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">{selected.id}</p><h2>{selected.supplierName}</h2><span>{selected.expectedArrivalAt} 도착 예정 · {selected.items.length}개 품목</span></div>{formatStatus(selected.status)}</div>
        <div className="inbound-capacity-grid"><CapacityCheck title="적재 공간 점검" check={selected.capacityCheck} /><CapacityCheck title={`${selected.receivingAreaCheck.workAreaName} 점검`} check={selected.receivingAreaCheck} /></div>
        {selected.status === 'REQUESTED' ? <section className="inbound-stage"><h3>1. 입고 요청 · 승인 조건 확인</h3><p>입고 예정 물품과 지정 Zone·Location의 적재 공간, 예상 도착 시각의 입고처리장 공간을 모두 확인합니다. 두 공간이 모두 확보된 경우에만 입고 요청을 승인할 수 있습니다.</p><ItemReadTable inbound={selected} showPlans />{selected.receivingAreaCheck.status === 'UNAVAILABLE' && <p className="inbound-hold-notice"><strong>승인 보류</strong> {selected.receivingAreaCheck.nextAvailableAt} 이후 입고처리장 사용이 가능합니다. 도착 일시 변경 또는 물량 분할이 필요합니다.</p>}<ActionButton disabled={!writable || busy || selected.capacityCheck.status === 'UNAVAILABLE' || selected.receivingAreaCheck.status === 'UNAVAILABLE'} onClick={() => approveInbound.mutate({ id: selected.id })}>{selected.receivingAreaCheck.status === 'UNAVAILABLE' ? '입고처리장 여유 확보 필요' : selected.capacityCheck.status === 'UNAVAILABLE' ? '적재 공간 여유 확보 필요' : '공간 확보 후 입고 요청 승인'}</ActionButton></section> : null}
        {selected.status === 'APPROVED' ? <section className="inbound-stage"><h3>2. 입고 승인 · 물품 도착 대기</h3><p>입고 요청이 승인되어 적재 공간을 확보했습니다. 운송 물품이 창고에 도착하면 도착 처리를 진행하세요.</p><ItemReadTable inbound={selected} showPlans /><ActionButton disabled={!writable || busy} onClick={() => markInboundArrived.mutate({ id: selected.id })}>물품 도착 처리</ActionButton></section> : null}
        {selected.status === 'ARRIVED' ? <section className="inbound-stage"><h3>3. 물품 도착 · 입고처리장 이동</h3><p>도착한 물품을 입고처리장으로 이동하면 검수 대기 상태가 됩니다.</p><ItemReadTable inbound={selected} /><ActionButton disabled={!writable || busy} onClick={() => moveToReceivingArea.mutate({ id: selected.id })}>입고처리장 이동 완료</ActionButton></section> : null}
        {selected.status === 'WAITING' ? <section className="inbound-stage"><h3>4. 입고처리장 · 검수 대기</h3><p>입고처리장에 물품이 도착했습니다. 검수를 시작하면 실수량과 품질을 확인할 수 있습니다.</p><ItemReadTable inbound={selected} /> <ActionButton disabled={!writable || busy} onClick={() => startInspection.mutate({ id: selected.id })}>검수 시작</ActionButton></section> : null}
        {selected.status === 'PROCESSING' ? <section className="inbound-stage"><h3>5. 수량·품질 검수</h3><p>실수량과 품질 상태를 기록합니다. 불량은 정상 재고로 적재되지 않고 별도 처리 대상으로 분리됩니다.</p><div className="inspection-table">{selected.items.map((item) => <div className="inspection-row" key={item.id}><div><strong>{item.productName}</strong><small>{item.sku} · {item.targetZoneCode} Zone · 예정 {item.expectedQuantity} ea</small></div><label>실수량<input type="number" min="0" value={draft[item.id]?.receivedQuantity ?? item.expectedQuantity} onChange={(event) => changeDraft(item.id, 'receivedQuantity', event.target.value)} /></label><label>품질<select value={draft[item.id]?.qualityStatus ?? 'NORMAL'} onChange={(event) => changeDraft(item.id, 'qualityStatus', event.target.value)}><option value="NORMAL">정상</option><option value="DEFECTIVE">불량 분리</option></select></label></div>)}</div><ActionButton disabled={!writable || busy} onClick={inspectComplete}>검수 완료 · 적재 계획 확인</ActionButton></section> : null}
        {selected.status === 'PUTAWAY_READY' ? <section className="inbound-stage"><h3>6. Location 적재</h3><p>정상 판정 수량만 지정 Zone에 적재합니다. 분할 적재량과 각 Location의 잔여 Capacity를 확인한 후 완료하세요.</p><ItemReadTable inbound={selected} showPlans /><ActionButton disabled={!writable || busy} onClick={() => completePutaway.mutate({ id: selected.id })}>적재 완료</ActionButton></section> : null}
        {selected.status === 'COMPLETED' ? <section className="inbound-stage completed"><h3>입고 완료</h3><p>정상 수량의 재고·Lot·이력 등록이 완료되었습니다. 불량 수량은 정상 재고에서 제외됩니다.</p><ItemReadTable inbound={selected} showPlans /></section> : null}
      </section> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">INBOUND QUEUE</p><h2>처리할 입고 작업이 없습니다</h2><span>다른 단계 탭을 선택하거나 새 입고 요청을 기다려주세요.</span></div></section>}
    </section>
  </>
}
const emptyInbounds: Inbound[] = []
const emptyStatusCounts = { REQUESTED: 0, APPROVED: 0, ARRIVED: 0, WAITING: 0, PROCESSING: 0, PUTAWAY_READY: 0, COMPLETED: 0, REJECTED: 0 }
function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }
function CapacityCheck({ title, check }: { title: string; check: Inbound['capacityCheck'] | Inbound['receivingAreaCheck'] }) { return <div className={`inbound-capacity ${check.status.toLowerCase()}`}><div><strong>{title}</strong><span>{check.message}</span></div><b>필요 {check.requiredCapacity} ea / 여유 {check.availableCapacity} ea</b></div> }
function ItemReadTable({ inbound, showPlans = false }: { inbound: Inbound; showPlans?: boolean }) { return <div className="inbound-items">{inbound.items.map((item) => <article key={item.id}><header><div><strong>{item.productName}</strong><small>{item.sku} · {item.targetZoneCode} Zone · {zoneCodeLabels[item.targetZoneCode]}</small></div><b>{item.receivedQuantity ?? item.expectedQuantity} <small>/ {item.expectedQuantity} ea</small></b></header>{item.qualityStatus && <span className={`quality-status quality-${item.qualityStatus.toLowerCase()}`}>{inspectionQualityLabels[item.qualityStatus]}</span>}{showPlans && item.qualityStatus !== 'DEFECTIVE' && <div className="putaway-plans">{item.putawayPlans.map((plan) => <span key={plan.locationId}><b>{plan.locationId}</b> {plan.quantity} ea <small>잔여 {plan.remainingCapacity} / {plan.capacity}</small></span>)}</div>}</article>)}</div> }
