import { useEffect } from 'react'
import { createPortal } from 'react-dom'

type ConfirmModalProps = {
  open: boolean
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, description, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, onCancel])

  if (!open) return null
  // body에 그려서 라우트 전환 애니메이션 등 상위 요소의 transform에 영향을 받지 않게 한다(position: fixed가 화면 기준으로 동작)
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title"><h2 id="confirm-modal-title">{title}</h2>{description && <p>{description}</p>}<div className="confirm-modal-actions"><button type="button" className="button secondary" onClick={onCancel}>{cancelLabel}</button><button type="button" className="button" onClick={onConfirm}>{confirmLabel}</button></div></section></div>, document.body)
}
