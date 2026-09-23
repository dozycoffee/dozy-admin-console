import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { actorModeIds } from '../../features/auth/model/actorModes'
import { AuthContext, type AuthContextValue } from '../../features/auth/model/authContext'
import { ModeSelectionPage } from './ModeSelectionPage'

function renderPage(actorModes: NonNullable<AuthContextValue['user']>['actorModes']) {
  const selectActorMode = vi.fn((modeId) => actorModes.includes(modeId))
  const value: AuthContextValue = {
    user: { id: 'user-001', name: '김도윤', actorModes, permissions: [], scope: { warehouseIds: [] } },
    isLoading: false,
    activeActorMode: null,
    can: () => false,
    selectActorMode,
    clearActorMode: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }

  render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={['/select-mode']}>
        <Routes>
          <Route path="/select-mode" element={<ModeSelectionPage />} />
          <Route path="/" element={<div>selected console</div>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  )

  return { selectActorMode, logout: value.logout }
}

describe('ModeSelectionPage', () => {
  it('허용 여부와 관계없이 모든 모드를 표시한다', () => {
    renderPage([actorModeIds.warehouseManager])

    expect(screen.getByRole('heading', { name: '계정 관리자' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'MD (상품 담당)' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '창고 관리자' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '본사 재고 담당자' })).toBeInTheDocument()
    expect(screen.getAllByText('권한 없음')).toHaveLength(3)
  })

  it('권한 없는 모드는 잠금 안내를 표시하고 선택을 차단한다', () => {
    const { selectActorMode } = renderPage([actorModeIds.warehouseManager])
    const lockedCard = screen.getByRole('heading', { name: '계정 관리자' }).closest('article')

    expect(lockedCard).toHaveClass('locked')
    expect(lockedCard?.querySelector('button')).toBeDisabled()
    expect(lockedCard).toHaveTextContent('관리자에게 해당 모드 권한을 요청하세요.')
    expect(selectActorMode).not.toHaveBeenCalled()
  })

  it('허용된 모드를 선택하면 해당 모드를 저장하고 콘솔로 이동한다', async () => {
    const user = userEvent.setup()
    const { selectActorMode } = renderPage([actorModeIds.warehouseManager])

    await user.click(screen.getByRole('button', { name: /이 모드로 시작/ }))

    expect(selectActorMode).toHaveBeenCalledWith(actorModeIds.warehouseManager)
    expect(screen.getByText('selected console')).toBeInTheDocument()
  })
})
