import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { groupCategories } from '../../features/catalog/model/categoryLabel'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category, OptionGroup, Product, ProductGroup, Tag } from '../../features/catalog/model/catalogSchemas'
import { emptyToNull, validateProduct, type ProductField } from '../../features/catalog/model/productValidation'
import { useCreateProduct, useUpdateProduct } from '../../features/catalog/model/useProductMutations'
import { ApiError } from '../../shared/api/ApiError'
import { Modal } from '../../shared/ui/Modal'
import { useToast } from '../../shared/ui/toastContext'
import { OptionGroupForm } from '../../features/catalog/ui/OptionGroupForm'
import { TagPicker } from './TagPicker'

type Props = {
  /** 있으면 수정, 없으면 등록이다. */
  product?: Product
  /** 수정할 때 입력칸에 채울 태그 이름(상품은 태그를 id로만 갖는다). */
  initialTagNames?: string[]
  categories: readonly Category[]
  /** 이미 있는 태그. 목록에서 골라 재사용한다. */
  tags: readonly Tag[]
  groups: readonly ProductGroup[]
  optionGroups: readonly OptionGroup[]
  onDone: (saved: Product) => void
  onCancel: () => void
  /** 수정 중 다른 사용자가 먼저 바꿔 버전이 어긋났을 때(409 `VERSION_CONFLICT`) 부른다. 화면이 최신 내용을 다시 받고 안내한다. */
  onConflict: () => void
}

/**
 * 상품 등록·수정 폼(모달 안에서 쓴다). 수정은 입력한 값 전체로 상품을 교체하며 화면에서 보던 버전을 함께 보낸다.
 * 재고 관리 여부와 옵션 그룹 연결은 등록할 때만 정하고 수정 요청으로는 바꿀 수 없다.
 */
