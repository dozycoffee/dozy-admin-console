import { useRef, useState, type ReactNode } from 'react'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useAuth } from '../../features/auth/model/useAuth'
import { permissions } from '../../features/auth/model/permissions'
import type { StockAudit, StockAuditStatus } from '../../features/stock-audit/model/stockAuditSchemas'
import { toStockAuditErrorMessage } from '../../features/stock-audit/model/stockAuditErrors'
import { useAssignStockAudit, useCloseStockAudit, useCompleteStockAudit, useCountStockAuditItem, useStockAuditItems, useStockAudits, type StockAuditItemView } from '../../features/stock-audit/model/useStockAudits'
import { StockAuditStatusBadge } from '../../features/stock-audit/ui/StockAuditStatusBadge'
import { RegisterStockAuditForm } from '../../features/stock-audit/ui/RegisterStockAuditForm'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { toDisplayMessage } from '../../shared/api/displayMessage'

type WorkGroup = 'ALL' | StockAuditStatus
const workGroups: Array<{ id: WorkGroup; label: string; statuses: StockAuditStatus[] }> = [
  { id: 'ALL', label: '전체', statuses: [] },
  { id: 'SCHEDULED', label: '실사 예정', statuses: ['SCHEDULED'] },
  { id: 'IN_PROGRESS', label: '실사 진행', statuses: ['IN_PROGRESS'] },
  { id: 'COMPLETED', label: '확정 대기', statuses: ['COMPLETED'] },
  { id: 'CLOSED', label: '확정 완료', statuses: ['CLOSED'] },
]
const emptyAudits: StockAudit[] = []
const emptyCounts = { SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 }

type PendingConfirm = { title: string; description: string; confirmLabel: string; run: () => void }

