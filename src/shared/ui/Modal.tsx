import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type ModalProps = PropsWithChildren<{
  open: boolean
  title: string
  /** 제목 오른쪽에 붙일 보조 표시(예: 단계). 제목(h2) 밖에 두어 대화상자 이름에는 포함되지 않는다. */
  titleAddon?: ReactNode
  onClose: () => void
  /** 배경을 눌러 닫을지 여부. 입력 폼에서는 실수로 입력을 잃지 않도록 기본값을 false로 둔다. */
  closeOnBackdrop?: boolean
}>

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 폼을 담는 모달. Esc와 닫기 버튼으로 닫고, 열려 있는 동안 키보드 포커스가 모달 안에 머물며,
 * 닫으면 열기 전에 포커스가 있던 요소로 돌아간다. `body`에 그려서 상위 요소의 transform 등에 영향을 받지 않는다.
 */
export function Modal({ open, title, titleAddon, onClose, closeOnBackdrop = false, children }: ModalProps) {
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)

  useEffect(() => {
    onCloseRef.current = onClose
  })

  useEffect(() => {
    if (!open) return
    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null
    const dialog = dialogRef.current
    const focusable = () => Array.from(dialog?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    // 첫 입력 요소에 포커스(닫기 버튼이 맨 앞이라 그 다음 요소를 우선한다)
    const initial = focusable().find((element) => element.dataset.modalClose === undefined) ?? focusable()[0] ?? dialog
    initial?.focus()

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        onCloseRef.current()
        return
      }
      if (event.key !== 'Tab') return
      const elements = focusable()
      if (elements.length === 0) {
        event.preventDefault()
        return
      }
      const first = elements[0]
      const last = elements[elements.length - 1]
      if (event.shiftKey && (document.activeElement === first || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && (document.activeElement === last || !dialog?.contains(document.activeElement))) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      previouslyFocused?.focus()
    }
  }, [open])

  if (!open) return null
  return createPortal(
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className="form-modal" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="form-modal-header">
          <div className="form-modal-title">
            <h2 id={titleId}>{title}</h2>
            {titleAddon}
          </div>
          <button type="button" className="form-modal-close" data-modal-close aria-label="닫기" onClick={onClose}>×</button>
        </header>
        <div className="form-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  )
}
