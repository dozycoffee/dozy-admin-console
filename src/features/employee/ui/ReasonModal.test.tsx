import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReasonModal } from './ReasonModal'

function setup(open = true) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  render(<ReasonModal open={open} title="계정을 정지할까요?" description="설명" confirmLabel="정지" onConfirm={onConfirm} onCancel={onCancel} />)
  return { onConfirm, onCancel }
}

describe('ReasonModal', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    setup(false)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('사유가 비어 있거나 공백뿐이면 확인 버튼이 비활성이다', async () => {
    setup()
    const user = userEvent.setup()
    const confirm = screen.getByRole('button', { name: '정지' })
    expect(confirm).toBeDisabled()

    await user.type(screen.getByLabelText('사유'), '   ')
    expect(confirm).toBeDisabled()
  })

  it('앞뒤 공백을 제거한 사유로 확인한다', async () => {
    const { onConfirm } = setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('사유'), '  계정 탈취 의심 ')
    await user.click(screen.getByRole('button', { name: '정지' }))

    expect(onConfirm).toHaveBeenCalledWith('계정 탈취 의심')
  })

  it('입력은 500자까지만 받는다', () => {
    setup()

    expect(screen.getByLabelText('사유')).toHaveAttribute('maxLength', '500')
  })

  it('취소 버튼과 Esc로 닫는다', async () => {
    const { onCancel } = setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '취소' }))
    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(2)
  })
})
