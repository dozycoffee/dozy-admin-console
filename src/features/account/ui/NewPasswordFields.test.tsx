import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import { NewPasswordFields } from './NewPasswordFields'

function Harness({ disabled = false }: { disabled?: boolean }) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  return <NewPasswordFields password={password} confirm={confirm} disabled={disabled} onPasswordChange={setPassword} onConfirmChange={setConfirm} />
}

describe('NewPasswordFields', () => {
  it('정책을 미리 안내하고, 확인 입력 전에는 에러를 보여주지 않는다', async () => {
    render(<Harness />)

    expect(screen.getByText(/8~128자/)).toBeInTheDocument()
    await userEvent.setup().type(screen.getByLabelText('새 비밀번호', { exact: true }), 'abc')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('확인 입력을 시작한 뒤 길이 위반을 안내한다', async () => {
    render(<Harness />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'short')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'short')

    expect(screen.getByRole('alert')).toHaveTextContent('8자 이상 128자 이하')
  })

  it('불일치를 안내하고 맞추면 안내가 사라진다', async () => {
    render(<Harness />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('새 비밀번호', { exact: true }), 'password-1')
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'password-2')
    expect(screen.getByRole('alert')).toHaveTextContent('일치하지 않습니다')

    await user.clear(screen.getByLabelText('새 비밀번호 확인'))
    await user.type(screen.getByLabelText('새 비밀번호 확인'), 'password-1')
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('비활성화하면 입력할 수 없다', () => {
    render(<Harness disabled />)

    expect(screen.getByLabelText('새 비밀번호', { exact: true })).toBeDisabled()
    expect(screen.getByLabelText('새 비밀번호 확인')).toBeDisabled()
  })
})
