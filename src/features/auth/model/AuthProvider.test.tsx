import { act, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { clearAccessToken, getAccessToken } from '../../../shared/api/authToken'
import { configureTokenRefresh } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { fetchCurrentUser, loginRequest, logoutRequest, refreshAccessToken, restoreSession } from './authApi'
import { AuthProvider } from './AuthProvider'
import { actorModeIds } from './actorModes'
import { permissions, type CurrentUser } from './permissions'
import { useAuth } from './useAuth'

vi.mock('./authApi')
vi.mock('../../../shared/api/httpClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../shared/api/httpClient')>()),
  configureTokenRefresh: vi.fn(),
}))

const mockedLoginRequest = vi.mocked(loginRequest)
const mockedFetchCurrentUser = vi.mocked(fetchCurrentUser)
const mockedRestoreSession = vi.mocked(restoreSession)
const mockedLogoutRequest = vi.mocked(logoutRequest)
const mockedConfigureTokenRefresh = vi.mocked(configureTokenRefresh)

const user: CurrentUser = {
  id: 'user-001',
  name: '김도윤',
  actorModes: [actorModeIds.warehouseManager],
  permissions: [permissions.dashboardRead],
  scope: { warehouseIds: [1] },
}

function AuthProbe() {
  const { user, isLoading, activeActorMode, can, selectActorMode, clearActorMode, login, logout } = useAuth()
  return (
    <div>
      <span data-testid="user-name">{user?.name ?? 'anonymous'}</span>
      <span data-testid="loading">{String(isLoading)}</span>
      <span data-testid="can-dashboard">{String(can(permissions.dashboardRead))}</span>
      <span data-testid="active-mode">{activeActorMode ?? 'none'}</span>
      <button onClick={() => login('kim@dozycoffee.com', 'pw').catch(() => undefined)}>login</button>
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

async function renderLoggedOut() {
  renderProbe()
  await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
}

async function renderLoggedIn() {
  mockedRestoreSession.mockResolvedValue(user)
  renderProbe()
  await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))
}

beforeEach(() => {
  clearAccessToken()
  sessionStorage.clear()
  vi.clearAllMocks()
  mockedRestoreSession.mockResolvedValue(null)
  mockedLogoutRequest.mockResolvedValue(undefined)
})

describe('AuthProvider', () => {
  it('세션 복원이 끝나기 전에는 로딩 상태이고, 복원할 세션이 없으면 로그아웃 상태가 된다', async () => {
    renderProbe()
    expect(screen.getByTestId('loading')).toHaveTextContent('true')

    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))
    expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous')
  })

  it('앱을 열 때 이전 세션을 복원하면 사용자와 권한이 채워진다', async () => {
    await renderLoggedIn()

    expect(screen.getByTestId('can-dashboard')).toHaveTextContent('true')
  })

  it('login 성공 시 accessToken을 메모리에 저장하고 현재 사용자를 반영한다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue(user)
    await renderLoggedOut()

    screen.getByText('login').click()

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))
    expect(mockedLoginRequest).toHaveBeenCalledWith('kim@dozycoffee.com', 'pw')
    expect(getAccessToken()).toBe('test-token')
    expect(localStorage.length).toBe(0)
  })

  it('로그인은 됐지만 내 정보 조회에 실패하면 토큰을 지우고 로그아웃 상태를 유지한다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockRejectedValue(new ApiError('unauthenticated', { status: 401, code: 'UNAUTHENTICATED' }))
    await renderLoggedOut()

    screen.getByText('login').click()

    await waitFor(() => expect(mockedFetchCurrentUser).toHaveBeenCalled())
    await waitFor(() => expect(getAccessToken()).toBeNull())
    expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous')
  })

  it('로그인에 실패하면 에러를 던지고 로그아웃 상태를 유지한다', async () => {
    mockedLoginRequest.mockRejectedValue(new ApiError('invalid', { status: 401, code: 'INVALID_CREDENTIALS' }))
    await renderLoggedOut()

    screen.getByText('login').click()

    await waitFor(() => expect(mockedLoginRequest).toHaveBeenCalled())
    expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous')
    expect(getAccessToken()).toBeNull()
  })

  it('logout 시 서버 세션을 폐기하고 사용자 정보와 accessToken을 지운다', async () => {
    mockedLoginRequest.mockResolvedValue({ accessToken: 'test-token' })
    mockedFetchCurrentUser.mockResolvedValue(user)
    await renderLoggedOut()
    screen.getByText('login').click()
    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('김도윤'))

    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous'))
    expect(mockedLogoutRequest).toHaveBeenCalledTimes(1)
    expect(getAccessToken()).toBeNull()
  })

  it('서버 로그아웃 요청이 실패해도 이 브라우저는 로그아웃한다', async () => {
    mockedLogoutRequest.mockRejectedValue(new ApiError('network', { status: null }))
    await renderLoggedIn()

    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous'))
  })

  it('사용자에게 허용된 모드만 선택하고 세션에 저장한다', async () => {
    await renderLoggedIn()

    screen.getByText('select-locked-mode').click()
    expect(screen.getByTestId('active-mode')).toHaveTextContent('none')

    screen.getByText('select-allowed-mode').click()
    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent(actorModeIds.warehouseManager))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBe(actorModeIds.warehouseManager)
  })

  it('로그아웃하면 선택한 모드도 초기화한다', async () => {
    await renderLoggedIn()
    screen.getByText('select-allowed-mode').click()
    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent(actorModeIds.warehouseManager))

    screen.getByText('logout').click()

    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent('none'))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })

  it('복원할 세션이 없으면 저장돼 있던 모드 선택을 지운다', async () => {
    sessionStorage.setItem('dozy-admin-console:activeActorMode', actorModeIds.warehouseManager)

    await renderLoggedOut()

    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent('none'))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })

  it('저장된 모드가 최신 허용 모드에 없으면 선택을 지운다', async () => {
    sessionStorage.setItem('dozy-admin-console:activeActorMode', actorModeIds.merchandiser)

    await renderLoggedIn()

    await waitFor(() => expect(screen.getByTestId('active-mode')).toHaveTextContent('none'))
    expect(sessionStorage.getItem('dozy-admin-console:activeActorMode')).toBeNull()
  })

  it('httpClient에 토큰 갱신 로직을 연결하고, 갱신까지 실패하면 로그아웃 상태로 되돌린다', async () => {
    await renderLoggedIn()
    const handlers = mockedConfigureTokenRefresh.mock.calls.map(([value]) => value).find((value) => value !== null)
    expect(handlers?.refresh).toBe(refreshAccessToken)

    act(() => handlers?.onSessionLost())

    await waitFor(() => expect(screen.getByTestId('user-name')).toHaveTextContent('anonymous'))
  })

  it('언마운트하면 토큰 갱신 연결을 해제한다', async () => {
    const { unmount } = renderProbe()
    await waitFor(() => expect(screen.getByTestId('loading')).toHaveTextContent('false'))

    unmount()

    expect(mockedConfigureTokenRefresh).toHaveBeenLastCalledWith(null)
  })
})
