import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'

function renderModal(props: Partial<React.ComponentProps<typeof ConfirmModal>> = {}) {
  const onConfirm = vi.fn()
  const onCancel = vi.fn()
  const view = render(<section data-testid="page"><ConfirmModal open title="삭제할까요?" description="되돌릴 수 없습니다." onConfirm={onConfirm} onCancel={onCancel} {...props} /></section>)
  return { ...view, onConfirm, onCancel }
}

describe('ConfirmModal', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    renderModal({ open: false })

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('제목과 설명을 가진 대화상자를 보여준다', () => {
    renderModal()

    expect(screen.getByRole('dialog', { name: '삭제할까요?' })).toHaveTextContent('되돌릴 수 없습니다.')
  })

  it('호출한 위치가 아니라 body에 그려 상위 요소의 transform에 영향을 받지 않는다', () => {
    renderModal()

    const dialog = screen.getByRole('dialog')
    expect(screen.getByTestId('page')).not.toContainElement(dialog)
    expect(dialog.closest('.modal-backdrop')?.parentElement).toBe(document.body)
  })

  it('확인·취소 버튼과 Esc, 배경 클릭으로 알린다', async () => {
    const { onConfirm, onCancel } = renderModal({ confirmLabel: '삭제' })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '삭제' }))
    expect(onConfirm).toHaveBeenCalledTimes(1)

    await user.click(screen.getByRole('button', { name: '취소' }))
    await user.keyboard('{Escape}')
    await user.pointer({ keys: '[MouseLeft]', target: screen.getByRole('presentation') })
    expect(onCancel).toHaveBeenCalledTimes(3)
  })
})
