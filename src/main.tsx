import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import App from './App'
import './index.css'

// 개발 환경에서는 dozy-wms-api에 아직 없는 계약(인증, 입고 워크플로우)만 MSW가 응답하고,
// handlers에 없는 /api/* 요청(창고, Zone 재고 요약 등)은 실제 백엔드로 그대로 보낸다.
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'bypass' })
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <AppProviders><App /></AppProviders>
      </BrowserRouter>
    </StrictMode>,
  )
})
