import { useEffect, useId, useRef, type PropsWithChildren, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { usePresence } from './usePresence'

type ModalProps = PropsWithChildren<{
  open: boolean
  title: string
  /** 제목 오른쪽에 붙일 보조 표시(예: 단계). 제목(h2) 밖에 두어 대화상자 이름에는 포함되지 않는다. */
  titleAddon?: ReactNode
  onClose: () => void
  /** 배경을 눌러 닫을지 여부. 입력 폼에서는 실수로 입력을 잃지 않도록 기본값을 false로 둔다. */
  closeOnBackdrop?: boolean
  /** false이면 닫기 버튼을 숨기고 Esc로도 닫히지 않는다. 확인을 거쳐야만 닫아야 하는 모달(예: 한 번만 보이는 secret)에서 쓴다. */
  dismissible?: boolean
  /** 대화상자(`.form-modal`)에 덧붙일 클래스. 폭 같은 모양을 바꿀 때 쓴다. */
  className?: string
}>

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * 폼을 담는 모달. Esc와 닫기 버튼으로 닫고, 열려 있는 동안 키보드 포커스가 모달 안에 머물며,
 * 닫으면 열기 전에 포커스가 있던 요소로 돌아간다. `body`에 그려서 상위 요소의 transform 등에 영향을 받지 않는다.
 * 열고 닫을 때 가벼운 나타남·사라짐 애니메이션이 있고(동작 줄이기 설정에서는 없음), 사라지는 동안에도 children을 그대로 보여준다.
 */
export function Modal({ open, title, titleAddon, onClose, closeOnBackdrop = false, dismissible = true, className, children }: ModalProps) {
  const { visible, closing } = usePresence(open)
  const titleId = useId()
  const dialogRef = useRef<HTMLElement>(null)
  const onCloseRef = useRef(onClose)
  const dismissibleRef = useRef(dismissible)

  useEffect(() => {
    onCloseRef.current = onClose
    dismissibleRef.current = dismissible
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
        if (dismissibleRef.current) onCloseRef.current()
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

  if (!visible) return null
  return createPortal(
    <div className={closing ? 'modal-backdrop closing' : 'modal-backdrop'} role="presentation" onMouseDown={(event) => { if (closeOnBackdrop && event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} className={className ? `form-modal ${className}` : 'form-modal'} role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
        <header className="form-modal-header">
          <div className="form-modal-title">
            <h2 id={titleId}>{title}</h2>
            {titleAddon}
          </div>
          {dismissible && <button type="button" className="form-modal-close" data-modal-close aria-label="닫기" onClick={onClose}>×</button>}
        </header>
        <div className="form-modal-body">{children}</div>
      </section>
    </div>,
    document.body,
  )
}
