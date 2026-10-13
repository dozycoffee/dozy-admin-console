import { useCallback, useEffect, useMemo, useState, type PropsWithChildren } from 'react'
import { createPortal } from 'react-dom'
import { ToastContext } from './toastContext'

export const TOAST_DURATION_MS = 8000

/**
 * 성공 안내용 토스트. 화면 위에 떠 있어 레이아웃을 밀지 않고 스크롤 위치와 상관없이 보이며, 일정 시간 뒤 저절로 사라진다.
 * 하나만 보여주므로 새 안내가 오면 이전 안내를 대체한다. 실패 안내는 읽고 조치해야 하므로 토스트가 아니라 각 화면에 둔다.
 * `body`에 그려서 라우트 전환 애니메이션의 transform에 영향을 받지 않는다(position: fixed가 화면 기준으로 동작).
 */
export function ToastProvider({ children }: PropsWithChildren) {
  const [toast, setToast] = useState<{ id: number; message: string } | null>(null)
  const notify = useCallback((message: string) => setToast((current) => ({ id: (current?.id ?? 0) + 1, message })), [])
  const api = useMemo(() => ({ notify }), [notify])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => window.clearTimeout(timer)
  }, [toast])

  return <ToastContext.Provider value={api}>
    {children}
    {toast && createPortal(
      <p className="toast" role="status" key={toast.id}>
        {toast.message}
        <button type="button" aria-label="안내 닫기" onClick={() => setToast(null)}>×</button>
      </p>,
      document.body,
    )}
  </ToastContext.Provider>
}
