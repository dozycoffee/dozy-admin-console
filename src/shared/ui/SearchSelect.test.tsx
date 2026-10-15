import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { SearchSelect, type SearchSelectOption } from './SearchSelect'

const options: SearchSelectOption[] = [
  { value: '100', label: '에티오피아 원두 (BEAN-1)' },
  { value: '200', label: '바닐라 시럽 (SYR-1)' },
  { value: '300', label: '흰 우유 (MLK-1)' },
]

function Harness({ initial = '', onChange = vi.fn(), maxVisible }: { initial?: string; onChange?: (value: string) => void; maxVisible?: number }) {
  const [value, setValue] = useState(initial)
  return <SearchSelect label="상품" options={options} value={value} maxVisible={maxVisible} onChange={(next) => { setValue(next); onChange(next) }} />
}

describe('SearchSelect', () => {
  it('포커스하면 전체 항목을 보여주고 아무것도 고르지 않은 상태는 비어 있다', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('')
    await user.click(screen.getByRole('combobox', { name: '상품' }))

    expect(screen.getAllByRole('option')).toHaveLength(3)
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('입력한 글자가 이름이나 코드에 들어 있는 항목만 대소문자 구분 없이 보여준다', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('combobox', { name: '상품' }), 'syr')

    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['바닐라 시럽 (SYR-1)'])
    await user.clear(screen.getByRole('combobox', { name: '상품' }))
    await user.type(screen.getByRole('combobox', { name: '상품' }), '우유')
    expect(screen.getAllByRole('option').map((option) => option.textContent)).toEqual(['흰 우유 (MLK-1)'])
  })

  it('일치하는 항목이 없으면 안내한다', async () => {
    const user = userEvent.setup()
    render(<Harness />)

    await user.type(screen.getByRole('combobox', { name: '상품' }), 'zzz')

    expect(screen.queryByRole('option')).not.toBeInTheDocument()
    expect(screen.getByText('일치하는 항목이 없습니다.')).toBeInTheDocument()
  })

  it('항목을 고르면 값을 바꾸고 입력칸에 이름을 보여주며 목록을 닫는다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)

    await user.type(screen.getByRole('combobox', { name: '상품' }), '원두')
    await user.click(screen.getByRole('option', { name: '에티오피아 원두 (BEAN-1)' }))

    expect(onChange).toHaveBeenCalledWith('100')
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('에티오피아 원두 (BEAN-1)')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  it('처음부터 고른 값이 있으면 그 이름을 보여주고 선택 표시를 한다', async () => {
    const user = userEvent.setup()
    render(<Harness initial="200" />)

    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('바닐라 시럽 (SYR-1)')
    await user.click(screen.getByRole('combobox', { name: '상품' }))

    expect(screen.getByRole('option', { name: '바닐라 시럽 (SYR-1)' })).toHaveAttribute('aria-selected', 'true')
  })

  it('×를 누르면 선택을 비우고 입력칸에 포커스를 돌려준다', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<Harness initial="200" onChange={onChange} />)

    await user.click(screen.getByRole('button', { name: '상품 선택 지우기' }))

    expect(onChange).toHaveBeenCalledWith('')
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('')
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveFocus()
    expect(screen.queryByRole('button', { name: '상품 선택 지우기' })).not.toBeInTheDocument()
  })

  it('고르지 않고 입력칸을 벗어나면 입력한 글자를 버리고 원래 선택으로 돌아간다', async () => {
    const user = userEvent.setup()
    render(<><Harness initial="200" /><button type="button">다음</button></>)

    await user.type(screen.getByRole('combobox', { name: '상품' }), 'x')
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('바닐라 시럽 (SYR-1)')
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
  })

  describe('키보드', () => {
    it('↓ ↑로 항목을 옮기고 Enter로 고르며 Enter가 폼 제출로 번지지 않는다', async () => {
      const user = userEvent.setup()
      const onChange = vi.fn()
      const onSubmit = vi.fn((event: { preventDefault: () => void }) => event.preventDefault())
      render(<form onSubmit={onSubmit}><Harness onChange={onChange} /></form>)

      await user.click(screen.getByRole('combobox', { name: '상품' }))
      await user.keyboard('{ArrowDown}{ArrowDown}')
      expect(screen.getByRole('option', { name: '흰 우유 (MLK-1)' })).toHaveClass('active')
      await user.keyboard('{ArrowUp}{Enter}')

      expect(onChange).toHaveBeenCalledWith('200')
      expect(onSubmit).not.toHaveBeenCalled()
    })

    it('Esc로 목록을 닫고 입력한 글자를 버린다', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      await user.type(screen.getByRole('combobox', { name: '상품' }), '원')
      await user.keyboard('{Escape}')

      expect(screen.queryByRole('listbox')).not.toBeInTheDocument()
      expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('')
    })

    it('목록이 닫혀 있을 때 ↓는 목록을 연다', async () => {
      const user = userEvent.setup()
      render(<Harness />)

      screen.getByRole('combobox', { name: '상품' }).focus()
      await user.keyboard('{Escape}{ArrowDown}')

      expect(screen.getByRole('listbox')).toBeInTheDocument()
    })
  })

  it('보여줄 수 있는 수를 넘으면 나머지 개수를 알리고 더 입력하라고 안내한다', async () => {
    const user = userEvent.setup()
    render(<Harness maxVisible={2} />)

    await user.click(screen.getByRole('combobox', { name: '상품' }))

    expect(screen.getAllByRole('option')).toHaveLength(2)
    expect(screen.getByText('1개가 더 있습니다. 더 입력해 좁혀 주세요.')).toBeInTheDocument()
  })
})
