import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AppProviders } from './app/providers/AppProviders'
import App from './App'
import './index.css'

// 개발 환경에서는 백엔드 계약이 아직 없는 API만 MSW가 응답하고(지금은 handlers가 비어 있다),
// handlers에 없는 요청(dozy-auth, dozy-wms-api 등)은 실제 백엔드로 그대로 보낸다.
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
