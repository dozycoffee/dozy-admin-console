import { createContext, useContext } from 'react'

export type ToastApi = {
  /** 성공 안내를 화면 위에 띄운다. 이미 떠 있으면 새 안내로 바꾸고 자동으로 닫힐 때까지 시간을 다시 센다. */
  notify: (message: string) => void
}

// Provider 밖(예: 단위 테스트)에서는 아무것도 하지 않는다.
export const ToastContext = createContext<ToastApi>({ notify: () => {} })

export function useToast(): ToastApi {
  return useContext(ToastContext)
}
