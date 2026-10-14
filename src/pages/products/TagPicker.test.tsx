import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { Tag } from '../../features/catalog/model/catalogSchemas'
import { TagPicker } from './TagPicker'

const tags: Tag[] = [{ id: 1, name: '신메뉴' }, { id: 2, name: '베스트' }, { id: 3, name: '시즌한정' }]
const onSubmit = vi.fn()

function Harness({ initial = [], existing = tags }: { initial?: string[]; existing?: Tag[] }) {
  const [selected, setSelected] = useState<string[]>(initial)
  return <form onSubmit={(event) => { event.preventDefault(); onSubmit() }}>
    <TagPicker tags={existing} selected={selected} onChange={setSelected} disabled={false} />
    <output aria-label="고른 태그">{selected.join('|')}</output>
  </form>
}
const picked = () => screen.getByLabelText('고른 태그').textContent

describe('TagPicker', () => {
  it('기존 태그를 칩으로 보여 주고 눌러서 고르고 다시 눌러 해제한다', async () => {
    render(<Harness />)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '베스트' }))
    expect(screen.getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'true')
    expect(picked()).toBe('베스트')

    await user.click(screen.getByRole('button', { name: '베스트' }))
    expect(screen.getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'false')
    expect(picked()).toBe('')
  })

  it('입력하면 기존 태그 목록이 걸러진다', async () => {
    render(<Harness />)

    await userEvent.setup().type(screen.getByLabelText('태그 이름 입력'), '시즌')

    expect(screen.getByRole('button', { name: '시즌한정' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '베스트' })).not.toBeInTheDocument()
  })

  it('걸러도 이미 고른 기존 태그는 계속 보인다', async () => {
    render(<Harness initial={['베스트']} />)

    await userEvent.setup().type(screen.getByLabelText('태그 이름 입력'), '시즌')

    expect(screen.getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '시즌한정' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '신메뉴' })).not.toBeInTheDocument()
  })

  it('걸러진 결과가 없으면 일치하는 기존 태그가 없다고 알려 준다', async () => {
    render(<Harness />)

    await userEvent.setup().type(screen.getByLabelText('태그 이름 입력'), '말차')

    expect(screen.getByText(/"말차"와 일치하는 기존 태그가 없습니다/)).toBeInTheDocument()
  })

  it('없는 이름은 Enter로 새 태그가 되고 폼은 제출되지 않는다', async () => {
    onSubmit.mockClear()
    render(<Harness />)
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('태그 이름 입력'), ' 말차 {Enter}')

    expect(picked()).toBe('말차')
    const created = screen.getByRole('group', { name: '새로 만들 태그' })
    expect(within(created).getByText('새 태그')).toBeInTheDocument()
    expect(screen.getByLabelText('태그 이름 입력')).toHaveValue('')
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('추가 버튼으로도 더하고 입력이 비면 막혀 있다', async () => {
    render(<Harness />)
    const user = userEvent.setup()

    expect(screen.getByRole('button', { name: '추가' })).toBeDisabled()
    await user.type(screen.getByLabelText('태그 이름 입력'), '말차')
    await user.click(screen.getByRole('button', { name: '추가' }))

    expect(picked()).toBe('말차')
  })

  it('기존 태그와 같은 이름을 입력하면 새 태그를 만들지 않고 그 태그를 고른다', async () => {
    render(<Harness />)

    await userEvent.setup().type(screen.getByLabelText('태그 이름 입력'), '베스트{Enter}')

    expect(picked()).toBe('베스트')
    expect(screen.getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.queryByRole('group', { name: '새로 만들 태그' })).not.toBeInTheDocument()
  })

  it('같은 이름을 두 번 입력해도 한 번만 담긴다', async () => {
    render(<Harness />)

    await userEvent.setup().type(screen.getByLabelText('태그 이름 입력'), '말차{Enter}말차{Enter}')

    expect(picked()).toBe('말차')
  })

  it('새 태그는 × 로 제거한다', async () => {
    render(<Harness initial={['말차']} />)

    await userEvent.setup().click(screen.getByRole('button', { name: '말차 태그 제거' }))

    expect(picked()).toBe('')
    expect(screen.queryByRole('group', { name: '새로 만들 태그' })).not.toBeInTheDocument()
  })

  it('수정할 때 이미 붙은 태그는 눌린 상태로 시작한다', () => {
    render(<Harness initial={['신메뉴', '베스트']} />)

    expect(screen.getByRole('button', { name: '신메뉴' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '시즌한정' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('기존 태그가 하나도 없으면 입력하면 새로 만들어진다고 안내한다', () => {
    render(<Harness existing={[]} />)

    expect(screen.getByText(/등록된 태그가 아직 없습니다/)).toBeInTheDocument()
  })
})
