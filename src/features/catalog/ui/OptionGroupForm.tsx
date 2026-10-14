import { useRef, useState, type FormEvent } from 'react'
import { toCatalogErrorMessage } from '../model/catalogErrors'
import { selectionTypeLabels, type OptionGroup, type OptionInput, type SelectionType } from '../model/catalogSchemas'
import { draftsFromOptions, hasOptionGroupErrors, optionsChanged, removedOptionKeys, toOptionInputs, validateOptionGroup, type OptionDraft, type OptionRowField } from '../model/optionGroupValidation'
import { useCreateOptionGroup, useReplaceOptions, useUpdateOptionGroup } from '../model/useOptionGroupMutations'
import { ApiError } from '../../../shared/api/ApiError'
import { ConfirmModal } from '../../../shared/ui/ConfirmModal'

type Props = {
  /** 있으면 수정, 없으면 등록이다. */
  group?: OptionGroup
  onDone: (saved: OptionGroup) => void
  onCancel: () => void
  /** 수정 중 다른 사용자가 먼저 바꿔 버전이 어긋났을 때(409 `VERSION_CONFLICT`) 부른다. 화면이 최신 내용을 다시 받고 안내한다. */
  onConflict: () => void
}

const emptyRow = (rowId: number): OptionDraft => ({ rowId, optionKey: '', name: '', price: '0', locked: false })

/**
 * 옵션 그룹 등록·수정 폼(모달 안에서 쓴다). 이름·선택 방식·필수 여부와 옵션 목록을 한 폼에서 다룬다.
 * 서버에서는 두 요청이다: 옵션 목록 교체(`PUT /options`)와 이름·선택 방식·필수 여부 변경(`PUT`). 둘 다 화면이 보던 버전이 필요하다.
 * 옵션 목록을 먼저 보낸다 — 거부될 수 있는 규칙(옵션 0개, 선택 가능한 옵션 0개)이 거기에 있어서, 거부되면 아무것도 바뀌지 않게 하려는 것이다.
 * 옵션 키는 상품의 예외가 옵션을 가리키는 식별자라 저장된 옵션의 키는 바꿀 수 없다.
 */
