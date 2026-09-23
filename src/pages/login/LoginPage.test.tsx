import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../features/auth/model/useAuth'
import { actorModeIds } from '../../features/auth/model/actorModes'
import { LoginPage } from './LoginPage'

vi.mock('../../features/auth/model/useAuth')

const mockedUseAuth = vi.mocked(useAuth)

function renderLoginPage() {
  return render(
    <MemoryRouter initialEntries={['/login']}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<div>home page</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('LoginPage', () => {
  it('이미 로그인되어 있으면 홈으로 리다이렉트한다', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-001', name: '김도윤', actorModes: [actorModeIds.warehouseManager], permissions: [], scope: { warehouseIds: [] } },
      isLoading: false,
      activeActorMode: null,
      can: () => true,
      selectActorMode: vi.fn(),
      clearActorMode: vi.fn(),
      login: vi.fn(),
      logout: vi.fn(),
    })

    renderLoginPage()

    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('로그인 폼을 보여준다', () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() })

    renderLoginPage()

    expect(screen.getByText('아이디')).toBeInTheDocument()
    expect(screen.getByText('비밀번호')).toBeInTheDocument()
    expect(screen.getByText('데모 계정: dozy / dozy1234')).toBeInTheDocument()
  })

  it('로그인 성공 시 홈으로 이동한다', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('아이디'), 'dozy')
    await user.type(screen.getByLabelText('비밀번호'), 'dozy1234')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(login).toHaveBeenCalledWith('dozy', 'dozy1234')
    expect(await screen.findByText('home page')).toBeInTheDocument()
  })

  it('로그인 실패 시 에러 메시지를 보여준다', async () => {
    const login = vi.fn().mockRejectedValue(new Error('아이디 또는 비밀번호가 올바르지 않습니다.'))
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('아이디'), 'wrong')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('아이디 또는 비밀번호가 올바르지 않습니다.')).toBeInTheDocument()
  })
})
