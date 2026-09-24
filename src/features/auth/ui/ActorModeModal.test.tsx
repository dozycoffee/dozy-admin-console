import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { actorModeIds } from '../model/actorModes'
import { AuthContext, type AuthContextValue } from '../model/authContext'
import { ActorModeModal } from './ActorModeModal'

function renderModal(activeActorMode: AuthContextValue['activeActorMode'] = null) {
  const allowedModes = [actorModeIds.warehouseManager, actorModeIds.headquartersInventoryManager]
  const selectActorMode = vi.fn((modeId) => allowedModes.includes(modeId))
  const onClose = vi.fn()
  const onSelected = vi.fn()
  const value: AuthContextValue = {
    user: { id: 'user-001', name: '김도윤', actorModes: allowedModes, permissions: [], scope: { warehouseIds: [] } },
    isLoading: false,
    activeActorMode,
    can: () => false,
    selectActorMode,
    clearActorMode: vi.fn(),
    login: vi.fn(),
    logout: vi.fn(),
  }
  render(<AuthContext.Provider value={value}><ActorModeModal open onClose={onClose} onSelected={onSelected} /></AuthContext.Provider>)
  return { selectActorMode, onClose, onSelected }
}

describe('ActorModeModal', () => {
  it('모든 모드를 표시하고 권한 없는 모드는 잠근다', () => {
    renderModal()
    expect(screen.getAllByText('권한 없음')).toHaveLength(2)
    expect(screen.getByRole('button', { name: /계정 관리자/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /창고 관리자/ })).toBeEnabled()
  })

  it('허용된 모드를 선택한다', async () => {
    const user = userEvent.setup()
    const { selectActorMode, onSelected } = renderModal()
    await user.click(screen.getByRole('button', { name: /창고 관리자/ }))
    expect(selectActorMode).toHaveBeenCalledWith(actorModeIds.warehouseManager)
    expect(onSelected).toHaveBeenCalled()
  })

  it('기존 선택 모드가 있을 때만 닫기 버튼을 제공한다', () => {
    renderModal()
    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument()
  })

  it('기존 선택 모드가 있으면 닫기 버튼으로 돌아갈 수 있다', async () => {
    const user = userEvent.setup()
    const { onClose } = renderModal(actorModeIds.warehouseManager)
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(onClose).toHaveBeenCalled()
  })
})
