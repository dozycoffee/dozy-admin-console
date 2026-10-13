import { useCallback } from 'react'
import { useToast } from './toastContext'

/** 값을 클립보드에 복사하고 결과를 토스트로 알린다. 클립보드를 쓸 수 없으면 직접 복사하라고 안내한다. */
export function useCopyText() {
  const { notify } = useToast()
  return useCallback(async (text: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(text)
      notify(successMessage)
    } catch {
      notify('복사하지 못했습니다. 직접 선택해 복사하세요.', 'error')
    }
  }, [notify])
}
