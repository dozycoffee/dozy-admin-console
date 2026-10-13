import { flushSync } from 'react-dom'

/**
 * 화면이 바뀌는 상태 변경을 View Transitions API로 감싸 바뀌기 전·후 화면을 부드럽게 전환한다.
 * 지원하지 않는 브라우저이거나 사용자가 "동작 줄이기"를 켰다면 전환 없이 바로 바꾼다.
 * `update`는 React 상태를 바꾸는 함수여야 하며, 전환이 바뀐 화면을 바로 찍을 수 있도록 동기적으로 반영한다(flushSync).
 */
export function withViewTransition(update: () => void) {
  const reduceMotion = typeof window.matchMedia === 'function' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduceMotion || typeof document.startViewTransition !== 'function') {
    update()
    return
  }
  document.startViewTransition(() => flushSync(update))
}
