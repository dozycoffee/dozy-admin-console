import { useEffect, useState } from 'react'

/** [value]가 [delayMs] 동안 바뀌지 않으면 그 값을 돌려준다. 입력할 때마다 서버에 검색하지 않고 멈췄을 때 한 번만 하려고 쓴다. */
export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs)
    return () => window.clearTimeout(timer)
  }, [value, delayMs])
  return debounced
}
