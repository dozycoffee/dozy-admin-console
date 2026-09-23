import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { getAccessToken } from '../../../shared/api/authToken'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { fetchCurrentUser, loginRequest } from './authApi'
import { AuthProvider } from './AuthProvider'
import { actorModeIds } from './actorModes'
import { permissions } from './permissions'
import { useAuth } from './useAuth'

vi.mock('./authApi')

const mockedLoginRequest = vi.mocked(loginRequest)
const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)

function AuthProbe() {
  const { user, isLoading, activeActorMode, can, selectActorMode, clearActorMode, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user-name">{user?.name ?? 'anonymous'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="can-dashboard">{String(can(permissions.dashboardRead))}</span>
      <span data-testid="active-mode">{activeActorMode ?? 'none'}</span>
      <button onClick={() => login('dozy', 'dozy1234')}>login</button>
      <button onClick={() => selectActorMode(actorModeIds.warehouseManager)}>select-allowed-mode</button>
      <button onClick={() => selectActorMode(actorModeIds.accountAdministrator)}>select-locked-mode</button>
      <button onClick={clearActorMode}>clear-mode</button>
      <button onClick={logout}>logout</button>
    </div>
  )
}

function renderProbe() {
  const Wrapper = createQueryClientWrapper()
  return render(
    <Wrapper>
      <AuthProvider>
        <AuthProbe />
      </AuthProvider>
    </Wrapper>,
  )
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  vi.clearAllMocks()
})

describe('AuthProvider', () => {
  it('accessToken이 없으면 인증되지 않은 상태로 시작한다', () => {
    renderProbe()

    expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous')
    expect(mockedFetchCurrentUser).not.toHaveBeenCalled()
  })

  it('login 성공 시 accessToken을 저장하고 현재 사용자를 조회한다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue({
      id: 'user-001',
      name: '김도윤',
      actorModes: [actorModeIds.warehouseManager],
      permissions: [permissions.dashboardRead],
      scope: { warehouseIds: [1] },
    })

    renderProbe()
    screen.getByText('login').click()

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))
    expect(getAccessToken()).toBe('test-token')
    expect(screen.getByTestId('can-dashboard')).toHaveTextContent('true')
  })

  it('logout 시 사용자 정보와 accessToken을 지운다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue({
      id: 'user-001',
      name: '김도윤',
      actorModes: [actorModeIds.warehouseManager],
      permissions: [],
      scope: { warehouseIds: [] },
    })

    renderProbe()
    screen.getByText('login').click()
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))

    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous'))
    expect(getAccessToken()).toBeNull()
  })

  it('사용자에게 허용된 모드만 선택하고 세션에 저장한다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue({
      id: 'user-001',
      name: '김도윤',
      actorModes: [actorModeIds.warehouseManager],
      permissions: [],
      scope: { warehouseIds: [] },
    })

    renderProbe()
    screen.getByText('login').click()
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))

    screen.getByText('select-locked-mode').click()
    expect(screen.getByTestId('active-mode')).toHaveTextContent('none')

    screen.getByText('select-allowed-mode').click()
    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent(actorModeIds.warehouseManager))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBe(actorModeIds.warehouseManager)
  })

  it('로그아웃하면 선택한 모드도 초기화한다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue({
      id: 'user-001',
      name: '김도윤',
      actorModes: [actorModeIds.warehouseManager],
      permissions: [],
      scope: { warehouseIds: [] },
    })

    renderProbe()
    screen.getByText('login').click()
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))
    screen.getByText('select-allowed-mode').click()
    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent('none'))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })

  it('저장된 accessToken으로 /api/auth/me 조회에 실패하면 로그아웃 상태로 되돌린다', async () => {
    localStorage.setItem('dozy-admin-console:accessToken', 'stale-token')
    sessionStorage.setItem('dozy-admin-console:activeActorMode', actorModeIds.warehouseManager)
    mockedFetchCurrentUser.mockRejectedValue(new Error('unauthorized'))

    renderProbe()

    await waitFor(() => expect(mockedFetchCurrentUser).toHaveBeenCalled())
    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous')
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })
})
