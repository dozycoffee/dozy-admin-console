import { useRef, useState, type FormEvent } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category } from '../../features/catalog/model/catalogSchemas'
import { Modal } from '../../shared/ui/Modal'

export type CategoryChange = { name?: string; parentId?: number | null }

type Props = {
  open: boolean
  category: Category
  /** 부모가 될 수 있는 대분류(자기 자신 제외) */
  topLevels: readonly Category[]
  /** 이 카테고리 아래의 소분류 수. 소분류가 있는 대분류는 다른 대분류의 소분류로 바꿀 수 없다. */
  childCount: number
  pending: boolean
  error: unknown
  /** 바뀐 것만 담아 부른다. `parentId`가 `null`이면 대분류로 승격한다. */
  onSubmit: (change: CategoryChange) => void
  onClose: () => void
}

/** 대분류 선택지의 "상위 없음" 값 */
const NO_PARENT = 'none'

function EditForm({ category, topLevels, childCount, pending, error, onSubmit, onClose }: Omit<Props, 'open'>) {
  const isTop = category.parentId === null
  const [name, setName] = useState(category.name)
  const [target, setTarget] = useState(isTop ? NO_PARENT : String(category.parentId))
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const nameError = touched && name.trim() === '' ? '이름을 입력하세요.' : undefined
  // 소분류가 있는 대분류는 부모를 정할 수 없다(소분류의 소분류는 없다).
  const parentLocked = isTop && childCount > 0
  const parentId = target === NO_PARENT ? null : Number(target)

  function submit(event: FormEvent) {
    event.preventDefault()
    if (name.trim() === '') {
      setTouched(true)
      inputRef.current?.focus()
      return
    }
    const change: CategoryChange = {
      ...(name.trim() !== category.name && { name: name.trim() }),
      ...(parentId !== category.parentId && { parentId }),
    }
    if (Object.keys(change).length === 0) onClose()
    else onSubmit(change)
  }

  return <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
    <div className="employee-invite-field">
      <label>이름
        <input ref={inputRef} value={name} disabled={pending} placeholder="카테고리 이름" aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? 'category-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched(true)} autoComplete="off" />
      </label>
      <small id="category-name-error" className="field-error">{nameError}</small>
    </div>
    <div className="employee-invite-field">
      <label>상위 대분류
        <select value={target} disabled={pending || parentLocked} onChange={(event) => setTarget(event.target.value)}>
          <option value={NO_PARENT}>{isTop ? '없음 (대분류)' : '대분류로 승격 (상위 없음)'}</option>
          {topLevels.map((top) => <option key={top.id} value={top.id}>{top.name}</option>)}
        </select>
      </label>
      <small className="field-error" aria-hidden="true" />
    </div>
    <p className="employee-hint">
      {parentLocked && '소분류가 있는 대분류는 다른 대분류의 소분류로 바꿀 수 없습니다.'}
      {!parentLocked && isTop && parentId === null && '다른 대분류를 고르면 이 대분류가 그 대분류의 소분류가 됩니다. (소분류가 없는 대분류만 가능)'}
      {!parentLocked && isTop && parentId !== null && '이 대분류가 선택한 대분류의 소분류가 됩니다.'}
      {!isTop && parentId === null && '이 카테고리가 대분류가 됩니다. 이 카테고리를 쓰는 상품이 있으면 승격할 수 없습니다.'}
      {!isTop && parentId !== null && '다른 대분류로 옮겨도 이 카테고리를 쓰는 상품에는 영향이 없습니다.'}
    </p>
    <div className="inbound-form-actions">
      <button type="button" className="inbound-action-button employee-secondary" disabled={pending} onClick={onClose}>취소</button>
      <button type="submit" className="inbound-action-button" disabled={pending}>{pending ? '저장 중...' : '저장'}</button>
    </div>
    {error !== null && error !== undefined && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}
  </form>
}

/** 카테고리를 바꾼다: 이름과 상위 대분류(소분류 이동, 대분류 강등, 소분류 승격)를 한 폼에서 다룬다. */
export function EditCategoryModal({ open, category, onClose, ...form }: Props) {
  return <Modal open={open} title={`카테고리 변경 · ${category.name}`} onClose={onClose}>
    <EditForm category={category} {...form} onClose={onClose} />
  </Modal>
}
