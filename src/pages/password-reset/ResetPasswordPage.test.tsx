import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useResetPassword } from '../../features/account/model/useAccountRecovery'
import { ResetPasswordPage } from './ResetPasswordPage'

vi.mock('../../features/account/model/useAccountRecovery')

const mutate = vi.fn()

function LoginStub() {
  return <div>login page: {(useLocation().state as { notice?: string } | null)?.notice}</div>
}

function setup(url: string, state: Record<string, unknown> = {}) {
  vi.mocked(useResetPassword).mockReturnValue({ mutate, isPending: false, isError: false, ...state } as never)
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/password/reset" element={<ResetPasswordPage />} />
        <Route path="/login" element={<LoginStub />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('ResetPasswordPage', () => {
  it('토큰이 없으면 만료 안내와 재요청 링크를 보여준다', () => {
    setup('/password/reset')

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용되었습니다.')
    expect(screen.getByRole('link', { name: '재설정 링크 다시 받기' })).toHaveAttribute('href', '/password/forgot')
  })

  it('정책에 맞는 새 비밀번호를 확인까지 입력해야 변경할 수 있다', async () => {
    setup('/password/reset?token=abc')
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '비밀번호 변경' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'short')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'short')
    expect(submit).toBeDisabled()

    await user.clear(screen.getByLabelText('새 비밀번호', { exact: true }))
    await user.clear(screen.getByLabelText('새 비밀번호 확인'))
    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'new-password-1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1')
    expect(submit).toBeEnabled()
  })

  it('변경하면 토큰과 새 비밀번호를 보내고 로그인 화면으로 이동해 안내한다', async () => {
    setup('/password/reset?token=abc')
    mutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'new-password-1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'new-password-1')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(mutate.mock.calls[0][0]).toEqual({ token: 'abc', newPassword: 'new-password-1' })
    expect(await screen.findByText(/login page: 비밀번호를 바꿨습니다/)).toBeInTheDocument()
  })

  it('변경 시점에 링크가 만료됐으면 만료 안내로 바꾼다', () => {
    setup('/password/reset?token=abc', { isError: true, error: new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('링크가 만료되었거나 이미 사용되었습니다.')
    expect(screen.queryByRole('button', { name: '비밀번호 변경' })).not.toBeInTheDocument()
  })

  it('서버가 비밀번호 규칙 위반을 알리면 폼을 유지한 채 안내한다', () => {
    setup('/password/reset?token=abc', { isError: true, error: new ApiError('x', { status: 400, code: 'VALIDATION_FAILED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('규칙에 맞지 않습니다')
    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeInTheDocument()
  })
})
