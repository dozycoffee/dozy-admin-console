import { useEffect, useRef, useState } from 'react'

/** 닫힐 때 사라지는 애니메이션이 끝날 때까지 화면에 남겨 두는 시간(ms). CSS의 `modal-*-out` 길이와 맞춘다. */
export const EXIT_DURATION_MS = 140

/** 브라우저가 애니메이션을 보여줄 수 있고 사용자가 "동작 줄이기"를 켜지 않았는지 */
function canAnimate(): boolean {
  return typeof window.matchMedia === 'function' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * `open`이 false로 바뀐 뒤에도 사라지는 애니메이션이 끝날 때까지 `visible`을 true로 유지한다(`closing`은 그 동안 true).
 * 애니메이션을 쓸 수 없는 환경(동작 줄이기, 단위 테스트 등)에서는 `open`을 그대로 따라 바로 사라진다.
 */
export function usePresence(open: boolean) {
  const [leaving, setLeaving] = useState(false)
  const wasOpen = useRef(open)

  useEffect(() => {
    if (open) {
      wasOpen.current = true
      // oxlint-disable-next-line react/set-state-in-effect
      setLeaving(false)
      return
    }
    if (!wasOpen.current) return
    wasOpen.current = false
    if (!canAnimate()) return
    // oxlint-disable-next-line react/set-state-in-effect
    setLeaving(true)
    const timer = window.setTimeout(() => setLeaving(false), EXIT_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [open])

  return { visible: open || leaving, closing: !open && leaving }
}
