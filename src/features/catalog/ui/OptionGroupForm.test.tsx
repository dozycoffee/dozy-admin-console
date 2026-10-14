import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import type { OptionGroup } from '../model/catalogSchemas'
import { useCreateOptionGroup, useReplaceOptions, useUpdateOptionGroup } from '../model/useOptionGroupMutations'
import { OptionGroupForm } from './OptionGroupForm'

vi.mock('../model/useOptionGroupMutations')

const existing: OptionGroup = {
  id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, version: 2,
  options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 700 }],
}
const created = vi.fn()
const replaced = vi.fn()
const updated = vi.fn()
const onDone = vi.fn()
const onCancel = vi.fn()
const onConflict = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  created.mockResolvedValue({ ...existing, id: 9 })
  replaced.mockResolvedValue({ ...existing, version: 3 })
  updated.mockResolvedValue({ ...existing, version: 4 })
  vi.mocked(useCreateOptionGroup).mockReturnValue({ mutateAsync: created } as never)
  vi.mocked(useReplaceOptions).mockReturnValue({ mutateAsync: replaced } as never)
  vi.mocked(useUpdateOptionGroup).mockReturnValue({ mutateAsync: updated } as never)
})

const renderCreate = () => render(<OptionGroupForm onDone={onDone} onCancel={onCancel} onConflict={onConflict} />)
const renderEdit = () => render(<OptionGroupForm group={existing} onDone={onDone} onCancel={onCancel} onConflict={onConflict} />)
const save = (name = '저장') => userEvent.setup().click(screen.getByRole('button', { name }))

describe('OptionGroupForm 등록', () => {
  it('옵션 한 줄이 비어 있는 채로 시작하고 입력을 정리해 등록 요청으로 보낸다', async () => {
    renderCreate()
    const user = userEvent.setup()

    expect(screen.getByRole('group', { name: '옵션 1' })).toBeInTheDocument()
    await user.type(screen.getByLabelText('이름'), ' 온도 ')
    await user.selectOptions(screen.getByLabelText('선택 방식'), '복수 선택')
    await user.click(screen.getByLabelText('필수 선택'))
    await user.type(screen.getByLabelText('옵션 1 키'), ' HOT ')
    await user.type(screen.getByLabelText('옵션 1 이름'), '따뜻하게')
    await user.click(screen.getByRole('button', { name: '옵션 추가' }))
    await user.type(screen.getByLabelText('옵션 2 키'), 'ICE')
    await user.type(screen.getByLabelText('옵션 2 이름'), '차갑게')
    await user.clear(screen.getByLabelText('옵션 2 가격'))
    await user.type(screen.getByLabelText('옵션 2 가격'), '500')
    await user.click(screen.getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(created).toHaveBeenCalledWith({
      name: '온도', selectionType: 'MULTI', required: false,
      options: [{ optionKey: 'HOT', name: '따뜻하게', price: 0 }, { optionKey: 'ICE', name: '차갑게', price: 500 }],
    })
    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ id: 9 }))
  })

  it('필수 입력이 비면 요청하지 않고 필드 아래에 안내하며 이름으로 포커스를 옮긴다', async () => {
    renderCreate()

    await save('옵션 그룹 등록하기')

    expect(created).not.toHaveBeenCalled()
    expect(screen.getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('옵션 키를 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('옵션 이름을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveFocus()
    expect(screen.getByLabelText('이름')).toHaveAttribute('aria-invalid', 'true')
  })

  it('입력 중에는 오류를 띄우지 않고 칸을 벗어나면 보여준다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('옵션 1 가격'))
    await user.type(screen.getByLabelText('옵션 1 가격'), '-5')
    expect(screen.queryByText('0 이상의 정수로 입력하세요.')).not.toBeInTheDocument()
    await user.tab()

    expect(screen.getByText('0 이상의 정수로 입력하세요.')).toBeInTheDocument()
  })

  it('옵션 키가 겹치면 요청하지 않는다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이름'), '사이즈')
    await user.type(screen.getByLabelText('옵션 1 키'), 'LARGE')
    await user.type(screen.getByLabelText('옵션 1 이름'), '라지')
    await user.click(screen.getByRole('button', { name: '옵션 추가' }))
    await user.type(screen.getByLabelText('옵션 2 키'), 'LARGE')
    await user.type(screen.getByLabelText('옵션 2 이름'), '엑스라지')
    await user.click(screen.getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(created).not.toHaveBeenCalled()
    expect(screen.getAllByText('옵션 키가 겹칩니다.')).toHaveLength(2)
  })

  it('옵션을 모두 지우면 하나 이상 추가하라고 안내한다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '옵션 1 삭제' }))
    await user.click(screen.getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(screen.getAllByText('옵션을 하나 이상 추가하세요.').length).toBeGreaterThan(0)
    expect(created).not.toHaveBeenCalled()
  })

  it('옵션 순서를 위아래로 바꾸고 맨 위·맨 아래 버튼은 막힌다', async () => {
    renderCreate()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('이름'), '사이즈')
    await user.type(screen.getByLabelText('옵션 1 키'), 'A')
    await user.type(screen.getByLabelText('옵션 1 이름'), '가')
    await user.click(screen.getByRole('button', { name: '옵션 추가' }))
    await user.type(screen.getByLabelText('옵션 2 키'), 'B')
    await user.type(screen.getByLabelText('옵션 2 이름'), '나')

    expect(screen.getByRole('button', { name: '옵션 1 위로' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '옵션 2 아래로' })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: '옵션 2 위로' }))
    await user.click(screen.getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(created).toHaveBeenCalledWith(expect.objectContaining({ options: [expect.objectContaining({ optionKey: 'B' }), expect.objectContaining({ optionKey: 'A' })] }))
  })

  it('옵션 키를 바꿀 수 없게 되는 점을 미리 안내한다', () => {
    renderCreate()

    expect(screen.getByText(/저장한 뒤에는 바꿀 수 없으니 신중히 정하세요/)).toBeInTheDocument()
  })

  it('서버 오류는 code별 안내로 폼 안에 보여주고 닫지 않는다', async () => {
    created.mockRejectedValue(new ApiError('x', { status: 400, code: 'DUPLICATE_OPTION_KEY' }))
    renderCreate()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('이름'), '사이즈')
    await user.type(screen.getByLabelText('옵션 1 키'), 'A')
    await user.type(screen.getByLabelText('옵션 1 이름'), '가')
    await user.click(screen.getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('옵션 키가 겹칩니다.')
    expect(onDone).not.toHaveBeenCalled()
  })
})