export function OptionGroupForm({ group, onDone, onCancel, onConflict }: Props) {
  const editing = group !== undefined
  const create = useCreateOptionGroup()
  const update = useUpdateOptionGroup()
  const replace = useReplaceOptions()
  const [name, setName] = useState(group?.name ?? '')
  const [selectionType, setSelectionType] = useState<SelectionType>(group?.selectionType ?? 'SINGLE')
  const [required, setRequired] = useState(group?.required ?? true)
  const [rows, setRows] = useState<OptionDraft[]>(group ? draftsFromOptions(group.options) : [emptyRow(0)])
  const nextRowId = useRef(group ? group.options.length : 1)
  // 오류는 제출해 본 뒤 또는 입력칸을 벗어난 뒤에만 보여준다. 입력 중에는 띄우지 않는다.
  const [submitted, setSubmitted] = useState(false)
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const [pendingSave, setPendingSave] = useState<OptionInput[] | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)
  const errors = validateOptionGroup(name, rows)
  const shows = (key: string) => submitted || touched.has(key)
  const touch = (key: string) => () => setTouched((current) => new Set(current).add(key))
  const rowError = (row: OptionDraft, field: OptionRowField) => (shows(`${row.rowId}:${field}`) ? errors.rows[row.rowId]?.[field] : undefined)
  const patchRow = (rowId: number, patch: Partial<OptionDraft>) => setRows((current) => current.map((row) => (row.rowId === rowId ? { ...row, ...patch } : row)))
  const moveRow = (index: number, offset: -1 | 1) => setRows((current) => {
    const next = [...current]
    ;[next[index], next[index + offset]] = [next[index + offset], next[index]]
    return next
  })

  async function save(options: OptionInput[]) {
    const body = { name: name.trim(), selectionType, required }
    setError(null)
    setSaving(true)
    try {
      if (!group) {
        onDone(await create.mutateAsync({ ...body, options }))
        return
      }
      let saved = group
      if (optionsChanged(group.options, options)) saved = await replace.mutateAsync({ id: group.id, version: saved.version, options })
      if (body.name !== group.name || selectionType !== group.selectionType || required !== group.required) saved = await update.mutateAsync({ id: group.id, version: saved.version, body })
      onDone(saved)
    } catch (caught) {
      if (caught instanceof ApiError && caught.code === 'VERSION_CONFLICT') onConflict()
      else setError(caught)
    } finally {
      setSaving(false)
    }
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    setSubmitted(true)
    if (hasOptionGroupErrors(errors)) {
      if (errors.name) nameRef.current?.focus()
      return
    }
    const options = toOptionInputs(rows)
    // 바뀐 게 없으면 요청 없이 닫는다.
    if (group && !optionsChanged(group.options, options) && name.trim() === group.name && selectionType === group.selectionType && required === group.required) {
      onCancel()
      return
    }
    // 옵션을 빼면 그 옵션 키의 상품별 예외가 모든 연결 상품에서 함께 지워지므로 저장 전에 확인한다.
    if (group && removedOptionKeys(group.options, options).length > 0) setPendingSave(options)
    else void save(options)
  }

  const removed = group && pendingSave ? removedOptionKeys(group.options, pendingSave) : []
  const nameError = shows('name') ? errors.name : undefined

  return (
    <form className="employee-invite employee-invite-form option-group-form" onSubmit={submit} noValidate>
      <div className="employee-invite-field">
        <label>이름
          <input ref={nameRef} value={name} disabled={saving} placeholder="사이즈" aria-invalid={nameError ? true : undefined} aria-describedby={nameError ? 'option-group-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={touch('name')} autoComplete="off" />
        </label>
        <small id="option-group-name-error" className="field-error">{nameError}</small>
      </div>
      <div className="option-group-settings">
        <label>선택 방식
          <select value={selectionType} disabled={saving} onChange={(event) => setSelectionType(event.target.value as SelectionType)}>
            {(Object.keys(selectionTypeLabels) as SelectionType[]).map((type) => <option key={type} value={type}>{selectionTypeLabels[type]}</option>)}
          </select>
        </label>
        <label className="option-group-required"><input type="checkbox" checked={required} disabled={saving} onChange={(event) => setRequired(event.target.checked)} />필수 선택</label>
      </div>
      <fieldset className="option-rows" disabled={saving}>
        <legend>옵션 (위에서부터 이 순서로 보입니다)</legend>
        {rows.length === 0 && <p className="field-error" role="alert">{errors.options}</p>}
        {rows.map((row, index) => <div key={row.rowId} className="option-row" role="group" aria-label={`옵션 ${index + 1}`}>
          <div className="option-row-field">
            <input value={row.optionKey} readOnly={row.locked} aria-label={`옵션 ${index + 1} 키`} placeholder="옵션 키 (LARGE)" title={row.locked ? '저장된 옵션의 키는 바꿀 수 없습니다.' : undefined} aria-invalid={rowError(row, 'optionKey') ? true : undefined} onChange={(event) => patchRow(row.rowId, { optionKey: event.target.value })} onBlur={touch(`${row.rowId}:optionKey`)} autoComplete="off" />
            <small className="field-error">{rowError(row, 'optionKey')}</small>
          </div>
          <div className="option-row-field">
            <input value={row.name} aria-label={`옵션 ${index + 1} 이름`} placeholder="이름 (라지)" aria-invalid={rowError(row, 'name') ? true : undefined} onChange={(event) => patchRow(row.rowId, { name: event.target.value })} onBlur={touch(`${row.rowId}:name`)} autoComplete="off" />
            <small className="field-error">{rowError(row, 'name')}</small>
          </div>
          <div className="option-row-field">
            <input value={row.price} inputMode="numeric" aria-label={`옵션 ${index + 1} 가격`} placeholder="가격 (원)" aria-invalid={rowError(row, 'price') ? true : undefined} onChange={(event) => patchRow(row.rowId, { price: event.target.value })} onBlur={touch(`${row.rowId}:price`)} autoComplete="off" />
            <small className="field-error">{rowError(row, 'price')}</small>
          </div>
          <div className="option-row-actions">
            <button type="button" className="taxonomy-action" aria-label={`옵션 ${index + 1} 위로`} disabled={index === 0} onClick={() => moveRow(index, -1)}>↑</button>
            <button type="button" className="taxonomy-action" aria-label={`옵션 ${index + 1} 아래로`} disabled={index === rows.length - 1} onClick={() => moveRow(index, 1)}>↓</button>
            <button type="button" className="taxonomy-action danger" aria-label={`옵션 ${index + 1} 삭제`} onClick={() => setRows((current) => current.filter((item) => item.rowId !== row.rowId))}>삭제</button>
          </div>
        </div>)}
        <button type="button" className="taxonomy-action option-row-add" onClick={() => setRows((current) => [...current, emptyRow(nextRowId.current++)])}>옵션 추가</button>
        <p className="employee-hint">옵션 키는 상품의 가격 변경·제외 예외가 옵션을 가리키는 식별자입니다. 저장한 뒤에는 바꿀 수 없으니 신중히 정하세요. 가격은 0 이상의 정수(원)입니다.</p>
      </fieldset>
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button employee-secondary" disabled={saving} onClick={onCancel}>취소</button>
        <button type="submit" className="inbound-action-button" disabled={saving}>{saving ? '저장 중...' : editing ? '저장' : '옵션 그룹 등록하기'}</button>
      </div>
      {error !== null && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}
      <ConfirmModal
        open={pendingSave !== null}
        title="옵션을 삭제할까요?"
        description={`삭제하는 옵션(${removed.join(', ')})에 대해 이 옵션 그룹을 연결한 모든 상품의 가격 변경·제외 예외가 함께 삭제되며, 같은 키를 다시 추가해도 되돌아오지 않습니다.`}
        confirmLabel="삭제하고 저장"
        onCancel={() => setPendingSave(null)}
        onConfirm={() => { const options = pendingSave; setPendingSave(null); if (options) void save(options) }}
      />
    </form>
  )
}
