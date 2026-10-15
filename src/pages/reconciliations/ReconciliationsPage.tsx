import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import { permissions } from '../../features/auth/model/permissions'
import { PermissionGate } from '../../features/auth/ui/PermissionGate'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { useAllMaterials } from '../../features/material/model/useMaterials'
import { toReconciliationErrorMessage } from '../../features/reconciliation/model/reconciliationErrors'
import { labelOf, reconciliationStatuses, reconciliationStatusLabels, type ReconciliationFilters, type ReconciliationProposal } from '../../features/reconciliation/model/reconciliationSchemas'
import { useApproveReconciliation, useReconciliationProposals, useRejectReconciliation } from '../../features/reconciliation/model/useReconciliations'
import { labelOf as stockLabelOf, qualityStatusLabels } from '../../features/stock/model/stockSchemas'
import { useWarehouseList } from '../../features/warehouse/model/useWarehouses'
import { isTransientApiError } from '../../shared/api/ApiError'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { useToast } from '../../shared/ui/toastContext'

const PAGE_SIZE = 20
const POSITIVE_INTEGER = /^[1-9]\d*$/

type Pending = { proposal: ReconciliationProposal; action: 'approve' | 'reject' }

const signed = (value: number) => (value > 0 ? `+${value}` : String(value))

type ReviewSummaryProps = { proposal: ReconciliationProposal; productName: string; productCode: string | null; unit: string | null; warehouse: string }

/** 승인·거절 확인창에서 무엇을 어떻게 바꾸는지 한눈에 보이도록 대상(상품·Lot·창고)과 수량 비교(inventory → WMS, 변동)를 나눠 보여준다. */
function ReviewSummary({ proposal, productName, productCode, unit, warehouse }: ReviewSummaryProps) {
  const quantity = (value: number) => <><b>{value}</b>{unit && <i>{unit}</i>}</>
  return <>
    <div className="review-target">
      <strong>{productName}</strong>
      <small>{[productCode, `Lot ${proposal.lotNumber}`, stockLabelOf(qualityStatusLabels, proposal.qualityStatus)].filter(Boolean).join(' · ')}</small>
      <small>{warehouse}</small>
    </div>
    <div className="review-compare" role="group" aria-label="수량 비교">
      <div><span>inventory</span>{quantity(proposal.inventoryQuantity)}</div>
      <span className="review-arrow" aria-hidden="true">→</span>
      <div><span>WMS</span>{quantity(proposal.wmsQuantity)}</div>
      <div className="review-change"><span>변동</span><b className={proposal.quantityChange > 0 ? 'stock-plus' : 'stock-minus'}>{signed(proposal.quantityChange)}</b></div>
    </div>
  </>
}

/** 주소의 `?status=PENDING`으로 처음 상태 필터를 정한다. 없거나 알 수 없는 값이면 처리가 필요한 승인 대기부터 보여준다. */
function initialStatus(search: URLSearchParams): string {
  const status = search.get('status')
  return status !== null && (reconciliationStatuses as readonly string[]).includes(status) ? status : 'PENDING'
}

/**
 * 원자재·재고 관리 모드의 대사 보정안. 하루 1회 inventory가 WMS 수량과 비교해 만든 불일치 행을 확인하고 항목별로 승인·거절한다.
 * 승인·거절 버튼은 `inventory.write`가 있을 때만 보인다.
 */
