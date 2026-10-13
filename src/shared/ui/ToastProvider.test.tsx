import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TOAST_DURATION_MS, ToastProvider } from './ToastProvider'
import { useToast } from './toastContext'

function Trigger({ message = '저장했습니다.' }: { message?: string }) {
  const { notify } = useToast()
  return <button type="button" onClick={() => notify(message)}>알림</button>
}

function setup(message?: string) {
  return render(<section data-testid="page"><ToastProvider><Trigger message={message} /></ToastProvider></section>)
}

describe('ToastProvider', () => {
  beforeEach(() => { vi.useFakeTimers({ shouldAdvanceTime: true }) })
  afterEach(() => { vi.useRealTimers() })

  it('처음에는 아무것도 보이지 않는다', () => {
    setup()

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('알리면 상태 안내를 화면 위에 보여주고 body에 그린다', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    await user.click(screen.getByRole('button', { name: '알림' }))

    const toast = screen.getByRole('status')
    expect(toast).toHaveTextContent('저장했습니다.')
    expect(toast.parentElement).toBe(document.body)
    expect(screen.getByTestId('page')).not.toContainElement(toast)
  })

  it('× 버튼으로 먼저 닫을 수 있다', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole('button', { name: '알림' }))

    await user.click(screen.getByRole('button', { name: '안내 닫기' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('일정 시간이 지나면 저절로 사라진다', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole('button', { name: '알림' }))

    await act(async () => { vi.advanceTimersByTime(TOAST_DURATION_MS - 1000) })
    expect(screen.getByRole('status')).toBeInTheDocument()
    await act(async () => { vi.advanceTimersByTime(1500) })

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('이미 떠 있을 때 다시 알리면 하나만 보여주고 닫히는 시간을 다시 센다', async () => {
    setup()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    await user.click(screen.getByRole('button', { name: '알림' }))
    await act(async () => { vi.advanceTimersByTime(TOAST_DURATION_MS - 1000) })

    await user.click(screen.getByRole('button', { name: '알림' }))
    await act(async () => { vi.advanceTimersByTime(TOAST_DURATION_MS - 1000) })

    expect(screen.getAllByRole('status')).toHaveLength(1)
    await act(async () => { vi.advanceTimersByTime(1500) })
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('Provider 밖에서 알려도 오류 없이 아무 일도 일어나지 않는다', async () => {
    render(<Trigger />)

    await userEvent.setup().click(screen.getByRole('button', { name: '알림' }))

    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('error 종류는 경고 알림(role=alert)으로 보여준다', async () => {
    function ErrorTrigger() {
      const { notify } = useToast()
      return <button type="button" onClick={() => notify('복사하지 못했습니다.', 'error')}>실패</button>
    }
    render(<ToastProvider><ErrorTrigger /></ToastProvider>)

    await userEvent.setup({ advanceTimers: vi.advanceTimersByTime }).click(screen.getByRole('button', { name: '실패' }))

    expect(screen.getByRole('alert')).toHaveTextContent('복사하지 못했습니다.')
    expect(screen.getByRole('alert')).toHaveClass('toast', 'error')
  })
})
