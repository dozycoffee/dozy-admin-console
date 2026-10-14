import { useState, type FormEvent } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { Category } from '../../features/catalog/model/catalogSchemas'
import { Modal } from '../../shared/ui/Modal'

type Props = {
  open: boolean
  category: Category
  /** 부모가 될 수 있는 대분류(자기 자신 제외) */
  topLevels: readonly Category[]
  pending: boolean
  error: unknown
  /** `null`이면 대분류로 승격한다. */
  onSubmit: (parentId: number | null) => void
  onClose: () => void
}

const PROMOTE = 'promote'

function MoveForm({ category, topLevels, pending, error, onSubmit, onClose }: Omit<Props, 'open'>) {
  const isTop = category.parentId === null
  // 소분류는 지금의 부모에서 시작하고, 대분류는 아직 고르지 않은 상태에서 시작한다.
  const [target, setTarget] = useState(isTop ? '' : String(category.parentId))
  const [touched, setTouched] = useState(false)
  const missing = target === ''
  const noParent = isTop && topLevels.length === 0

  function submit(event: FormEvent) {
    event.preventDefault()
    if (missing) {
      setTouched(true)
      return
    }
    const parentId = target === PROMOTE ? null : Number(target)
    if (parentId === category.parentId) onClose()
    else onSubmit(parentId)
  }

  return <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
    <div className="employee-invite-field">
      <label>{isTop ? '소분류로 들어갈 대분류' : '상위 대분류'}
        <select value={target} disabled={pending || noParent} aria-invalid={touched && missing ? true : undefined} onChange={(event) => setTarget(event.target.value)}>
          {isTop && <option value="">선택하세요</option>}
          {topLevels.map((top) => <option key={top.id} value={top.id}>{top.name}</option>)}
          {!isTop && <option value={PROMOTE}>대분류로 승격 (상위 없음)</option>}
        </select>
      </label>
      <small className="field-error">{touched && missing ? '대분류를 선택하세요.' : undefined}</small>
    </div>
    {noParent && <p className="inbound-error" role="alert">옮길 수 있는 다른 대분류가 없습니다.</p>}
    <p className="employee-hint">
      {isTop && '이 대분류가 선택한 대분류의 소분류가 됩니다. 소분류가 없는 대분류만 바꿀 수 있습니다.'}
      {!isTop && target === PROMOTE && '이 카테고리가 대분류가 됩니다. 이 카테고리를 쓰는 상품이 있으면 승격할 수 없습니다.'}
      {!isTop && target !== PROMOTE && '다른 대분류로 옮겨도 이 카테고리를 쓰는 상품에는 영향이 없습니다.'}
    </p>
    <div className="inbound-form-actions">
      <button type="button" className="inbound-action-button employee-secondary" disabled={pending} onClick={onClose}>취소</button>
      <button type="submit" className="inbound-action-button" disabled={pending || noParent}>{pending ? '저장 중...' : '변경'}</button>
    </div>
    {error !== null && error !== undefined && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}
  </form>
}

/** 카테고리의 부모를 바꾼다: 소분류 이동, 대분류 강등(소분류로), 소분류 승격(대분류로). */
export function MoveCategoryModal({ open, category, onClose, ...form }: Props) {
  return <Modal open={open} title={`${category.parentId === null ? '소분류로 변경' : '부모 변경'} · ${category.name}`} onClose={onClose}>
    <MoveForm category={category} {...form} onClose={onClose} />
  </Modal>
}