export function ProductForm({ product, initialTagNames = [], categories, tags: existingTags, groups, optionGroups, onDone, onCancel, onConflict }: Props) {
  const editing = product !== undefined
  const { notify } = useToast()
  const [creatingGroup, setCreatingGroup] = useState(false)
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const mutation = editing ? update : create
  const [name, setName] = useState(product?.name ?? '')
  const [categoryId, setCategoryId] = useState(product ? String(product.categoryId) : '')
  const [basePrice, setBasePrice] = useState(product ? String(product.basePrice) : '')
  const [tracksInventory, setTracksInventory] = useState(product?.tracksInventory ?? false)
  const [description, setDescription] = useState(product?.description ?? '')
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [tagNames, setTagNames] = useState<string[]>(initialTagNames)
  const [groupIds, setGroupIds] = useState<number[]>(product?.groupIds ?? [])
  const [optionGroupIds, setOptionGroupIds] = useState<number[]>([])
  // 오류는 필드를 벗어났거나(blur) 제출해 본 뒤에만 보여준다. 입력 중에는 띄우지 않는다.
  const [touched, setTouched] = useState<Partial<Record<ProductField, boolean>>>({})
  const nameRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const priceRef = useRef<HTMLInputElement>(null)
  const errors = validateProduct({ name, categoryId, basePrice })
  const shownError = (field: ProductField) => (touched[field] ? errors[field] : undefined)
  const touch = (field: ProductField) => () => setTouched((current) => ({ ...current, [field]: true }))
  const locked = mutation.isPending
  // 소분류만 고를 수 있다(대분류를 지정하면 서버가 거부한다).
  const categoryGroups = groupCategories(categories).filter(({ children }) => children.length > 0)
  // 지정할 수 있는 소분류가 하나도 없으면 상품을 등록할 수 없다(요구사항 1.6).
  const noCategory = categoryGroups.length === 0

  const toggle = (setter: (update: (current: number[]) => number[]) => void, id: number) =>
    setter((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]))

  function submit(event: FormEvent) {
    event.preventDefault()
    const firstInvalid: Array<[ProductField, RefObject<HTMLElement | null>]> = [['name', nameRef], ['categoryId', categoryRef], ['basePrice', priceRef]]
    const invalid = firstInvalid.find(([field]) => errors[field])
    if (invalid) {
      setTouched({ name: true, categoryId: true, basePrice: true })
      invalid[1].current?.focus()
      return
    }
    const input = {
      name: name.trim(),
      categoryId: Number(categoryId),
      basePrice: Number(basePrice.trim()),
      description: emptyToNull(description),
      imageUrl: emptyToNull(imageUrl),
      tagNames,
      groupIds,
    }
    const handlers = {
      onSuccess: onDone,
      onError: (error: unknown) => { if (error instanceof ApiError && error.code === 'VERSION_CONFLICT') onConflict() },
    }
    if (product) update.mutate({ productId: product.id, version: product.version, body: input }, handlers)
    else create.mutate({ ...input, tracksInventory, optionGroupIds }, handlers)
  }

  const conflict = mutation.error instanceof ApiError && mutation.error.code === 'VERSION_CONFLICT'

  return (
    <>
    <form className="employee-invite employee-invite-form product-form" onSubmit={submit} noValidate>
      <div className="employee-invite-grid">
        <div className="employee-invite-field">
          <label>상품명
            <input ref={nameRef} value={name} disabled={locked} placeholder="아이스 아메리카노" aria-invalid={shownError('name') ? true : undefined} aria-describedby={shownError('name') ? 'product-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={touch('name')} autoComplete="off" />
          </label>
          <small id="product-name-error" className="field-error">{shownError('name')}</small>
        </div>
        <div className="employee-invite-field">
          <label>카테고리
            <select ref={categoryRef} value={categoryId} disabled={locked} aria-invalid={shownError('categoryId') ? true : undefined} aria-describedby={shownError('categoryId') ? 'product-category-error' : undefined} onChange={(event) => setCategoryId(event.target.value)} onBlur={touch('categoryId')}>
              <option value="">선택하세요</option>
              {categoryGroups.map(({ top, children }) => <optgroup key={top.id} label={top.name}>
                {children.map((child) => <option key={child.id} value={child.id}>{child.name}</option>)}
              </optgroup>)}
            </select>
          </label>
          <small id="product-category-error" className="field-error">{shownError('categoryId')}</small>
        </div>
        <div className="employee-invite-field">
          <label>기준가 (원)
            <input ref={priceRef} value={basePrice} inputMode="numeric" disabled={locked} placeholder="4500" aria-invalid={shownError('basePrice') ? true : undefined} aria-describedby={shownError('basePrice') ? 'product-price-error' : undefined} onChange={(event) => setBasePrice(event.target.value)} onBlur={touch('basePrice')} autoComplete="off" />
          </label>
          <small id="product-price-error" className="field-error">{shownError('basePrice')}</small>
        </div>
        {!editing && <fieldset className="employee-role-picker" disabled={locked}>
          <legend>재고 관리</legend>
          <label><input type="radio" name="tracksInventory" checked={!tracksInventory} onChange={() => setTracksInventory(false)} />비재고형 <small>음료·푸드처럼 재고를 세지 않는 상품</small></label>
          <label><input type="radio" name="tracksInventory" checked={tracksInventory} onChange={() => setTracksInventory(true)} />재고형 <small>MD 상품처럼 재고 수량으로 품절을 판단하는 상품</small></label>
          <p className="employee-hint">재고 관리 여부는 등록한 뒤에는 바꿀 수 없습니다.</p>
        </fieldset>}
        <div className="employee-invite-field">
          <label>설명 (선택)<input value={description} disabled={locked} placeholder="산미가 적은 원두" onChange={(event) => setDescription(event.target.value)} autoComplete="off" /></label>
          <small className="field-error" aria-hidden="true" />
        </div>
        <div className="employee-invite-field">
          <label>이미지 URL (선택)<input value={imageUrl} disabled={locked} placeholder="https://cdn.example.com/p/12.png" onChange={(event) => setImageUrl(event.target.value)} autoComplete="off" /></label>
          <small className="field-error" aria-hidden="true" />
        </div>
      </div>
      <TagPicker tags={existingTags} selected={tagNames} onChange={setTagNames} disabled={locked} />
      <fieldset className="employee-role-picker" disabled={locked}>
        <legend>상품 그룹 (선택)</legend>
        {groups.length === 0 && <p>등록된 상품 그룹이 없습니다.</p>}
        {groups.map((group) => <label key={group.id}><input type="checkbox" checked={groupIds.includes(group.id)} onChange={() => toggle(setGroupIds, group.id)} />{group.name}</label>)}
      </fieldset>
      {!editing && <fieldset className="employee-role-picker" disabled={locked}>
        <legend>옵션 그룹 (선택)</legend>
        {optionGroups.length === 0 && <p>등록된 옵션 그룹이 없습니다.</p>}
        {optionGroups.map((group) => <label key={group.id}><input type="checkbox" checked={optionGroupIds.includes(group.id)} onChange={() => toggle(setOptionGroupIds, group.id)} />{group.name}{optionGroupIds.includes(group.id) && <small>{optionGroupIds.indexOf(group.id) + 1}번째</small>}</label>)}
        <p className="employee-hint">선택한 순서가 노출 순서입니다.</p>
        <button type="button" className="taxonomy-action" onClick={() => setCreatingGroup(true)}>새 옵션 그룹 만들기</button>
      </fieldset>}
      {noCategory && <p className="inbound-error" role="alert">지정할 수 있는 소분류가 없어 상품을 저장할 수 없습니다. 먼저 카테고리(대분류와 소분류)를 등록하세요.</p>}
      {!editing && <p className="employee-hint">등록한 상품은 "판매 대기" 상태로 만들어지며, 활성화해야 판매됩니다.</p>}
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={locked} onClick={onCancel}>취소</button>
        <button type="submit" className="inbound-action-button" disabled={locked || noCategory}>{locked ? '저장 중...' : editing ? '저장' : '상품 등록하기'}</button>
      </div>
      {mutation.isError && !conflict && <p className="inbound-error" role="alert">{toCatalogErrorMessage(mutation.error)}</p>}
    </form>
    {/* 폼 밖에 둔다: 모달의 제출 이벤트가 React 트리를 따라 상품 폼으로 올라가 상품이 같이 등록되는 일을 막는다 */}
    {!editing && <Modal open={creatingGroup} title="새 옵션 그룹" className="option-form-modal" onClose={() => setCreatingGroup(false)}>
      <OptionGroupForm
        onCancel={() => setCreatingGroup(false)}
        // 만든 옵션 그룹은 이 상품에 연결할 옵션 그룹으로 바로 고른다(목록은 곧 다시 받아져 체크된 채로 나타난다).
        onDone={(created) => { setCreatingGroup(false); setOptionGroupIds((current) => (current.includes(created.id) ? current : [...current, created.id])); notify(`옵션 그룹 "${created.name}"을 만들고 이 상품에 연결할 그룹으로 선택했습니다.`) }}
        onConflict={() => setCreatingGroup(false)}
      />
    </Modal>}
    </>
  )
}