export function StockAuditManagementPage() {
  const user = useCurrentUser()
  const { can } = useAuth()
  const [workGroup, setWorkGroup] = useState<WorkGroup>('ALL')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const queueRef = useRef<HTMLElement>(null)
  const warehouseIds = user.scope.warehouseIds
  const activeGroup = workGroups.find((group) => group.id === workGroup)!
  const auditsQuery = useStockAudits(warehouseIds, activeGroup.statuses, page)
  const auditPage = auditsQuery.data
  const audits = auditPage?.items ?? emptyAudits
  const selected = audits.find((audit) => audit.stockAuditId === selectedId) ?? audits[0]
  const counts = auditPage?.statusCounts ?? emptyCounts
  const totalPages = Math.max(1, Math.ceil((auditPage?.total ?? 0) / (auditPage?.size ?? 4)))
  const writable = can(permissions.stockAuditWrite)

  function selectWorkGroup(group: WorkGroup, moveToQueue = false) {
    setWorkGroup(group)
    setPage(1)
    setSelectedId(null)
    if (moveToQueue) queueRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  if (auditsQuery.isLoading) return <section className="panel"><p>재고 실사 정보를 불러오는 중입니다...</p></section>
  if (auditsQuery.isError) return <section className="panel"><h1>재고 실사 정보를 불러오지 못했습니다</h1><p>{toDisplayMessage(auditsQuery.error)}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>STOCK AUDIT</p><h1>재고 실사</h1></div></header>
    <section className="inbound-summary-grid" aria-label="재고 실사 요약">
      <button type="button" onClick={() => selectWorkGroup('SCHEDULED', true)}><span>실사 예정</span><strong>{counts.SCHEDULED}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('IN_PROGRESS', true)}><span>실사 진행</span><strong>{counts.IN_PROGRESS}<small> 건</small></strong></button>
      <button type="button" className="summary-warning" onClick={() => selectWorkGroup('COMPLETED', true)}><span>확정 대기</span><strong>{counts.COMPLETED}<small> 건</small></strong></button>
      <button type="button" className="summary-ok" onClick={() => selectWorkGroup('CLOSED', true)}><span>확정 완료</span><strong>{counts.CLOSED}<small> 건</small></strong></button>
    </section>
    <RegisterStockAuditForm warehouseIds={warehouseIds} writable={writable} onRegistered={(id) => { setWorkGroup('ALL'); setPage(1); setSelectedId(id) }} />
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel" ref={queueRef}>
        <div className="panel-heading"><div><p className="eyebrow">STOCK AUDIT QUEUE</p><h2>재고 실사 목록</h2></div><small>{auditPage?.total ?? 0}건</small></div>
        <div className="inbound-work-tabs" role="tablist" aria-label="재고 실사 단계">{workGroups.map((group) => {
          const count = group.statuses.length ? group.statuses.reduce((total, status) => total + counts[status], 0) : Object.values(counts).reduce((total, value) => total + value, 0)
          return <button type="button" key={group.id} role="tab" aria-selected={workGroup === group.id} className={workGroup === group.id ? 'active' : ''} onClick={() => selectWorkGroup(group.id)}>{group.label}<b>{count}</b></button>
        })}</div>
        <div className="inbound-list">
          {audits.map((audit) => <button type="button" key={audit.stockAuditId} className={`inbound-list-item ${selected?.stockAuditId === audit.stockAuditId ? 'selected' : ''}`} onClick={() => setSelectedId(audit.stockAuditId)}><span><StockAuditStatusBadge status={audit.status} /></span><strong>실사 #{audit.stockAuditId}</strong><small>창고 {audit.warehouseId} · Zone #{audit.zoneId}</small></button>)}
          {audits.length === 0 && <p className="inbound-empty">이 단계의 재고 실사가 없습니다.</p>}
        </div>
        {totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button></div>}
      </aside>
      {selected ? <StockAuditDetail key={selected.stockAuditId} audit={selected} warehouseIds={warehouseIds} writable={writable} confirm={setPendingConfirm} /> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">STOCK AUDIT QUEUE</p><h2>진행할 재고 실사가 없습니다</h2><span>위에서 Zone을 골라 실사를 등록하거나 다른 단계 탭을 선택하세요.</span></div></section>}
    </section>
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}

function ActionButton({ disabled, onClick, children }: { disabled: boolean; onClick: () => void; children: ReactNode }) { return <button className="inbound-action-button" type="button" disabled={disabled} onClick={onClick}>{children}</button> }

function StockAuditDetail({ audit, warehouseIds, writable, confirm }: { audit: StockAudit; warehouseIds: number[]; writable: boolean; confirm: (pending: PendingConfirm) => void }) {
  const itemsQuery = useStockAuditItems(audit.stockAuditId, warehouseIds)
  const items = itemsQuery.data
  const assign = useAssignStockAudit()
  const complete = useCompleteStockAudit()
  const close = useCloseStockAudit()
  const count = useCountStockAuditItem()
  const busy = assign.isPending || complete.isPending || close.isPending || count.isPending
  const actionError = assign.error ?? complete.error ?? close.error ?? count.error
  const counted = items?.filter((item) => item.countedQuantity !== null).length ?? 0
  return <section className="panel inbound-detail-panel">
    <div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">STOCK AUDIT #{audit.stockAuditId}</p><h2>재고 실사 #{audit.stockAuditId}</h2><div className="inbound-detail-meta"><span><b>창고</b>{audit.warehouseId}</span><span><b>Zone</b>#{audit.zoneId}</span><span><b>담당자</b>{audit.assignee ?? '-'}</span><span><b>항목</b>{items ? `${items.length}개` : '-'}</span>{audit.approvedBy && <span><b>승인자</b>{audit.approvedBy}</span>}</div></div><StockAuditStatusBadge status={audit.status} /></div>
    {itemsQuery.isLoading && <p>항목을 불러오는 중입니다...</p>}
    {itemsQuery.isError && <p className="inbound-error" role="alert">{toDisplayMessage(itemsQuery.error, '항목을 불러오지 못했습니다.')}</p>}
    {items && audit.status === 'SCHEDULED' && <section className="inbound-stage"><h3>실사 시작 대기</h3><p>시작하면 내가 담당자로 배정되고 항목별 실사 수량을 입력할 수 있습니다. 항목은 등록 시점 Location 재고의 스냅샷입니다.</p><AuditItems items={items} />{items.length === 0 && <p className="inbound-empty">이 Zone에는 실사할 재고가 없습니다.</p>}<ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '실사를 시작할까요?', description: '담당자로 배정되고 실사 진행 단계로 넘어갑니다.', confirmLabel: '실사 시작', run: () => assign.mutate(audit.stockAuditId) })}>실사 시작</ActionButton></section>}
    {items && audit.status === 'IN_PROGRESS' && <section className="inbound-stage"><h3>실사 진행 ({counted} / {items.length})</h3><p>항목마다 실제로 센 수량을 입력해 저장하세요. 모든 항목을 입력해야 실사를 완료할 수 있습니다.</p><AuditItems items={items} editable={writable} saving={count.isPending} onCount={(item, countedQuantity) => count.mutate({ stockAuditItemId: item.stockAuditItemId, countedQuantity })} /><ActionButton disabled={!writable || busy || counted < items.length} onClick={() => confirm({ title: '실사를 완료할까요?', description: '완료하면 실사 수량을 더 고칠 수 없고, 스냅샷 이후 재고가 바뀐 항목이 표시됩니다.', confirmLabel: '실사 완료', run: () => complete.mutate(audit.stockAuditId) })}>실사 완료</ActionButton></section>}
    {items && audit.status === 'COMPLETED' && <section className="inbound-stage"><h3>조정 확정 대기</h3><p>확정하면 실사 수량과 현재 Location 재고의 차이만큼 재고가 조정되고 inventory에도 반영되며 되돌릴 수 없습니다. 스냅샷 이후 입출고가 있었던 항목은 확정 전에 확인하세요. 조정량이 임계치를 넘으면 승인자(admin)만 확정할 수 있습니다.</p><AuditItems items={items} /><ActionButton disabled={!writable || busy} onClick={() => confirm({ title: '조정을 확정할까요?', description: '실사 수량과 현재 재고의 차이만큼 재고가 조정되며 되돌릴 수 없습니다.', confirmLabel: '조정 확정', run: () => close.mutate(audit.stockAuditId) })}>조정 확정</ActionButton></section>}
    {items && audit.status === 'CLOSED' && <section className="inbound-stage completed"><h3>조정 확정 완료</h3><p>실사 결과가 재고에 반영되었습니다.</p><AuditItems items={items} /></section>}
    {actionError && <p className="inbound-error" role="alert">{toStockAuditErrorMessage(actionError)}</p>}
  </section>
}

