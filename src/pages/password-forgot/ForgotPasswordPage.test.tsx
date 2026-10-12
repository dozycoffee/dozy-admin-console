import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useRequestPasswordReset } from '../../features/account/model/useAccountRecovery'
import { ForgotPasswordPage } from './ForgotPasswordPage'

vi.mock('../../features/account/model/useAccountRecovery')

const mutate = vi.fn()

function setup(state: Record<string, unknown> = {}) {
  vi.mocked(useRequestPasswordReset).mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...state } as never)
  render(<MemoryRouter><ForgotPasswordPage /></MemoryRouter>)
}

beforeEach(() => vi.clearAllMocks())

describe('ForgotPasswordPage', () => {
  it('올바른 이메일을 입력해야 보낼 수 있다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '재설정 링크 보내기' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('이메일'), 'not-an-email')
    expect(submit).toBeDisabled()
    await user.clear(screen.getByLabelText('이메일'))
    await user.type(screen.getByLabelText('이메일'), 'kim@dozycoffee.com')
    expect(submit).toBeEnabled()
  })

  it('앞뒤 공백을 제거한 이메일로 요청한다', async () => {
    setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이메일'), ' kim@dozycoffee.com ')
    await user.click(screen.getByRole('button', { name: '재설정 링크 보내기' }))

    expect(mutate).toHaveBeenCalledWith('kim@dozycoffee.com')
  })

  it('성공 안내는 계정 존재 여부를 드러내지 않는 문구다', () => {
    setup({ isSuccess: true })

    expect(screen.getByRole('status')).toHaveTextContent('해당 이메일로 가입된 계정이 있으면')
  })

  it('요청 제한에 걸리면 안내한다', () => {
    setup({ isError: true, error: new ApiError('x', { status: 429, code: 'TOO_MANY_ATTEMPTS' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('요청이 너무 많습니다.')
  })

  it('로그인 화면으로 돌아가는 링크가 있다', () => {
    setup()

    expect(screen.getByRole('link', { name: '로그인 화면으로' })).toHaveAttribute('href', '/login')
  })
})
