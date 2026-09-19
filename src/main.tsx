import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import App from './App'
import './index.css'

// 실제 인증 서비스가 준비되기 전까지 /api/auth/* 요청을 MSW로 목킹한다 (auth-login-ui-mock-backend).
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