function AuditItems({ items, editable = false, saving = false, onCount }: { items: StockAuditItemView[]; editable?: boolean; saving?: boolean; onCount?: (item: StockAuditItemView, countedQuantity: number) => void }) {
  return <div className="inspection-table">{items.map((item) => <AuditItemRow key={item.stockAuditItemId} item={item} editable={editable} saving={saving} onCount={onCount} />)}</div>
}

function AuditItemRow({ item, editable, saving, onCount }: { item: StockAuditItemView; editable: boolean; saving: boolean; onCount?: (item: StockAuditItemView, countedQuantity: number) => void }) {
  const [value, setValue] = useState(item.countedQuantity === null ? '' : String(item.countedQuantity))
  const parsed = value.trim() === '' ? null : Number(value)
  const valid = parsed !== null && Number.isInteger(parsed) && parsed >= 0
  const saved = parsed !== null && parsed === item.countedQuantity
  return <div className={`inspection-row ${editable ? 'audit-item-editable' : ''}`}>
    <div>
      <strong>{item.productName ?? `재고 #${item.locationStockId}`}</strong>
      <small>{item.locationCode ?? '-'} · {item.lotNumber ?? '-'} · 스냅샷 {item.snapshotQuantity} ea</small>
      {item.hasUncommittedMovement && <small role="status">스냅샷 이후 재고가 변동되었습니다</small>}
    </div>
    {editable
      ? <>
        <label>실사 수량<input type="number" min={0} step={1} value={value} disabled={saving} onChange={(event) => setValue(event.target.value)} /></label>
        <button type="button" className={`audit-save-button ${saved ? 'saved' : ''}`} disabled={saving || !valid || saved} onClick={() => valid && onCount?.(item, parsed)}>{saved ? '저장됨' : '저장'}</button>
      </>
      : <>
        <div><small>실사 수량</small><strong>{item.countedQuantity ?? '-'}</strong></div>
        <div><small>차이</small><strong>{item.discrepancy === null ? '-' : item.discrepancy > 0 ? `+${item.discrepancy}` : item.discrepancy}</strong></div>
      </>}
  </div>
}
