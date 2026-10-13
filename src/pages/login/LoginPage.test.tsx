import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { useAuth } from '../../features/auth/model/useAuth'
import { actorModeIds } from '../../features/auth/model/actorModes'
import { ApiError } from '../../shared/api/ApiError'
import { LoginPage } from './LoginPage'

vi.mock('../../features/auth/model/useAuth')

const mockedUseAuth = vi.mocked(useAuth)

function renderLoginPage(state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: '/login', state }]}>
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

    expect(screen.getByLabelText('이메일')).toBeInTheDocument()
    expect(screen.getByLabelText('비밀번호')).toBeInTheDocument()
  })

  it('초대 수락·비밀번호 재설정을 마치고 넘어오면 완료 안내를 보여준다', () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() })

    renderLoginPage({ notice: '비밀번호를 바꿨습니다. 새 비밀번호로 로그인하세요.' })

    expect(screen.getByRole('status')).toHaveTextContent('비밀번호를 바꿨습니다.')
  })

  it('안내가 없으면 완료 안내를 보여주지 않고 비밀번호 찾기 링크를 보여준다', () => {
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() })

    renderLoginPage()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '비밀번호를 잊으셨나요?' })).toHaveAttribute('href', '/password/forgot')
  })

  it('로그인이 필요한 화면에서 넘어왔으면 로그인한 뒤 그 화면(쿼리 포함)으로 돌아간다', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/owner-transfer', search: '?token=abc' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/owner-transfer" element={<div>accept page</div>} />
          <Route path="/" element={<div>home page</div>} />
        </Routes>
      </MemoryRouter>,
    )
    await user.type(screen.getByLabelText('이메일'), 'kim@dozycoffee.com')
    await user.type(screen.getByLabelText('비밀번호'), 'pw')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('accept page')).toBeInTheDocument()
  })

  it('이미 로그인되어 있어도 돌아갈 화면이 있으면 그 화면으로 보낸다', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-001', name: '김도윤', actorModes: [], permissions: [], scope: { warehouseIds: [] } },
      isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn(),
    })

    render(
      <MemoryRouter initialEntries={[{ pathname: '/login', state: { from: { pathname: '/owner-transfer', search: '?token=abc' } } }]}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/owner-transfer" element={<div>accept page</div>} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('accept page')).toBeInTheDocument()
  })

  it('돌아갈 화면이 로그인 화면 자신이면 콘솔 홈으로 간다', () => {
    mockedUseAuth.mockReturnValue({
      user: { id: 'user-001', name: '김도윤', actorModes: [], permissions: [], scope: { warehouseIds: [] } },
      isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn(),
    })

    renderLoginPage({ from: { pathname: '/login' } })

    expect(screen.getByText('home page')).toBeInTheDocument()
  })

  it('로그인 성공 시 콘솔 홈으로 이동한다', async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('이메일'), 'kim@dozycoffee.com')
    await user.type(screen.getByLabelText('비밀번호'), 'pw')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(login).toHaveBeenCalledWith('kim@dozycoffee.com', 'pw')
    expect(await screen.findByText('home page')).toBeInTheDocument()
  })

  it.each([
    ['INVALID_CREDENTIALS', 401, '이메일 또는 비밀번호가 올바르지 않습니다.'],
    ['ACCOUNT_SUSPENDED', 403, '정지된 계정입니다. 관리자에게 문의해주세요.'],
    ['TOO_MANY_ATTEMPTS', 429, '로그인 시도가 너무 많습니다. 잠시 후 다시 시도해주세요.'],
    ['SOMETHING_ELSE', 500, '로그인에 실패했습니다. 잠시 후 다시 시도해주세요.'],
  ])('로그인 실패 코드 %s는 콘솔이 정한 안내 문구로 보여준다', async (code, status, message) => {
    const login = vi.fn().mockRejectedValue(new ApiError('서버 문구는 쓰지 않는다', { status, code }))
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('이메일'), 'wrong@dozycoffee.com')
    await user.type(screen.getByLabelText('비밀번호'), 'wrong')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText(message)).toBeInTheDocument()
  })

  it('서버에 연결하지 못하면 네트워크 안내 문구를 보여준다', async () => {
    const login = vi.fn().mockRejectedValue(new ApiError('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.', { status: null }))
    mockedUseAuth.mockReturnValue({ user: null, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login, logout: vi.fn() })
    const user = userEvent.setup()

    renderLoginPage()
    await user.type(screen.getByLabelText('이메일'), 'kim@dozycoffee.com')
    await user.type(screen.getByLabelText('비밀번호'), 'pw')
    await user.click(screen.getByRole('button', { name: '로그인' }))

    expect(await screen.findByText('서버에 연결할 수 없습니다. 네트워크 상태를 확인해주세요.')).toBeInTheDocument()
  })
})
