import { useState, type FormEvent } from 'react'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { groupCategories } from '../../features/catalog/model/categoryLabel'
import { productStatuses, productStatusLabels, type Product, type ProductStatus } from '../../features/catalog/model/catalogSchemas'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { useCategories, useOptionGroups, useProductGroups, useProducts, useTags } from '../../features/catalog/model/useCatalog'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { ProductStatusBadge } from '../../features/catalog/ui/ProductStatusBadge'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'
import { ProductDetail, type PendingConfirm } from './ProductDetail'
import { ProductForm } from './ProductForm'

const PAGE_SIZE = 10
const emptyProducts: Product[] = []

const toId = (value: string) => (value === '' ? undefined : Number(value))

/** MD가 Catalog 상품을 조회하고 등록·수정·상태 전환·삭제하는 화면. 쓰기는 `catalog.write`가 있을 때만 할 수 있다. */
export function ProductsPage() {
  const { can } = useAuth()
  const writable = can(permissions.catalogWrite)
  const { notify } = useToast()
  const [addOpen, setAddOpen] = useState(false)
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm | null>(null)
  const [keywordInput, setKeywordInput] = useState('')
  const [keyword, setKeyword] = useState('')
  const [status, setStatus] = useState<ProductStatus | ''>('')
  const [categoryId, setCategoryId] = useState('')
  const [tagId, setTagId] = useState('')
  const [groupId, setGroupId] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const productsQuery = useProducts({ keyword, status: status || undefined, categoryId: toId(categoryId), tagId: toId(tagId), groupId: toId(groupId), page: page - 1, size: PAGE_SIZE })
  const categoriesQuery = useCategories()
  const tagsQuery = useTags()
  const groupsQuery = useProductGroups()
  const optionGroupsQuery = useOptionGroups()
  const categories = categoriesQuery.data ?? []
  const products = productsQuery.data?.content ?? emptyProducts
  const totalElements = productsQuery.data?.totalElements ?? 0
  const totalPages = Math.max(1, productsQuery.data?.totalPages ?? 1)
  const selected = products.find((product) => product.id === selectedId) ?? products[0]

  function resetPaging() {
    setPage(1)
    setSelectedId(null)
  }

  function submitSearch(event: FormEvent) {
    event.preventDefault()
    setKeyword(keywordInput)
    resetPaging()
  }

  return <>
    <header className="page-header inbound-page-header">
      <div><p>MERCHANDISING</p><h1>상품 관리</h1></div>
      {writable && <button type="button" className="inbound-action-button employee-invite-toggle" aria-haspopup="dialog" onClick={() => setAddOpen(true)}>상품 등록</button>}
    </header>
    <Modal open={addOpen} title="상품 등록" onClose={() => setAddOpen(false)}>
      <ProductForm
        categories={categories}
        groups={groupsQuery.data ?? []}
        optionGroups={optionGroupsQuery.data ?? []}
        onCancel={() => setAddOpen(false)}
        // 최근 등록한 상품이 목록의 맨 앞에 오므로 필터를 풀고 1페이지에서 새 상품을 선택해 보여준다.
        onDone={(created) => {
          setAddOpen(false)
          notify(`상품을 등록했습니다. "판매 대기" 상태이니 활성화하면 판매됩니다. (SKU ${created.sku ?? '-'})`)
          setKeywordInput(''); setKeyword(''); setStatus(''); setCategoryId(''); setTagId(''); setGroupId(''); setPage(1); setSelectedId(created.id)
        }}
        onConflict={() => setAddOpen(false)}
      />
    </Modal>
    <form className="panel employee-filters" onSubmit={submitSearch} role="search" aria-label="상품 검색">
      <label>상태
        <select value={status} onChange={(event) => { setStatus(event.target.value as ProductStatus | ''); resetPaging() }}>
          <option value="">전체</option>
          {productStatuses.map((value) => <option key={value} value={value}>{productStatusLabels[value]}</option>)}
        </select>
      </label>
      <label>카테고리
        <select value={categoryId} onChange={(event) => { setCategoryId(event.target.value); resetPaging() }}>
          <option value="">전체</option>
          {groupCategories(categories).map(({ top, children }) => <optgroup key={top.id} label={top.name}>
            <option value={top.id}>{top.name} 전체</option>
            {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
          </optgroup>)}
        </select>
      </label>
      <label>태그
        <select value={tagId} onChange={(event) => { setTagId(event.target.value); resetPaging() }}>
          <option value="">전체</option>
          {tagsQuery.data?.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
        </select>
      </label>
      <label>상품 그룹
        <select value={groupId} onChange={(event) => { setGroupId(event.target.value); resetPaging() }}>
          <option value="">전체</option>
          {groupsQuery.data?.map((group) => <option key={group.id} value={group.id}>{group.name}</option>)}
        </select>
      </label>
      <label className="employee-filter-search">상품명·SKU
        <input value={keywordInput} onChange={(event) => setKeywordInput(event.target.value)} placeholder="상품명 또는 SKU(DZ-00000012)" />
      </label>
      <button type="submit" className="inbound-action-button">검색</button>
    </form>
    {productsQuery.isLoading && <section className="panel"><p>상품 목록을 불러오는 중입니다...</p></section>}
    {productsQuery.isError && <section className="panel"><h2>상품 목록을 불러오지 못했습니다</h2><p role="alert">{toCatalogErrorMessage(productsQuery.error)}</p></section>}
    {productsQuery.data && <section className="inbound-workspace">
      <aside className="panel inbound-list-panel">
        <div className="panel-heading"><div><p className="eyebrow">PRODUCTS</p><h2>상품 목록</h2></div><small>{totalElements}개</small></div>
        <div className="inbound-list">
          {products.map((product) => <button type="button" key={product.id} className={`inbound-list-item ${selected?.id === product.id ? 'selected' : ''}`} onClick={() => setSelectedId(product.id)}>
            <span><ProductStatusBadge status={product.status} /></span>
            <strong>{product.name}</strong>
            <small>{product.sku ?? 'SKU 없음'} · {formatPrice(product.basePrice)}</small>
          </button>)}
          {products.length === 0 && <p className="inbound-empty">조건에 맞는 상품이 없습니다.</p>}
        </div>
        {totalPages > 1 && <div className="inbound-pagination">
          <button type="button" disabled={page === 1} onClick={() => { setPage(page - 1); setSelectedId(null) }}>이전</button>
          <span>{page} / {totalPages}</span>
          <button type="button" disabled={page >= totalPages} onClick={() => { setPage(page + 1); setSelectedId(null) }}>다음</button>
        </div>}
      </aside>
      {selected
        ? <ProductDetail key={selected.id} product={selected} categories={categories} tags={tagsQuery.data} groups={groupsQuery.data ?? []} optionGroups={optionGroupsQuery.data ?? []} writable={writable} confirm={setPendingConfirm} onDeleted={() => setSelectedId(null)} />
        : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">PRODUCTS</p><h2>선택한 상품이 없습니다</h2><span>목록에서 상품을 선택하세요.</span></div></section>}
    </section>}
    <ConfirmModal open={pendingConfirm !== null} title={pendingConfirm?.title ?? ''} description={pendingConfirm?.description} confirmLabel={pendingConfirm?.confirmLabel} onCancel={() => setPendingConfirm(null)} onConfirm={() => { pendingConfirm?.run(); setPendingConfirm(null) }} />
  </>
}
