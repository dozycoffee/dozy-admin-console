import { useState, type FormEvent } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { PermissionGate } from '../../features/auth/ui/PermissionGate'
import { toMaterialErrorMessage } from '../../features/material/model/materialErrors'
import { labelOf, materialCategories, materialCategoryLabels, materialStatuses, materialStatusLabels, type Material, type MaterialFilters } from '../../features/material/model/materialSchemas'
import { normalizeMaterialCode } from '../../features/material/model/materialValidation'
import { useChangeMaterialStatus, useMaterials } from '../../features/material/model/useMaterials'
import { isTransientApiError } from '../../shared/api/ApiError'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'
import { MaterialForm } from './MaterialForm'

const PAGE_SIZE = 20

type PendingStatusChange = { material: Material; next: 'ACTIVE' | 'INACTIVE' }

/**
 * 원자재·재고 관리 모드의 원자재 마스터 화면. inventory 서비스의 상품 마스터를 목록·등록·상태 변경한다.
 * 등록과 상태 변경 버튼은 `inventory.write`가 있을 때만 보인다.
 */
export function MaterialsPage() {
  const { notify } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [codeInput, setCodeInput] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [statusInput, setStatusInput] = useState('')
  const [filters, setFilters] = useState<MaterialFilters>({})
  const [page, setPage] = useState(1)
  const [pending, setPending] = useState<PendingStatusChange | null>(null)
  const [statusError, setStatusError] = useState<string | null>(null)
  const query = useMaterials({ ...filters, page: page - 1, size: PAGE_SIZE })
  const changeStatus = useChangeMaterialStatus()
  const items = query.data?.items ?? []
  const total = query.data?.totalElements ?? 0
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const pristine = codeInput === '' && categoryInput === '' && statusInput === ''

  function apply(next: MaterialFilters) {
    setFilters(next)
    setPage(1)
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    const code = normalizeMaterialCode(codeInput)
    setCodeInput(code)
    apply({ ...(code !== '' && { code }), ...(categoryInput && { category: categoryInput }), ...(statusInput && { status: statusInput }) })
  }

  function reset() {
    setCodeInput('')
    setCategoryInput('')
    setStatusInput('')
    apply({})
  }

  function confirmStatusChange() {
    if (!pending) return
    const { material, next } = pending
    setPending(null)
    setStatusError(null)
    changeStatus.mutate(
      { productId: material.productId, productStatus: next },
      {
        onSuccess: () => notify(`${material.productName}을(를) ${next === 'INACTIVE' ? '사용 중지' : '사용 중'}로 바꿨습니다.`),
        // 일시적 실패는 토스트로, 없음(404) 같은 업무 오류는 화면에 남긴다.
        onError: (error) => {
          const message = toMaterialErrorMessage(error)
          if (isTransientApiError(error)) notify(message, 'error')
          else setStatusError(message)
        },
      },
    )
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>INVENTORY MANAGEMENT</p><h1>원자재</h1></div>
      <PermissionGate permission={permissions.inventoryWrite}>
        <button type="button" className="inbound-action-button compact employee-invite-toggle" aria-haspopup="dialog" onClick={() => setAddOpen(true)}>원자재 등록</button>
      </PermissionGate>
    </header>
    <Modal open={addOpen} title="원자재 등록" onClose={() => setAddOpen(false)}>
      <MaterialForm
        onCancel={() => setAddOpen(false)}
        // 최근 등록한 원자재가 목록의 어느 쪽에 오는지 서버 정렬에 달려 있어, 방금 등록한 코드로 조회해 바로 보여준다.
        onDone={(created) => {
          setAddOpen(false)
          notify(`원자재를 등록했습니다. (${created.productCode})`)
          setCodeInput(created.productCode); setCategoryInput(''); setStatusInput('')
          apply({ code: created.productCode })
        }}
      />
    </Modal>
    <p className="employee-hint role-intro">재고 서비스의 상품 마스터입니다. 사용 중지한 원자재는 새 예약에 쓸 수 없고, 입고는 그대로 받을 수 있습니다. 원자재 코드로 찾을 때는 정확한 코드를 입력하세요.</p>
    <form className="panel stock-filters" onSubmit={submit} role="search" aria-label="원자재 검색">
      <div className="stock-filter-grid">
        <label>원자재 코드<input value={codeInput} onChange={(event) => setCodeInput(event.target.value)} placeholder="전체" autoComplete="off" /></label>
        <label>카테고리
          <select value={categoryInput} onChange={(event) => setCategoryInput(event.target.value)}>
            <option value="">전체</option>
            {materialCategories.map((value) => <option key={value} value={value}>{materialCategoryLabels[value]}</option>)}
          </select>
        </label>
        <label>상태
          <select value={statusInput} onChange={(event) => setStatusInput(event.target.value)}>
            <option value="">전체</option>
            {materialStatuses.map((value) => <option key={value} value={value}>{materialStatusLabels[value]}</option>)}
          </select>
        </label>
      </div>
      <div className="stock-filter-actions">
        <button type="submit" className="inbound-action-button">조회</button>
        <button type="button" className="inbound-action-button employee-secondary" disabled={pristine && Object.keys(filters).length === 0} onClick={reset}>초기화</button>
      </div>
    </form>
    <section className="panel audit-list-panel">
      <div className="panel-heading"><div><p className="eyebrow">MATERIALS</p><h2>원자재</h2></div><small>{total}건</small></div>
      {query.isLoading && <p>원자재를 불러오는 중입니다...</p>}
      {query.isError && <p className="inbound-error" role="alert">{toMaterialErrorMessage(query.error)}</p>}
      {statusError && <p className="inbound-error" role="alert">{statusError}</p>}
      {query.data && items.length === 0 && <p className="inbound-empty">조건에 맞는 원자재가 없습니다.</p>}
      {items.length > 0 && <div className="audit-table-wrap">
        <table className="audit-table material-table">
          <thead><tr><th>코드</th><th>이름</th><th>카테고리</th><th>단위</th><th>유통기한</th><th>상태</th><PermissionGate permission={permissions.inventoryWrite}><th>관리</th></PermissionGate></tr></thead>
          <tbody>
            {items.map((item) => {
              const active = item.productStatus === 'ACTIVE'
              return <tr key={item.productId}>
                <td>{item.productCode}</td>
                <td><strong>{item.productName}</strong></td>
                <td>{labelOf(materialCategoryLabels, item.category)}</td>
                <td>{item.unit}</td>
                <td>{item.shelfLifeDays == null ? '없음' : `${item.shelfLifeDays}일`}</td>
                <td><span className={`stock-badge ${active ? 'stock-quality-normal' : 'stock-quality-disposal_scheduled'}`}>{labelOf(materialStatusLabels, item.productStatus)}</span></td>
                <PermissionGate permission={permissions.inventoryWrite}>
                  <td><button type="button" className="audit-view" disabled={changeStatus.isPending} aria-label={`${item.productName} ${active ? '사용 중지' : '사용 재개'}`} onClick={() => { setStatusError(null); setPending({ material: item, next: active ? 'INACTIVE' : 'ACTIVE' }) }}>{active ? '사용 중지' : '사용 재개'}</button></td>
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
      title={pending?.next === 'INACTIVE' ? '원자재를 사용 중지할까요?' : '원자재를 다시 사용할까요?'}
      description={pending ? (pending.next === 'INACTIVE' ? `${pending.material.productName}은(는) 새 예약에 쓸 수 없게 됩니다.` : `${pending.material.productName}을(를) 다시 예약에 쓸 수 있게 됩니다.`) : undefined}
      confirmLabel={pending?.next === 'INACTIVE' ? '사용 중지' : '사용 재개'}
      onCancel={() => setPending(null)}
      onConfirm={confirmStatusChange}
    />
  </>
}