describe('OptionGroupForm 수정', () => {
  it('현재 값을 채우고 저장된 옵션의 키는 읽기 전용이다', () => {
    renderEdit()

    expect(screen.getByLabelText('이름')).toHaveValue('사이즈')
    expect(screen.getByLabelText('옵션 2 키')).toHaveValue('LARGE')
    expect(screen.getByLabelText('옵션 2 키')).toHaveAttribute('readonly')
    expect(screen.getByLabelText('옵션 2 가격')).toHaveValue('700')
  })

  it('새로 추가한 옵션의 키는 입력할 수 있다', async () => {
    renderEdit()

    await userEvent.setup().click(screen.getByRole('button', { name: '옵션 추가' }))

    expect(screen.getByLabelText('옵션 3 키')).not.toHaveAttribute('readonly')
  })

  it('바뀐 게 없으면 요청 없이 닫는다', async () => {
    renderEdit()

    await save()

    expect(onCancel).toHaveBeenCalled()
    expect(replaced).not.toHaveBeenCalled()
    expect(updated).not.toHaveBeenCalled()
  })

  it('이름만 바꾸면 이름 변경만 요청하고 화면이 보던 버전을 보낸다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '크기')
    await save()

    expect(updated).toHaveBeenCalledWith({ id: 7, version: 2, body: { name: '크기', selectionType: 'SINGLE', required: true } })
    expect(replaced).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  it('옵션 가격만 바꾸면 옵션 교체만 요청한다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('옵션 2 가격'))
    await user.type(screen.getByLabelText('옵션 2 가격'), '900')
    await save()

    expect(replaced).toHaveBeenCalledWith({ id: 7, version: 2, options: [existing.options[0], { optionKey: 'LARGE', name: '라지', price: 900 }] })
    expect(updated).not.toHaveBeenCalled()
  })

  it('둘 다 바꾸면 옵션을 먼저 보내고 이름 변경에는 옵션 교체가 돌려준 새 버전을 쓴다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '크기')
    await user.clear(screen.getByLabelText('옵션 2 가격'))
    await user.type(screen.getByLabelText('옵션 2 가격'), '900')
    await save()

    expect(replaced).toHaveBeenCalledWith(expect.objectContaining({ version: 2 }))
    expect(updated).toHaveBeenCalledWith(expect.objectContaining({ version: 3 }))
    expect(replaced.mock.invocationCallOrder[0]).toBeLessThan(updated.mock.invocationCallOrder[0])
  })

  it('옵션 교체가 거부되면 이름도 바꾸지 않고 폼에 안내한다', async () => {
    replaced.mockRejectedValue(new ApiError('x', { status: 422, code: 'NO_SELECTABLE_OPTION' }))
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '크기')
    await user.clear(screen.getByLabelText('옵션 2 가격'))
    await user.type(screen.getByLabelText('옵션 2 가격'), '900')
    await save()

    expect(updated).not.toHaveBeenCalled()
    expect(await screen.findByRole('alert')).toHaveTextContent('선택할 수 있는 옵션이 하나도 없는 상품')
    expect(onDone).not.toHaveBeenCalled()
  })

  it('옵션을 빼면 확인을 거친 뒤에 저장하고 영향을 안내한다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '옵션 2 삭제' }))
    await save()

    expect(replaced).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: '옵션을 삭제할까요?' })
    expect(within(dialog).getByText(/삭제하는 옵션\(LARGE\)에 대해 .*예외가 함께 삭제되며/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '삭제하고 저장' }))

    expect(replaced).toHaveBeenCalledWith({ id: 7, version: 2, options: [existing.options[0]] })
  })

  it('옵션 삭제 확인에서 취소하면 저장하지 않는다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '옵션 2 삭제' }))
    await save()
    await user.click(within(screen.getByRole('dialog', { name: '옵션을 삭제할까요?' })).getByRole('button', { name: '취소' }))

    expect(replaced).not.toHaveBeenCalled()
  })

  it('옵션 키를 빼지 않고 이름·가격만 바꾸는 저장은 확인을 묻지 않는다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('옵션 1 이름'))
    await user.type(screen.getByLabelText('옵션 1 이름'), '기본')
    await save()

    expect(screen.queryByRole('dialog', { name: '옵션을 삭제할까요?' })).not.toBeInTheDocument()
    expect(replaced).toHaveBeenCalled()
  })

  it('버전 충돌(409 VERSION_CONFLICT)이면 폼에 오류를 쓰지 않고 충돌을 알려 화면이 처리하게 한다', async () => {
    updated.mockRejectedValue(new ApiError('x', { status: 409, code: 'VERSION_CONFLICT' }))
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '크기')
    await save()

    expect(onConflict).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })
})
