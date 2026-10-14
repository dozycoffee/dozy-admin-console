import { useRef, useState, type FormEvent } from 'react'
import { toCatalogErrorMessage } from '../../features/catalog/model/catalogErrors'
import { Modal } from '../../shared/ui/Modal'

type Props = {
  open: boolean
  title: string
  label: string
  placeholder: string
  /** 있으면 이름 변경이다. 같은 이름으로 저장하면 요청 없이 닫는다. */
  initialName?: string
  submitLabel: string
  pending: boolean
  /** 서버 오류(없으면 null). 모달 안에 code별 안내로 보여준다. */
  error: unknown
  hint?: string
  onSubmit: (name: string) => void
  onClose: () => void
}

function NameForm({ label, placeholder, initialName = '', submitLabel, pending, error, hint, onSubmit, onClose }: Omit<Props, 'open' | 'title'>) {
  const [name, setName] = useState(initialName)
  const [touched, setTouched] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const invalid = name.trim() === ''
  const shown = touched && invalid ? '이름을 입력하세요.' : undefined

  function submit(event: FormEvent) {
    event.preventDefault()
    if (invalid) {
      setTouched(true)
      inputRef.current?.focus()
      return
    }
    if (name.trim() === initialName) onClose()
    else onSubmit(name.trim())
  }

  return <form className="employee-invite employee-invite-form" onSubmit={submit} noValidate>
    <div className="employee-invite-field">
      <label>{label}
        <input ref={inputRef} value={name} disabled={pending} placeholder={placeholder} aria-invalid={shown ? true : undefined} aria-describedby={shown ? 'taxonomy-name-error' : undefined} onChange={(event) => setName(event.target.value)} onBlur={() => setTouched(true)} autoComplete="off" />
      </label>
      <small id="taxonomy-name-error" className="field-error">{shown}</small>
    </div>
    {hint && <p className="employee-hint">{hint}</p>}
    <div className="inbound-form-actions">
      <button type="button" className="inbound-action-button employee-secondary" disabled={pending} onClick={onClose}>취소</button>
      <button type="submit" className="inbound-action-button" disabled={pending}>{pending ? '저장 중...' : submitLabel}</button>
    </div>
    {error !== null && error !== undefined && <p className="inbound-error" role="alert">{toCatalogErrorMessage(error)}</p>}
  </form>
}

/** 이름 하나를 입력받는 모달. 카테고리·상품 그룹 등록과 이름 변경에 함께 쓴다. */
export function NameFormModal({ open, title, onClose, ...form }: Props) {
  return <Modal open={open} title={title} onClose={onClose}>
    <NameForm {...form} onClose={onClose} />
  </Modal>
}
