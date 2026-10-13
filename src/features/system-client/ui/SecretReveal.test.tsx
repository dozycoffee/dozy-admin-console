import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../../shared/ui/toastContext'
import { SecretReveal } from './SecretReveal'

const notify = vi.fn()
const renderReveal = (onClose = vi.fn()) => render(<ToastContext.Provider value={{ notify }}><SecretReveal secret={secret} onClose={onClose} /></ToastContext.Provider>)
const secret = { clientId: 'svc-store', clientSecret: 'Zr8qL2mX-secret' }

afterEach(() => { vi.restoreAllMocks(); notify.mockClear() })

describe('SecretReveal', () => {
  it('secret을 읽기 전용으로 보여주고 한 번만 볼 수 있다고 경고한다', () => {
    renderReveal()

    expect(screen.getByLabelText('클라이언트 secret')).toHaveValue('Zr8qL2mX-secret')
    expect(screen.getByLabelText('클라이언트 secret')).toHaveAttribute('readonly')
    expect(screen.getByText(/지금 한 번만 볼 수 있습니다/)).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'svc-store의 secret' })).toBeInTheDocument()
  })

  it('복사 버튼은 클립보드에 secret을 쓴다', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    renderReveal()

    await user.click(screen.getByRole('button', { name: '복사' }))

    expect(writeText).toHaveBeenCalledWith('Zr8qL2mX-secret')
    expect(notify).toHaveBeenCalledWith('클립보드에 복사했습니다.')
  })

  it('클립보드를 쓸 수 없으면 직접 복사하라고 안내한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    renderReveal()

    await user.click(screen.getByRole('button', { name: '복사' }))

    expect(await screen.findByText(/직접 선택해 복사하세요/)).toBeInTheDocument()
  })

  it('저장했다고 확인해야 닫을 수 있다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderReveal(onClose)
    const close = screen.getByRole('button', { name: '닫기' })
    expect(close).toBeDisabled()

    await user.click(screen.getByLabelText('secret을 안전한 곳에 저장했습니다'))
    await user.click(close)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('모달로 열리고 Esc나 닫기 버튼(×)으로는 닫히지 않는다', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    renderReveal(onClose)

    expect(screen.getByRole('dialog', { name: 'svc-store의 secret' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: '닫기' })).toHaveLength(1) // 아래의 "닫기" 버튼 하나뿐(×는 없다)
    await user.keyboard('{Escape}')

    expect(onClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })
})
