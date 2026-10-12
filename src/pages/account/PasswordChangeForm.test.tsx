import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useChangePassword } from '../../features/account/model/useMyAccount'
import { PasswordChangeForm } from './PasswordChangeForm'

vi.mock('../../features/account/model/useMyAccount')

const mutate = vi.fn()

function setup(state: Record<string, unknown> = {}) {
  vi.mocked(useChangePassword).mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...state } as never)
  render(<PasswordChangeForm />)
}

async function fill(user: ReturnType<typeof userEvent.setup>, current: string, next: string, confirm: string) {
  if (current) await user.type(screen.getByLabelText('현재 비밀번호'), current)
  await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), next)
  await user.type(screen.getByLabelText('새 비밀번호 확인'), confirm)
}

beforeEach(() => vi.clearAllMocks())

describe('PasswordChangeForm', () => {
  it('현재 비밀번호와 정책에 맞는 새 비밀번호·일치하는 확인이 있어야 변경할 수 있다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '비밀번호 변경' })
    expect(submit).toBeDisabled()

    await fill(user, '', 'new-password-1', 'new-password-1')
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('현재 비밀번호'), 'old-password-1')
    expect(submit).toBeEnabled()
  })

  it('새 비밀번호 확인이 다르면 변경할 수 없다', async () => {
    setup()
    const user = userEvent.setup()

    await fill(user, 'old-password-1', 'new-password-1', 'new-password-2')

    expect(screen.getByRole('button', { name: '비밀번호 변경' })).toBeDisabled()
  })

  it('현재 비밀번호와 새 비밀번호를 보내고 성공하면 입력을 비운다', async () => {
    setup()
    mutate.mockImplementation((_body, options) => options.onSuccess())
    const user = userEvent.setup()

    await fill(user, 'old-password-1', 'new-password-1', 'new-password-1')
    await user.click(screen.getByRole('button', { name: '비밀번호 변경' }))

    expect(mutate.mock.calls[0][0]).toEqual({ currentPassword: 'old-password-1', newPassword: 'new-password-1' })
    expect(screen.getByLabelText('현재 비밀번호')).toHaveValue('')
    expect(screen.getByLabelText('새 비밀번호', { exact: true })).toHaveValue('')
  })

  it('성공하면 다른 기기 로그인이 해제된다고 안내한다', () => {
    setup({ isSuccess: true })

    expect(screen.getByRole('status')).toHaveTextContent('다른 기기의 로그인은 모두 해제됩니다.')
  })

  it.each([
    ['CURRENT_PASSWORD_MISMATCH', 400, '현재 비밀번호가 올바르지 않습니다.'],
    ['VALIDATION_FAILED', 400, '비밀번호가 규칙에 맞지 않습니다.'],
    ['TOO_MANY_ATTEMPTS', 429, '요청이 너무 많습니다.'],
  ])('%s는 안내 문구로 바꾼다', (code, status, message) => {
    setup({ isError: true, error: new ApiError('서버 문구', { status, code }) })

    expect(screen.getByRole('alert')).toHaveTextContent(message)
  })
})
