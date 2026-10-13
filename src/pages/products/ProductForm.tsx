import { useRef, useState, type FormEvent, type RefObject } from 'react'
import { groupCategories } from '../../features/catalog/model/categoryLabel'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category, OptionGroup, Product, ProductGroup } from '../../features/catalog/model/catalogSchemas'
import { emptyToNull, parseTagNames, validateProduct, type ProductField } from '../../features/catalog/model/productValidation'
import { useCreateProduct, useUpdateProduct } from '../../features/catalog/model/useProductMutations'
import { ApiError } from '../../shared/api/ApiError'

type Props = {
  /** 있으면 수정, 없으면 등록이다. */
  product?: Product
  /** 수정할 때 입력칸에 채울 태그 이름(상품은 태그를 id로만 갖는다). */
  initialTagNames?: string[]
  categories: readonly Category[]
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
export function ProductForm({ product, initialTagNames = [], categories, groups, optionGroups, onDone, onCancel, onConflict }: Props) {
  const editing = product !== undefined
  const create = useCreateProduct()
  const update = useUpdateProduct()
  const mutation = editing ? update : create
  const [name, setName] = useState(product?.name ?? '')
  const [categoryId, setCategoryId] = useState(product ? String(product.categoryId) : '')
  const [basePrice, setBasePrice] = useState(product ? String(product.basePrice) : '')
  const [tracksInventory, setTracksInventory] = useState(product?.tracksInventory ?? false)
  const [description, setDescription] = useState(product?.description ?? '')
  const [imageUrl, setImageUrl] = useState(product?.imageUrl ?? '')
  const [tags, setTags] = useState(initialTagNames.join(', '))
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
      tagNames: parseTagNames(tags),
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
        <div className="employee-invite-field">
          <label>태그 (선택)<input value={tags} disabled={locked} placeholder="신메뉴, 베스트" onChange={(event) => setTags(event.target.value)} autoComplete="off" /></label>
          <small className="employee-hint">쉼표로 구분합니다. 없는 태그는 새로 만들어집니다.</small>
        </div>
      </div>
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
      </fieldset>}
      {!editing && <p className="employee-hint">등록한 상품은 "판매 대기" 상태로 만들어지며, 활성화해야 판매됩니다.</p>}
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={locked} onClick={onCancel}>취소</button>
        <button type="submit" className="inbound-action-button" disabled={locked}>{locked ? '저장 중...' : editing ? '저장' : '상품 등록하기'}</button>
      </div>
      {mutation.isError && !conflict && <p className="inbound-error" role="alert">{toCatalogErrorMessage(mutation.error)}</p>}
    </form>
  )
}
