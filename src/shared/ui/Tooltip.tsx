import { useId, useState, type ReactNode } from 'react'

type Props = {
  /** 툴팁에 보여줄 문구. 없으면 아무것도 감싸지 않고 children만 그대로 렌더링한다. */
  content: string | null | undefined
  children: ReactNode
  className?: string
}

/**
 * 비활성화된 컨트롤의 사유처럼 짧은 안내를 호버·키보드 포커스 때 보여준다.
 * disabled 요소는 호버·포커스 이벤트를 받지 못하는 브라우저가 있어, 요소를 감싼 래퍼가 대신 받는다.
 * 래퍼는 안내가 있을 때만 포커스를 받고(Tab), Esc로 닫는다. 문구는 aria-describedby로 스크린리더에도 연결한다.
 */
export function Tooltip({ content, children, className }: Props) {
  const id = useId()
  const [open, setOpen] = useState(false)

  if (!content) return <>{children}</>
  return <span
    className={className ? `tooltip-anchor ${className}` : 'tooltip-anchor'}
    tabIndex={0}
    aria-describedby={id}
    onMouseEnter={() => setOpen(true)}
    onMouseLeave={() => setOpen(false)}
    onFocus={() => setOpen(true)}
    onBlur={() => setOpen(false)}
    onKeyDown={(event) => { if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false) } }}
  >
    {children}
    <span id={id} role="tooltip" className="tooltip-bubble" hidden={!open}>{content}</span>
  </span>
}
