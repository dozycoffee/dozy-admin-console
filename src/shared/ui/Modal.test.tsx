import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'
import { EXIT_DURATION_MS } from './usePresence'

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

  describe('애니메이션을 쓸 수 있는 환경', () => {
    beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }); vi.stubGlobal('matchMedia', (query: string) => ({ matches: false, media: query })) })
    afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

    it('닫으면 사라지는 애니메이션이 끝날 때까지 내용을 유지한 채 닫히는 중으로 남았다가 사라진다', async () => {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      render(<Harness />)
      await user.click(screen.getByText('열기'))

      await user.keyboard('{Escape}')
      const backdrop = screen.getByRole('dialog').closest('.modal-backdrop')
      expect(backdrop).toHaveClass('closing')
      expect(screen.getByLabelText('이름')).toBeInTheDocument()

      await act(async () => { vi.advanceTimersByTime(EXIT_DURATION_MS + 20) })
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('열 때는 닫히는 중 표시가 없다', async () => {
      render(<Harness />)

      await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByText('열기'))

      expect(screen.getByRole('dialog').closest('.modal-backdrop')).not.toHaveClass('closing')
    })
  })

  it('className을 주면 대화상자에 덧붙인다', async () => {
    render(<ModalWithClass />)

    await userEvent.setup().click(screen.getByText('열기'))

    expect(screen.getByRole('dialog')).toHaveClass('form-modal', 'wide')
  })
})

function ModalWithClass() {
  const [open, setOpen] = useState(false)
  return <>
    <button type="button" onClick={() => setOpen(true)}>열기</button>
    <Modal open={open} title="넓은 모달" className="wide" onClose={() => setOpen(false)}><p>내용</p></Modal>
  </>
}

describe('겹쳐 열린 모달', () => {
  function Stacked({ onOuterClose, onInnerClose }: { onOuterClose: () => void; onInnerClose: () => void }) {
    const [outer, setOuter] = useState(true)
    const [inner, setInner] = useState(false)
    return <>
      <Modal open={outer} title="바깥" onClose={() => { onOuterClose(); setOuter(false) }}>
        <button type="button" onClick={() => setInner(true)}>안쪽 열기</button>
        <Modal open={inner} title="안쪽" onClose={() => { onInnerClose(); setInner(false) }}>
          <input aria-label="안쪽 입력" />
        </Modal>
      </Modal>
    </>
  }

  it('Esc는 맨 위 모달만 닫고 아래 모달은 그대로 둔다', async () => {
    const onOuterClose = vi.fn()
    const onInnerClose = vi.fn()
    render(<Stacked onOuterClose={onOuterClose} onInnerClose={onInnerClose} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('안쪽 열기'))
    await user.keyboard('{Escape}')

    expect(onInnerClose).toHaveBeenCalledTimes(1)
    expect(onOuterClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '바깥' })).toBeInTheDocument()
  })

  it('안쪽 모달이 닫히면 Esc가 다시 바깥 모달을 닫는다', async () => {
    const onOuterClose = vi.fn()
    render(<Stacked onOuterClose={onOuterClose} onInnerClose={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('안쪽 열기'))
    await user.keyboard('{Escape}')
    await user.keyboard('{Escape}')

    expect(onOuterClose).toHaveBeenCalledTimes(1)
  })

  it('안쪽 모달 안에서 Tab을 눌러도 포커스를 바깥 모달로 끌어가지 않는다', async () => {
    render(<Stacked onOuterClose={vi.fn()} onInnerClose={vi.fn()} />)
    const user = userEvent.setup()

    await user.click(screen.getByText('안쪽 열기'))
    const dialog = screen.getByRole('dialog', { name: '안쪽' })
    await user.click(within(dialog).getByLabelText('안쪽 입력'))
    await user.tab()

    expect(dialog.contains(document.activeElement)).toBe(true)
  })
})
