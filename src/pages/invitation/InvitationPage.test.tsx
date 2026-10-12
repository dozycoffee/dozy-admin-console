import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useAcceptInvitation, useInvitation } from '../../features/account/model/useAccountRecovery'
import { InvitationPage } from './InvitationPage'

vi.mock('../../features/account/model/useAccountRecovery')

const info = { name: '김도윤', maskedEmail: 'ki***@dozycoffee.com', maskedPhone: null, expiresAt: '2099-01-01T00:00:00Z' }
const acceptMutate = vi.fn()
const expired = new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' })

function LoginStub() {
  return <div>login page: {(useLocation().state as { notice?: string } | null)?.notice}</div>
}

function setup(url: string, invitation: Record<string, unknown>, accept: Record<string, unknown> = {}) {
  vi.mocked(useInvitation).mockReturnValue({ isLoading: false, isError: false, ...invitation } as never)
  vi.mocked(useAcceptInvitation).mockReturnValue({ mutate: acceptMutate, isPending: false, isError: false, ...accept } as never)
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/invitation" element={<InvitationPage />} />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('InvitationPage', () => {
  it('토큰이 없으면 만료 안내를 보여주고 조회하지 않는다', () => {
    setup('/invitation', { data: undefined })

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용되었습니다.')
    expect(vi.mocked(useInvitation)).toHaveBeenCalledWith('')
  })

  it('URL의 token으로 초대를 조회한다', () => {
    setup('/invitation?token=abc', { isLoading: true })

    expect(vi.mocked(useInvitation)).toHaveBeenCalledWith('abc')
    expect(screen.getByText('초대를 확인하는 중입니다...')).toBeInTheDocument()
  })

  it('만료된 초대는 안내하고 폼을 보여주지 않는다', () => {
    setup('/invitation?token=abc', { isError: true, error: expired })

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용되었습니다.')
    expect(screen.queryByLabelText('새 비밀번호', { exact: true })).not.toBeInTheDocument()
  })

  it('조회에 실패하면 에러 안내를 보여준다', () => {
    setup('/invitation?token=abc', { isError: true, error: new ApiError('x', { status: 429, code: 'TOO_MANY_ATTEMPTS' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('요청이 너무 많습니다.')
  })

  it('초대받은 사람의 이름과 마스킹된 이메일을 보여준다', () => {
    setup('/invitation?token=abc', { data: info })

    expect(screen.getByText(/김도윤님, 관리자 콘솔에 초대되었습니다/)).toBeInTheDocument()
    expect(screen.getByText('로그인 이메일: ki***@dozycoffee.com')).toBeInTheDocument()
  })

  it('비밀번호가 정책에 맞고 확인이 일치할 때만 설정할 수 있다', async () => {
    setup('/invitation?token=abc', { data: info })
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '비밀번호 설정' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'new-password-1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-2')
    expect(submit).toBeDisabled()

    await user.clear(screen.getByLabelText('새 비밀번호 확인'))
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1')
    expect(submit).toBeEnabled()
  })

  it('수락하면 토큰과 비밀번호를 보내고 로그인 화면으로 이동해 완료 안내를 보여준다', async () => {
    setup('/invitation?token=abc', { data: info })
    acceptMutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'new-password-1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1')
    await user.click(screen.getByRole('button', { name: '비밀번호 설정' }))

    expect(acceptMutate.mock.calls[0][0]).toEqual({ token: 'abc', password: 'new-password-1' })
    expect(await screen.findByText(/login page: 비밀번호를 설정했습니다/)).toBeInTheDocument()
  })

  it('수락 중 서버가 비밀번호 규칙 위반을 알리면 안내한다', () => {
    setup('/invitation?token=abc', { data: info }, { isError: true, error: new ApiError('x', { status: 400, code: 'VALIDATION_FAILED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('규칙에 맞지 않습니다')
  })

  it('수락 시점에 초대가 만료됐으면 만료 안내로 바꾼다', () => {
    setup('/invitation?token=abc', { data: info }, { isError: true, error: expired })

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용되었습니다.')
    expect(screen.queryByRole('button', { name: '비밀번호 설정' })).not.toBeInTheDocument()
  })
})