export function ReconciliationsPage() {
  const { notify } = useToast()
  const [searchParams] = useSearchParams()
  const [initial] = useState(() => initialStatus(searchParams))
  const [warehouseInput, setWarehouseInput] = useState('')
  const [statusInput, setStatusInput] = useState(initial)
  const [filters, setFilters] = useState<ReconciliationFilters>({ status: initial })
  const [filterError, setFilterError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<Pending | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const query = useReconciliationProposals({ ...filters, page: page - 1, size: PAGE_SIZE })
  const materials = useAllMaterials()
  const warehouses = useWarehouseList()
  const approve = useApproveReconciliation()
  const reject = useRejectReconciliation()
  const busy = approve.isPending || reject.isPending
  const materialById = useMemo(() => new Map((materials.data ?? []).map((material) => [material.productId, material])), [materials.data])
  const warehouseById = useMemo(() => new Map((warehouses.data ?? []).map((warehouse) => [warehouse.warehouseId, warehouse])), [warehouses.data])
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)

  // 이름을 못 읽었으면(권한 없음, 서버 오류, 마스터에 없음) id로 보여준다.
  const productName = (productId: number) => materialById.get(productId)?.productName ?? `상품 ${productId}`
  const warehouseName = (warehouseId: number) => warehouseById.get(warehouseId)?.warehouseName ?? null

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = warehouseInput.trim()
    if (trimmed !== '' && !POSITIVE_INTEGER.test(trimmed)) {
      setFilterError('창고 id는 양의 정수여야 합니다.')
      return
    }
    setFilterError(null)
    setFilters({ ...(trimmed !== '' && { warehouseId: Number(trimmed) }), ...(statusInput && { status: statusInput }) })
    setPage(1)
  }

  function reset() {
    setWarehouseInput('')
    setStatusInput('')
    setFilterError(null)
    setFilters({})
    setPage(1)
  }

  function confirm() {
    if (!pending) return
    const { proposal, action } = pending
    setPending(null)
    setActionError(null)
    const options = {
      onSuccess: () => notify(action === 'approve' ? '보정안을 승인해 재고에 반영했습니다.' : '보정안을 거절했습니다.'),
      // WMS 조회 실패 같은 일시적 실패는 토스트로, 이미 처리됨·수량 변경 같은 업무 오류는 읽고 조치할 수 있게 화면에 남긴다.
      onError: (error: unknown) => {
        const message = toReconciliationErrorMessage(error)
        if (isTransientApiError(error)) notify(message, 'error')
        else setActionError(message)
      },
    }
    if (action === 'approve') approve.mutate(proposal.stockAdjustmentId, options)
    else reject.mutate(proposal.stockAdjustmentId, options)
  }

  const label = (proposal: ReconciliationProposal) => `${productName(proposal.productId)} ${proposal.lotNumber}`

  return <>
    <header className="page-header inbound-page-header">
      <div><p>INVENTORY MANAGEMENT</p><h1>대사 보정안</h1></div>
    </header>
    <p className="employee-hint role-intro">하루 1회 inventory와 WMS의 수량을 비교해 어긋난 행마다 만든 보정안입니다. 변동량은 WMS 수량에서 inventory 수량을 뺀 값이며, 원인을 확인한 뒤 항목별로 승인하면 재고에 반영됩니다. 승인할 때 수량이 달라졌으면 새 값으로 갱신만 하니 확인 후 다시 승인하세요.</p>
    <form className="panel stock-filters" onSubmit={submit} role="search" aria-label="보정안 검색">
      <div className="stock-filter-grid">
        {(warehouses.data ?? []).length > 0
          ? <label>창고
            <select value={warehouseInput} onChange={(event) => setWarehouseInput(event.target.value)}>
              <option value="">전체</option>
              {(warehouses.data ?? []).map((warehouse) => <option key={warehouse.warehouseId} value={warehouse.warehouseId}>{warehouse.warehouseName}</option>)}
            </select>
          </label>
          : <label>창고 id<input value={warehouseInput} onChange={(event) => setWarehouseInput(event.target.value)} inputMode="numeric" placeholder="전체" autoComplete="off" /></label>}
        <label>상태
          <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
            <option value="">전체</option>
            {reconciliationStatuses.map((status) => <option key={status} value={status}>{reconciliationStatusLabels[status]}</option>)}
          </select>
        </label>
      </div>
      {filterError && <p className="inbound-error" role="alert">{filterError}</p>}
      <div className="stock-filter-actions">
        <button type="submit" className="inbound-action-button">조회</button>
        <button type="button" className="inbound-action-button employee-secondary" disabled={warehouseInput === '' && statusInput === '' && Object.keys(filters).length === 0} onClick={reset}>초기화</button>
      </div>
    </form>
    <section className="panel audit-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">RECONCILIATION</p><h2>보정안</h2></div><small>{total}건</small></div>
      {query.isLoading && <p>보정안을 불러오는 중입니다...</p>}
      {query.isError && <p className="inbound-error" role="alert">{toReconciliationErrorMessage(query.error)}</p>}
      {actionError && <p className="inbound-error" role="alert">{actionError}</p>}
      {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 보정안이 없습니다.</p>}
      {items.length > 0 && <div className="audit-table-wrap">
        <table className="audit-table reconciliation-table">
          <thead><tr><th>상품</th><th>창고</th><th>Lot</th><th className="stock-num">inventory</th><th className="stock-num">WMS</th><th className="stock-num">변동</th><th>상태</th><PermissionGate permission={permissions.inventoryWrite}><th>처리</th></PermissionGate></tr></thead>
          <tbody>
            {items.map((item) => {
              const warehouse = warehouseName(item.warehouseId)
              const waiting = item.status === 'PENDING'
              return <tr key={item.stockAdjustmentId}>
                <td><strong>{productName(item.productId)}</strong><small>{materialById.get(item.productId)?.productCode ?? `id ${item.productId}`}</small></td>
                <td>{warehouse ?? item.warehouseId}{warehouse && <small>id {item.warehouseId}</small>}</td>
                <td>{item.lotNumber}<small>{stockLabelOf(qualityStatusLabels, item.qualityStatus)}</small></td>
                <td className="stock-num">{item.inventoryQuantity}</td>
                <td className="stock-num">{item.wmsQuantity}</td>
                <td className="stock-num"><span className={item.quantityChange > 0 ? 'stock-plus' : 'stock-minus'}>{signed(item.quantityChange)}</span>{item.requiresAdmin && <small title="변동량이 임계치를 넘어 상위 승인자(admin)만 승인할 수 있습니다.">임계치 초과</small>}</td>
                <td><span className={`stock-badge ${item.status === 'PENDING' ? 'stock-lot-expiring_soon' : item.status === 'APPLIED' ? 'stock-quality-normal' : 'stock-quality-disposal_scheduled'}`}>{labelOf(reconciliationStatusLabels, item.status)}</span>{item.approvedAt && <small>{formatDateTime(item.approvedAt)}</small>}</td>
                <PermissionGate permission={permissions.inventoryWrite}>
                  <td>{waiting && <div className="reconciliation-actions">
                    <button type="button" className="audit-view" disabled={busy} aria-label={`${label(item)} 승인`} onClick={() => { setActionError(null); setPending({ proposal: item, action: 'approve' }) }}>승인</button>
                    <button type="button" className="audit-view reconciliation-reject" disabled={busy} aria-label={`${label(item)} 거절`} onClick={() => { setActionError(null); setPending({ proposal: item, action: 'reject' }) }}>거절</button>
                  </div>}</td>
                </PermissionGate>
              </tr>
            })}
          </tbody>
        </table>
      </div>}
      {totalPages > 1 && <div className="inbound-pagination">
        <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
        <span>{page} / {totalPages}</span>
        <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
      </div>}
    </section>
    <ConfirmModal
      open={pending !== null}
      title={pending?.action === 'approve' ? '보정안을 승인할까요?' : '보정안을 거절할까요?'}
      description={pending ? (pending.action === 'approve' ? '승인하면 재고 수량이 WMS 수량으로 바뀝니다.' : '거절하면 재고 수량은 바뀌지 않습니다.') : undefined}
      confirmLabel={pending?.action === 'approve' ? '승인' : '거절'}
      onCancel={() => setPending(null)}
      onConfirm={confirm}
    >
      {pending && <ReviewSummary proposal={pending.proposal} productName={productName(pending.proposal.productId)} productCode={materialById.get(pending.proposal.productId)?.productCode ?? null} unit={materialById.get(pending.proposal.productId)?.unit ?? null} warehouse={warehouseName(pending.proposal.warehouseId) ?? `창고 ${pending.proposal.warehouseId}`} />}
    </ConfirmModal>
  </>
}
