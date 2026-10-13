import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { refreshAccessToken } from '../../features/auth/model/authApi'
import { AuthContext } from '../../features/auth/model/authContext'
import type { CurrentUser } from '../../features/auth/model/permissions'
import { useAcceptOwnerTransfer } from '../../features/owner-transfer/model/useOwnerTransfer'
import { AcceptOwnerTransferPage } from './AcceptOwnerTransferPage'

vi.mock('../../features/auth/model/authApi')
vi.mock('../../features/owner-transfer/model/useOwnerTransfer')

const user: CurrentUser = { id: 'p-kim', name: '김도윤', actorModes: [], permissions: [], scope: { warehouseIds: [] } }
const acceptMutate = vi.fn()
const logout = vi.fn()

function setup(url: string, accept: Record<string, unknown> = {}) {
  vi.mocked(useAcceptOwnerTransfer).mockReturnValue({ mutate: acceptMutate, isPending: false, isError: false, ...accept } as never)
  vi.mocked(refreshAccessToken).mockResolvedValue('new-token')
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue()
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: () => false, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout }}>
        <MemoryRouter initialEntries={[url]}>
          <Routes>
            <Route path="/owner-transfer" element={<AcceptOwnerTransferPage />} />
            <Route path="/" element={<div>console home</div>} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return invalidate
}

beforeEach(() => vi.clearAllMocks())

describe('AcceptOwnerTransferPage', () => {
  it('토큰이 없으면 만료 안내를 보여주고 수락 버튼이 없다', () => {
    setup('/owner-transfer')

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용·취소되었습니다.')
    expect(screen.queryByRole('button', { name: 'owner 권한 수락' })).not.toBeInTheDocument()
  })

  it('로그인한 사용자 이름과 함께 수락 안내를 보여준다', () => {
    setup('/owner-transfer?token=abc')

    expect(screen.getByText(/김도윤님에게 owner 권한 양도가 요청되었습니다/)).toBeInTheDocument()
    expect(screen.getByText(/링크를 받은 본인이 아니라면 수락하지 말고/)).toBeInTheDocument()
  })

  it('확인 모달을 거쳐야 토큰으로 수락한다', async () => {
    setup('/owner-transfer?token=abc')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'owner 권한 수락' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('이전 owner는 role 없는 직원이 됩니다')
    expect(acceptMutate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '수락' }))

    expect(acceptMutate.mock.calls[0][0]).toBe('abc')
  })

  it('확인 모달에서 취소하면 수락하지 않는다', async () => {
    setup('/owner-transfer?token=abc')
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'owner 권한 수락' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(acceptMutate).not.toHaveBeenCalled()
  })

  it('수락에 성공하면 토큰을 갱신하고 내 정보를 다시 불러온 뒤 콘솔로 이동할 수 있다', async () => {
    const invalidate = setup('/owner-transfer?token=abc')
    acceptMutate.mockImplementation(async (_token, options) => { await options.onSuccess() })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'owner 권한 수락' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '수락' }))

    expect(await screen.findByText(/owner 권한을 넘겨받았습니다/)).toBeInTheDocument()
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['auth', 'me'] })
    await user.click(screen.getByRole('button', { name: '콘솔로 이동' }))
    expect(screen.getByText('console home')).toBeInTheDocument()
  })

  it('토큰 갱신에 실패해도 수락 완료는 보여준다', async () => {
    setup('/owner-transfer?token=abc')
    vi.mocked(refreshAccessToken).mockRejectedValue(new Error('refresh failed'))
    acceptMutate.mockImplementation(async (_token, options) => { await options.onSuccess().catch(() => undefined) })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'owner 권한 수락' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '수락' }))

    expect(await screen.findByText(/owner 권한을 넘겨받았습니다/)).toBeInTheDocument()
  })

  it('양도 대상이 아닌 계정이면 안내하고 다른 계정으로 로그인하게 한다', async () => {
    setup('/owner-transfer?token=abc', { isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('양도받을 직원 본인 계정으로 로그인하세요.')
    expect(screen.queryByRole('button', { name: 'owner 권한 수락' })).not.toBeInTheDocument()
    await userEvent.setup().click(screen.getByRole('button', { name: '다른 계정으로 로그인' }))
    expect(logout).toHaveBeenCalledTimes(1)
  })

  it('만료·사용·취소된 링크는 안내하고 다시 수락할 수 없다', () => {
    setup('/owner-transfer?token=abc', { isError: true, error: new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용·취소되었습니다.')
    expect(screen.queryByRole('button', { name: 'owner 권한 수락' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: '콘솔로 이동' })).toHaveAttribute('href', '/')
  })
})
