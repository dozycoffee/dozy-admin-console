import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useRegisterMaterial } from '../../features/material/model/useMaterials'
import { ApiError } from '../../shared/api/ApiError'
import { MaterialForm } from './MaterialForm'

vi.mock('../../features/material/model/useMaterials', () => ({ useRegisterMaterial: vi.fn() }))

const mutate = vi.fn()
const onDone = vi.fn()
const onCancel = vi.fn()

function setup(mutation: object = {}) {
  vi.mocked(useRegisterMaterial).mockReturnValue({ mutate, isPending: false, isError: false, ...mutation } as never)
  return render(<MaterialForm onDone={onDone} onCancel={onCancel} />)
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('원자재 코드'), ' bean-001 ')
  await user.type(screen.getByLabelText('이름'), '에티오피아 예가체프')
  await user.selectOptions(screen.getByLabelText('카테고리'), 'BEAN')
  await user.type(screen.getByLabelText('단위'), 'KG')
}

beforeEach(() => vi.clearAllMocks())

describe('MaterialForm', () => {
  it('입력을 정리해 등록 요청을 보내고 성공하면 onDone을 부른다', async () => {
    const user = userEvent.setup()
    mutate.mockImplementation((_body: unknown, options: { onSuccess: (created: unknown) => void }) => options.onSuccess({ productId: 9 }))
    setup()

    await fillValid(user)
    await user.type(screen.getByLabelText('유통기한 일수 (선택)'), '180')
    await user.click(screen.getByRole('button', { name: '원자재 등록' }))

    expect(mutate).toHaveBeenCalledWith({ productCode: 'BEAN-001', productName: '에티오피아 예가체프', category: 'BEAN', unit: 'KG', shelfLifeDays: 180 }, expect.anything())
    expect(onDone).toHaveBeenCalledWith({ productId: 9 })
  })

  it('유통기한 일수를 비우면 null로 보낸다', async () => {
    const user = userEvent.setup()
    setup()

    await fillValid(user)
    await user.click(screen.getByRole('button', { name: '원자재 등록' }))

    expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ shelfLifeDays: null }), expect.anything())
  })

  it('비어 있는 채로 제출하면 요청하지 않고 필드별 오류를 보여주며 첫 오류 필드에 포커스한다', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: '원자재 등록' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('원자재 코드를 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('이름을 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('카테고리를 선택해 주세요.')).toBeInTheDocument()
    expect(screen.getByText('단위를 입력해 주세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('원자재 코드')).toHaveFocus()
  })

  it('유통기한 일수가 음수이면 요청하지 않는다', async () => {
    const user = userEvent.setup()
    setup()

    await fillValid(user)
    await user.type(screen.getByLabelText('유통기한 일수 (선택)'), '-3')
    await user.click(screen.getByRole('button', { name: '원자재 등록' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByText('유통기한 일수는 0 이상의 정수여야 합니다.')).toBeInTheDocument()
  })

  it('코드가 중복이면 서버 오류 코드로 안내한다', () => {
    setup({ isError: true, error: new ApiError('conflict', { status: 409, code: 'INV_DUPLICATE_PRODUCT_CODE' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('이미 등록된 원자재 코드입니다.')
  })

  it('등록하는 동안 입력과 버튼을 잠근다', () => {
    setup({ isPending: true })

    expect(screen.getByRole('button', { name: '등록 중...' })).toBeDisabled()
    expect(screen.getByLabelText('원자재 코드')).toBeDisabled()
  })

  it('취소하면 onCancel을 부른다', async () => {
    const user = userEvent.setup()
    setup()

    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(onCancel).toHaveBeenCalled()
  })
})
