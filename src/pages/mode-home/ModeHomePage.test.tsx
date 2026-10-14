import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { actorModeIds, type ActorModeId } from '../../features/auth/model/actorModes'
import { AuthContext } from '../../features/auth/model/authContext'
import { ModeHomePage } from './ModeHomePage'

vi.mock('../dashboard/AccountDashboard', () => ({ AccountDashboard: () => <div>계정 관리자 대시보드</div> }))
vi.mock('../dashboard/DashboardPage', () => ({ DashboardPage: () => <div>창고 대시보드</div> }))
vi.mock('../dashboard/StockDashboard', () => ({ StockDashboard: () => <div>재고 관리 대시보드</div> }))

function renderHome(mode: ActorModeId | null) {
  return render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: mode, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <MemoryRouter><ModeHomePage /></MemoryRouter>
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ModeHomePage', () => {
  it('계정 관리자 모드는 안내 카드가 아니라 계정 관리자 대시보드를 보여준다', () => {
    renderHome(actorModeIds.accountAdministrator)

    expect(screen.getByText('계정 관리자 대시보드')).toBeInTheDocument()
    expect(screen.queryByText(/세부 기능은 해당 업무 서비스 연동과 함께 제공됩니다/)).not.toBeInTheDocument()
  })

  it('창고 관리자 모드는 창고 대시보드를 그대로 보여준다', () => {
    renderHome(actorModeIds.warehouseManager)

    expect(screen.getByText('창고 대시보드')).toBeInTheDocument()
  })

  it('재고 관리 모드는 창고 대시보드가 아니라 재고 관리 대시보드를 보여준다', () => {
    renderHome(actorModeIds.inventoryManager)

    expect(screen.getByText('재고 관리 대시보드')).toBeInTheDocument()
    expect(screen.queryByText('창고 대시보드')).not.toBeInTheDocument()
  })

  it('MD 모드는 이전처럼 안내 카드를 보여준다', () => {
    renderHome(actorModeIds.merchandiser)

    expect(screen.getByRole('heading', { name: '상품 운영 콘솔' })).toBeInTheDocument()
    expect(screen.getAllByText(/세부 기능은 해당 업무 서비스 연동과 함께 제공됩니다/).length).toBeGreaterThan(0)
  })

  it('업무 모드를 아직 고르지 않았다면 자리만 비워 둔다', () => {
    const { container } = renderHome(null)

    expect(container.querySelector('.mode-required-placeholder')).toBeInTheDocument()
  })
})
