import { useMemo, useState, type FormEvent } from 'react'
import type { Warehouse } from '../../features/warehouse/model/warehouseSchemas'
import { useMaterialSearch } from '../../features/material/model/useMaterials'
import { useDebouncedValue } from '../../shared/lib/useDebouncedValue'
import { SearchSelect } from '../../shared/ui/SearchSelect'
import { lotStatuses, lotStatusLabels, qualityStatuses, qualityStatusLabels, type StockFilters } from '../../features/stock/model/stockSchemas'

type Props = {
  initial: StockFilters
  /** 창고 이름 목록. 비어 있으면(불러오는 중이거나 실패) 창고 id를 직접 입력한다. */
  warehouses?: readonly Warehouse[]
  onApply: (filters: StockFilters) => void
}

const POSITIVE_INTEGER = /^[1-9]\d*$/
const PRODUCT_SEARCH_DELAY_MS = 250

/** 재고 현황 검색 조건. 모두 선택이고 비워 두면 전체다. */
export function StockFilterForm({ initial, warehouses = [], onApply }: Props) {
  const [warehouse, setWarehouse] = useState(initial.warehouseId?.toString() ?? '')
  const [productId, setProductId] = useState(initial.productId?.toString() ?? '')
  // 상품은 입력한 글자로 서버에서 찾는다. 고른 상품의 이름은 검색 결과가 바뀌어도 보이도록 따로 기억한다.
  const [productQuery, setProductQuery] = useState('')
  const [productLabel, setProductLabel] = useState(initial.productId === undefined ? '' : `상품 ${initial.productId}`)
  const productSearch = useMaterialSearch(useDebouncedValue(productQuery, PRODUCT_SEARCH_DELAY_MS))
  const [qualityStatus, setQualityStatus] = useState(initial.qualityStatus ?? '')
  const [lotStatus, setLotStatus] = useState(initial.lotStatus ?? '')
  const [hold, setHold] = useState(initial.allocationHold === undefined ? '' : String(initial.allocationHold))
  const [error, setError] = useState<string | null>(null)

  function submit(event: FormEvent) {
    event.preventDefault()
    const trimmed = warehouse.trim()
    if (trimmed !== '' && !POSITIVE_INTEGER.test(trimmed)) {
      setError('창고 id는 양의 정수여야 합니다.')
      return
    }
    setError(null)
    onApply({
      ...(trimmed !== '' && { warehouseId: Number(trimmed) }),
      ...(productId !== '' && { productId: Number(productId) }),
      ...(qualityStatus && { qualityStatus }),
      ...(lotStatus && { lotStatus }),
      ...(hold !== '' && { allocationHold: hold === 'true' }),
    })
  }

  function reset() {
    setWarehouse('')
    setProductId('')
    setProductLabel('')
    setQualityStatus('')
    setLotStatus('')
    setHold('')
    setError(null)
    onApply({})
  }

  const productOptions = useMemo(() => (productSearch.data?.items ?? []).map((product) => ({ value: String(product.productId), label: `${product.productName} (${product.productCode})` })), [productSearch.data])
  const productHidden = Math.max((productSearch.data?.totalElements ?? 0) - (productSearch.data?.items.length ?? 0), 0)
  const pristine = warehouse === '' && productId === '' && qualityStatus === '' && lotStatus === '' && hold === ''

  return (
    <form className="panel stock-filters" onSubmit={submit} role="search" aria-label="재고 검색">
      <div className="stock-filter-grid">
        {warehouses.length > 0
          ? <label>창고
            <select value={warehouse} onChange={(event) => setWarehouse(event.target.value)}>
              <option value="">전체</option>
              {warehouses.map((item) => <option key={item.warehouseId} value={item.warehouseId}>{item.warehouseName}</option>)}
            </select>
          </label>
          : <label>창고 id<input value={warehouse} onChange={(event) => setWarehouse(event.target.value)} inputMode="numeric" placeholder="전체" autoComplete="off" /></label>}
        <SearchSelect
          label="상품"
          options={productOptions}
          value={productId}
          selectedLabel={productLabel}
          loading={productSearch.isFetching}
          hiddenCount={productHidden}
          onQueryChange={setProductQuery}
          onChange={(next) => { setProductId(next); setProductLabel(productOptions.find((option) => option.value === next)?.label ?? '') }}
        />
        <label>품질 상태
          <select value={qualityStatus} onChange={(event) => setQualityStatus(event.target.value)}>
            <option value="">전체</option>
            {qualityStatuses.map((status) => <option key={status} value={status}>{qualityStatusLabels[status]}</option>)}
          </select>
        </label>
        <label>Lot 상태
          <select value={lotStatus} onChange={(event) => setLotStatus(event.target.value)}>
            <option value="">전체</option>
            {lotStatuses.map((status) => <option key={status} value={status}>{lotStatusLabels[status]}</option>)}
          </select>
        </label>
        <label>할당 보류
          <select value={hold} onChange={(event) => setHold(event.target.value)}>
            <option value="">전체</option>
            <option value="true">보류 중</option>
            <option value="false">보류 아님</option>
          </select>
        </label>
      </div>
      {error && <p className="inbound-error" role="alert">{error}</p>}
      <div className="stock-filter-actions">
        <button type="submit" className="inbound-action-button">조회</button>
        <button type="button" className="inbound-action-button employee-secondary" disabled={pristine} onClick={reset}>초기화</button>
      </div>
    </form>
  )
}
