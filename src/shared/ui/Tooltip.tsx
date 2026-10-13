import { useId, useState, type ReactNode } from 'react'

type Props = {
  /** 툴팁에 보여줄 문구. 없으면 아무것도 감싸지 않고 children만 그대로 렌더링한다. */
  content: string | null | undefined
  children: ReactNode
  className?: string
  /** 래퍼가 아이콘 배지처럼 글자가 없는 요소일 때 화면 읽기 도구가 읽을 이름 */
  label?: string
  /** 주면 래퍼 자체가 버튼처럼 동작한다(클릭·Enter·Space). 이때 `label`은 버튼의 이름이다. */
  onActivate?: () => void
}

/**
 * 비활성화된 컨트롤의 사유처럼 짧은 안내를 호버·키보드 포커스 때 보여준다.
 * disabled 요소는 호버·포커스 이벤트를 받지 못하는 브라우저가 있어, 요소를 감싼 래퍼가 대신 받는다.
 * 래퍼는 안내가 있을 때만 포커스를 받고(Tab), Esc로 닫는다. 문구는 aria-describedby로 스크린리더에도 연결한다.
 */
export function Tooltip({ content, children, className, label, onActivate }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)

  if (!content) return <>{children}</>
  return <span
    className={[ 'tooltip-anchor', onActivate && 'tooltip-actionable', className ].filter(Boolean).join(' ')}
    tabIndex={0}
    {...(label && { role: onActivate ? 'button' : 'img', 'aria-label': label })}
    onClick={onActivate}
    aria-describedby={id}
    onMouseEnter={() => setOpen(true)}
    onMouseLeave={() => setOpen(false)}
    onFocus={() => setOpen(true)}
    onBlur={() => setOpen(false)}
    onKeyDown={(event) => {
      if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false) }
      else if (onActivate && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); onActivate() }
    }}
  >
    {children}
    <span id={id} role="tooltip" className="tooltip-bubble" hidden={!open}>{content}</span>
  </span>
}
