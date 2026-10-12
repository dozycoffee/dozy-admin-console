import { useEffect, useState } from 'react'

export const REASON_MAX_LENGTH = 500

type Props = {
  open: boolean
  title: string
  description?: string
  confirmLabel: string
  onConfirm: (reason: string) => void
  onCancel: () => void
}

/** 감사 로그에 남길 사유를 입력받는 확인 모달. 사유는 공백만으로는 안 되고 500자 이하여야 한다. */
export function ReasonModal({ open, title, description, confirmLabel, onConfirm, onCancel }: Props) {
  const [reason, setReason] = useState('')
  const trimmed = reason.trim()
  const valid = trimmed !== '' && trimmed.length <= REASON_MAX_LENGTH

  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}>
      <section className="confirm-modal reason-modal" role="dialog" aria-modal="true" aria-labelledby="reason-modal-title">
        <h2 id="reason-modal-title">{title}</h2>
        {description && <p>{description}</p>}
        <label>사유
          <textarea value={reason} rows={3} maxLength={REASON_MAX_LENGTH} onChange={(event) => setReason(event.target.value)} placeholder="감사 로그에 기록됩니다" />
        </label>
        <small>{reason.length} / {REASON_MAX_LENGTH}</small>
        <div className="confirm-modal-actions">
          <button type="button" className="button secondary" onClick={onCancel}>취소</button>
          <button type="button" className="button" disabled={!valid} onClick={() => { onConfirm(trimmed); setReason('') }}>{confirmLabel}</button>
        </div>
      </section>
    </div>
  )
}
