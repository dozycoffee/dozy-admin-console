import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

function Harness({ closeOnBackdrop, onClose = vi.fn(), titleAddon, dismissible }: { closeOnBackdrop?: boolean; onClose?: () => void; titleAddon?: ReactNode; dismissible?: boolean }) {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)}>열기</button>
    <Modal open={open} title="폼 제목" titleAddon={titleAddon} dismissible={dismissible} closeOnBackdrop={closeOnBackdrop} onClose={() => { onClose(); setOpen(false) }}>
      <label>이름<input /></label>
      <button type="button">저장</button>
    </Modal>
  </>
}

describe('Modal', () => {
  it('닫혀 있으면 아무것도 그리지 않는다', () => {
    render(<Harness />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('열면 제목을 이름으로 가진 모달 대화상자를 body에 그린다', async () => {
    render(<Harness />)

    await userEvent.setup().click(screen.getByText('열기'))

    const dialog = screen.getByRole('dialog', { name: '폼 제목' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(document.body.contains(dialog)).toBe(true)
  })

  it('열면 닫기 버튼이 아니라 첫 입력 요소로 포커스를 옮긴다', async () => {
    render(<Harness />)

    await userEvent.setup().click(screen.getByText('열기'))

    expect(screen.getByLabelText('이름')).toHaveFocus()
  })

  it('Esc와 닫기 버튼으로 닫는다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Harness onClose={onClose} />)

    await user.click(screen.getByText('열기'))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByText('열기'))
    await user.click(screen.getByRole('button', { name: '닫기' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(onClose).toHaveBeenCalledTimes(2)
  })

  it('기본값에서는 배경을 눌러도 닫히지 않아 입력을 잃지 않는다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('열기'))
    await user.type(screen.getByLabelText('이름'), '김도윤')

    await user.click(screen.getByRole('dialog').parentElement!)

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveValue('김도윤')
  })

  it('closeOnBackdrop이면 배경을 눌러 닫는다', async () => {
    const user = userEvent.setup()
    render(<Harness closeOnBackdrop />)
    await user.click(screen.getByText('열기'))

    await user.click(screen.getByRole('dialog').parentElement!)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('Tab 포커스가 모달 안에서만 순환한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('열기'))
    expect(screen.getByLabelText('이름')).toHaveFocus()

    await user.tab()
    expect(screen.getByRole('button', { name: '저장' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
    await user.tab()
    expect(screen.getByLabelText('이름')).toHaveFocus()

    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: '닫기' })).toHaveFocus()
  })

  it('닫으면 열기 전에 포커스가 있던 요소로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<Harness />)
    await user.click(screen.getByText('열기'))

    await user.keyboard('{Escape}')

    expect(screen.getByText('열기')).toHaveFocus()
  })

  it('제목 옆 보조 표시는 제목 오른쪽에 그리되 대화상자 이름에는 넣지 않는다', async () => {
    render(<Harness titleAddon={<span>1 / 2</span>} />)

    await userEvent.setup().click(screen.getByText('열기'))

    const dialog = screen.getByRole('dialog', { name: '폼 제목' })
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()
    expect(within(dialog).getByRole('heading', { name: '폼 제목' })).toBeInTheDocument()
  })

  it('dismissible이 false이면 닫기 버튼이 없고 Esc로도 닫히지 않는다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(<Harness dismissible={false} onClose={onClose} />)
    await user.click(screen.getByText('열기'))

    expect(screen.queryByRole('button', { name: '닫기' })).not.toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
