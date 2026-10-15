import { useRef, useState, type FormEvent } from 'react'
import { materialCategories, materialCategoryLabels, MATERIAL_CODE_MAX_LENGTH, MATERIAL_NAME_MAX_LENGTH, MATERIAL_UNIT_MAX_LENGTH, type Material } from '../../features/material/model/materialSchemas'
import { toMaterialErrorMessage } from '../../features/material/model/materialErrors'
import { toRegisterRequest, validateMaterial, type MaterialField } from '../../features/material/model/materialValidation'
import { useRegisterMaterial } from '../../features/material/model/useMaterials'

type Props = {
  onDone: (created: Material) => void
  onCancel: () => void
}

/** 원자재 등록 폼(모달 안에서 쓴다). 코드는 등록한 뒤에는 바꿀 수 없고 서버가 대문자로 통일해 저장한다. */
export function MaterialForm({ onDone, onCancel }: Props) {
  const register = useRegisterMaterial()
  const [productCode, setProductCode] = useState('')
  const [productName, setProductName] = useState('')
  const [category, setCategory] = useState('')
  const [unit, setUnit] = useState('')
  const [shelfLifeDays, setShelfLifeDays] = useState('')
  // 오류는 필드를 벗어났거나(blur) 제출해 본 뒤에만 보여준다. 입력 중에는 띄우지 않는다.
  const [touched, setTouched] = useState<Partial<Record<MaterialField, boolean>>>({})
  const productCodeRef = useRef<HTMLInputElement>(null)
  const productNameRef = useRef<HTMLInputElement>(null)
  const categoryRef = useRef<HTMLSelectElement>(null)
  const unitRef = useRef<HTMLInputElement>(null)
  const shelfLifeDaysRef = useRef<HTMLInputElement>(null)
  const input = { productCode, productName, category, unit, shelfLifeDays }
  const errors = validateMaterial(input)
  const shownError = (field: MaterialField) => (touched[field] ? errors[field] : undefined)
  const touch = (field: MaterialField) => () => setTouched((current) => ({ ...current, [field]: true }))
  const locked = register.isPending

  function submit(event: FormEvent) {
    event.preventDefault()
    const firstInvalid = (['productCode', 'productName', 'category', 'unit', 'shelfLifeDays'] as const).find((field) => errors[field])
    if (firstInvalid) {
      setTouched({ productCode: true, productName: true, category: true, unit: true, shelfLifeDays: true })
      const refs = { productCode: productCodeRef, productName: productNameRef, category: categoryRef, unit: unitRef, shelfLifeDays: shelfLifeDaysRef }
      refs[firstInvalid].current?.focus()
      return
    }
    register.mutate(toRegisterRequest(input), { onSuccess: onDone })
  }

  const describedBy = (field: MaterialField) => (shownError(field) ? `material-${field}-error` : undefined)

  return (
    <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
      <div className="employee-invite-grid">
        <div className="employee-invite-field">
          <label>원자재 코드
            <input ref={productCodeRef} value={productCode} disabled={locked} maxLength={MATERIAL_CODE_MAX_LENGTH} placeholder="BEAN-001" aria-invalid={shownError('productCode') ? true : undefined} aria-describedby={describedBy('productCode')} onChange={(event) => setProductCode(event.target.value)} onBlur={touch('productCode')} autoComplete="off" />
          </label>
          <small id="material-productCode-error" className="field-error">{shownError('productCode')}</small>
        </div>
        <div className="employee-invite-field">
          <label>이름
            <input ref={productNameRef} value={productName} disabled={locked} maxLength={MATERIAL_NAME_MAX_LENGTH} placeholder="에티오피아 예가체프" aria-invalid={shownError('productName') ? true : undefined} aria-describedby={describedBy('productName')} onChange={(event) => setProductName(event.target.value)} onBlur={touch('productName')} autoComplete="off" />
          </label>
          <small id="material-productName-error" className="field-error">{shownError('productName')}</small>
        </div>
        <div className="employee-invite-field">
          <label>카테고리
            <select ref={categoryRef} value={category} disabled={locked} aria-invalid={shownError('category') ? true : undefined} aria-describedby={describedBy('category')} onChange={(event) => setCategory(event.target.value)} onBlur={touch('category')}>
              <option value="">선택</option>
              {materialCategories.map((value) => <option key={value} value={value}>{materialCategoryLabels[value]}</option>)}
            </select>
          </label>
          <small id="material-category-error" className="field-error">{shownError('category')}</small>
        </div>
        <div className="employee-invite-field">
          <label>단위
            <input ref={unitRef} value={unit} disabled={locked} maxLength={MATERIAL_UNIT_MAX_LENGTH} placeholder="KG" aria-invalid={shownError('unit') ? true : undefined} aria-describedby={describedBy('unit')} onChange={(event) => setUnit(event.target.value)} onBlur={touch('unit')} autoComplete="off" />
          </label>
          <small id="material-unit-error" className="field-error">{shownError('unit')}</small>
        </div>
        <div className="employee-invite-field">
          <label>유통기한 일수 (선택)
            <input ref={shelfLifeDaysRef} value={shelfLifeDays} disabled={locked} inputMode="numeric" placeholder="비우면 유통기한 없음" aria-invalid={shownError('shelfLifeDays') ? true : undefined} aria-describedby={describedBy('shelfLifeDays')} onChange={(event) => setShelfLifeDays(event.target.value)} onBlur={touch('shelfLifeDays')} autoComplete="off" />
          </label>
          <small id="material-shelfLifeDays-error" className="field-error">{shownError('shelfLifeDays')}</small>
        </div>
      </div>
      <p className="employee-hint">원자재 코드는 등록한 뒤에는 바꿀 수 없고, 입력한 코드는 대문자로 저장됩니다.</p>
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={locked} onClick={onCancel}>취소</button>
        <button type="submit" className="inbound-action-button" disabled={locked}>{locked ? '등록 중...' : '원자재 등록'}</button>
      </div>
      {register.isError && <p className="inbound-error" role="alert">{toMaterialErrorMessage(register.error)}</p>}
    </form>
  )
}
