import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'
import { Modal } from './Modal'

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

  it('children이 있으면 제목과 설명 사이에 본문으로 보여준다', () => {
    renderModal({ children: <p data-testid="detail">상세 내용</p> })

    const dialog = screen.getByRole('dialog', { name: '삭제할까요?' })
    const body = dialog.querySelector('.confirm-modal-body')
    expect(body).toContainElement(screen.getByTestId('detail'))
    expect(body?.previousElementSibling?.tagName).toBe('H2')
    expect(body?.nextElementSibling).toHaveTextContent('되돌릴 수 없습니다.')
  })

  it('children이 없으면 본문 영역을 만들지 않는다', () => {
    renderModal()

    expect(screen.getByRole('dialog').querySelector('.confirm-modal-body')).toBeNull()
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

function ModalWithConfirm({ onClose, onCancel }: { onClose: () => void; onCancel: () => void }) {
  const [confirming, setConfirming] = useState(false)
  return <Modal open title="바깥" onClose={onClose}>
    <button type="button" onClick={() => setConfirming(true)}>확인 열기</button>
    <ConfirmModal open={confirming} title="확인" onCancel={() => { onCancel(); setConfirming(false) }} onConfirm={vi.fn()} />
  </Modal>
}

describe('다른 모달 위에 열린 확인 모달', () => {
  it('Esc는 확인 모달만 닫고 아래 모달은 닫지 않는다', async () => {
    const onClose = vi.fn()
    const onCancel = vi.fn()
    render(<ModalWithConfirm onClose={onClose} onCancel={onCancel} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('확인 열기'))
    await user.keyboard('{Escape}')

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onClose).not.toHaveBeenCalled()
  })
})
