import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import App from './App'
import './index.css'

// BFF 계약이 확정되기 전까지 개발 환경의 모든 /api/* 요청은 MSW가 응답한다.
async function enableMocking() {
  if (!import.meta.env.DEV) return
  const { worker } = await import('./mocks/browser')
  return worker.start({ onUnhandledRequest: 'error' })
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
