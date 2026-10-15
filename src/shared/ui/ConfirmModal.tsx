import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { pushModal } from './modalStack'

type ConfirmModalProps = {
  open: boolean
  title: string
  /** 제목 아래 한두 문장의 안내. 여러 줄로 나눠 보여줄 내용은 `children`에 둔다. */
  description?: string
  /** 확인할 대상이나 값처럼 구조가 있는 내용. 제목과 `description` 사이에 보여준다. */
  children?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmModal({ open, title, description, children, confirmLabel = '확인', cancelLabel = '취소', onConfirm, onCancel }: ConfirmModalProps) {
  useEffect(() => {
    if (!open) return
    // 다른 모달(폼 등) 위에 열렸을 때 Esc가 아래 모달까지 닫지 않도록 맨 위일 때만 처리한다.
    const layer = pushModal()
    const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape' && layer.isTop()) onCancel() }
    document.addEventListener('keydown', handleKeyDown)
    return () => { document.removeEventListener('keydown', handleKeyDown); layer.remove() }
  }, [open, onCancel])

  if (!open) return null
  // body에 그려서 라우트 전환 애니메이션 등 상위 요소의 transform에 영향을 받지 않게 한다(position: fixed가 화면 기준으로 동작)
  return createPortal(<div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel() }}><section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-modal-title"><h2 id="confirm-modal-title">{title}</h2>{children && <div className="confirm-modal-body">{children}</div>}{description && <p>{description}</p>}<div className="confirm-modal-actions"><button type="button" className="button secondary" onClick={onCancel}>{cancelLabel}</button><button type="button" className="button" onClick={onConfirm}>{confirmLabel}</button></div></section></div>, document.body)
}
