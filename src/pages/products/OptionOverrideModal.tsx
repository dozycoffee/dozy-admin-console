import { useState, type FormEvent } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import type { OptionOverrideInput } from '../../features/catalog/model/catalogSchemas'
import { formatPrice } from '../../features/catalog/model/formatPrice'
import { Modal } from '../../shared/ui/Modal'

/** 사용자가 고른 처리. `default`는 예외를 해제해 옵션 그룹의 기본 구성과 가격을 따르게 한다. */
export type OverrideChoice = { kind: 'default' } | { kind: 'set'; override: OptionOverrideInput }

type Props = {
  open: boolean
  groupName: string
  option: { optionKey: string; name: string; price: number }
  /** 지금 지정된 예외(없으면 기본값을 따르는 중) */
  current: { type: 'PRICE'; price: number | null } | { type: 'EXCLUDE'; price: number | null } | undefined
  pending: boolean
  error: unknown
  onSubmit: (choice: OverrideChoice) => void
  onClose: () => void
}

type Mode = 'default' | 'price' | 'exclude'
const wholeNumber = /^\d+$/

function OverrideForm({ option, current, pending, error, onSubmit, onClose }: Omit<Props, 'open' | 'groupName'>) {
  const [mode, setMode] = useState<Mode>(current?.type === 'PRICE' ? 'price' : current?.type === 'EXCLUDE' ? 'exclude' : 'default')
  const [price, setPrice] = useState(current?.type === 'PRICE' && current.price !== null ? String(current.price) : String(option.price))
  const [touched, setTouched] = useState(false)
  const priceError = mode === 'price' && !wholeNumber.test(price.trim()) ? (price.trim() === '' ? '가격을 입력하세요.' : '0 이상의 정수로 입력하세요.') : undefined

  function submit(event: FormEvent) {
    event.preventDefault()
    if (priceError) {
      setTouched(true)
      return
    }
    if (mode === 'default') {
      if (current) onSubmit({ kind: 'default' })
      else onClose()
    } else if (mode === 'exclude') {
      if (current?.type === 'EXCLUDE') onClose()
      else onSubmit({ kind: 'set', override: { type: 'EXCLUDE' } })
    } else {
      const next = Number(price.trim())
      if (current?.type === 'PRICE' && current.price === next) onClose()
      else onSubmit({ kind: 'set', override: { type: 'PRICE', price: next } })
    }
  }

  return <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
    <fieldset className="employee-role-picker" disabled={pending}>
      <legend>이 상품에서의 {option.name}</legend>
      <label><input type="radio" name="override-mode" checked={mode === 'default'} onChange={() => setMode('default')} />옵션 그룹의 기본값 사용 <small>기본 가격 {formatPrice(option.price)}</small></label>
      <label><input type="radio" name="override-mode" checked={mode === 'price'} onChange={() => setMode('price')} />이 상품에서만 가격 변경</label>
      <label><input type="radio" name="override-mode" checked={mode === 'exclude'} onChange={() => setMode('exclude')} />이 상품에서는 선택할 수 없게 제외</label>
    </fieldset>
    {mode === 'price' && <div className="employee-invite-field">
      <label>이 상품에서의 가격 (원)
        <input value={price} inputMode="numeric" disabled={pending} aria-invalid={touched && priceError ? true : undefined} onChange={(event) => setPrice(event.target.value)} onBlur={() => setTouched(true)} autoComplete="off" />
      </label>
      <small className="field-error">{touched ? priceError : undefined}</small>
    </div>}
    <p className="employee-hint">
      {mode === 'default' && '예외를 해제하면 이 옵션은 옵션 그룹에 정의된 이름과 가격을 그대로 따릅니다.'}
      {mode === 'price' && '0 이상의 정수입니다. 옵션 그룹의 가격은 바뀌지 않고 이 상품에만 적용됩니다.'}
      {mode === 'exclude' && '이 상품에서 이 옵션을 고를 수 없게 합니다. 선택할 수 있는 옵션이 하나도 남지 않게 되면 저장할 수 없습니다.'}
    </p>
    <div className="inbound-form-actions">
      <button type="button" className="inbound-action-button employee-secondary" disabled={pending} onClick={onClose}>취소</button>
      <button type="submit" className="inbound-action-button" disabled={pending}>{pending ? '저장 중...' : '저장'}</button>
    </div>
    {error !== null && error !== undefined && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}
  </form>
}

/** 상품의 옵션 하나에 대한 예외(가격 변경·제외)를 정하거나 해제한다. */
export function OptionOverrideModal({ open, groupName, onClose, ...form }: Props) {
  return <Modal open={open} title={`옵션 예외 · ${groupName} / ${form.option.name}`} onClose={onClose}>
    <OverrideForm {...form} onClose={onClose} />
  </Modal>
}
