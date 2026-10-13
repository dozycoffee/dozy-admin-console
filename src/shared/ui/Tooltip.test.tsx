import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Tooltip } from './Tooltip'

describe('Tooltip', () => {
  it('안내 문구가 없으면 children만 렌더링한다', () => {
    const { container } = render(<Tooltip content={null}><button type="button">부여</button></Tooltip>)

    expect(container.querySelector('.tooltip-anchor')).toBeNull()
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument()
  })

  it('처음에는 숨겨져 있고 호버하면 보인다', async () => {
    const user = userEvent.setup()
    render(<Tooltip content="권한이 없습니다."><button type="button" disabled>부여</button></Tooltip>)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('button', { name: '부여' }).parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('권한이 없습니다.')

    await user.unhover(screen.getByRole('tooltip').parentElement!)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('키보드로 포커스하면 보이고 Esc로 닫힌다', async () => {
    const user = userEvent.setup()
    render(<Tooltip content="권한이 없습니다."><button type="button" disabled>부여</button></Tooltip>)

    await user.tab()
    expect(screen.getByRole('tooltip')).toBeVisible()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  it('래퍼가 문구를 aria-describedby로 연결한다', () => {
    render(<Tooltip content="권한이 없습니다."><button type="button" disabled>부여</button></Tooltip>)

    const anchor = screen.getByRole('button', { name: '부여' }).parentElement!
    expect(anchor).toHaveAccessibleDescription('권한이 없습니다.')
  })
})
