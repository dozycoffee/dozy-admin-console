import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useCreateAudience } from '../../features/role/model/useRoles'
import { AudiencePanel } from './AudiencePanel'

vi.mock('../../features/role/model/useRoles')

const audiences = [{ id: 1, code: 'wms', name: '창고 관리', description: null }, { id: 4, code: 'auth', name: '인증', description: null }]
const mutate = vi.fn()

function setup(canCreate: boolean, state: Record<string, unknown> = {}) {
  vi.mocked(useCreateAudience).mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...state } as never)
  render(<AudiencePanel audiences={audiences} canCreate={canCreate} />)
}

beforeEach(() => vi.clearAllMocks())

describe('AudiencePanel', () => {
  it('서비스 목록을 보여준다', () => {
    setup(false)

    expect(screen.getByText('창고 관리')).toBeInTheDocument()
    expect(screen.getByText('2개')).toBeInTheDocument()
  })

  it('owner가 아니면 추가 폼 대신 안내만 보여준다', () => {
    setup(false)

    expect(screen.queryByRole('form', { name: '서비스 추가' })).not.toBeInTheDocument()
    expect(screen.getByText('서비스 추가는 owner만 할 수 있습니다.')).toBeInTheDocument()
  })

  it('owner는 올바른 code와 이름으로 서비스를 추가한다', async () => {
    setup(true)
    mutate.mockImplementation((_body, options) => options.onSuccess())
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '서비스 추가' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('code'), 'Order!')
    await user.type(screen.getByLabelText('이름'), '주문')
    expect(submit).toBeDisabled()
    await user.clear(screen.getByLabelText('code'))
    await user.type(screen.getByLabelText('code'), 'order')
    await user.click(submit)
    expect(mutate).not.toHaveBeenCalled() // 바로 추가하지 않고 확인 모달을 먼저 띄운다
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '추가' }))

    expect(mutate.mock.calls[0][0]).toEqual({ code: 'order', name: '주문' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByLabelText('code')).toHaveValue('')
  })

  it('추가하기 전에 삭제할 수 없고 code도 바꿀 수 없다는 경고를 모달로 보여준다', async () => {
    setup(true)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('code'), 'order')
    await user.type(screen.getByLabelText('이름'), '주문')

    await user.click(screen.getByRole('button', { name: '서비스 추가' }))

    const dialog = screen.getByRole('dialog', { name: '"주문" 서비스를 추가할까요?' })
    expect(dialog).toHaveTextContent('삭제할 수 없고 code(order)도 바꿀 수 없습니다')
  })

  it('경고 모달에서 취소하면 추가하지 않고 입력을 그대로 둔다', async () => {
    setup(true)
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('code'), 'order')
    await user.type(screen.getByLabelText('이름'), '주문')
    await user.click(screen.getByRole('button', { name: '서비스 추가' }))

    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByLabelText('code')).toHaveValue('order')
    expect(screen.getByLabelText('이름')).toHaveValue('주문')
  })

  it('중복 code 에러를 안내한다', () => {
    setup(true, { isError: true, error: new ApiError('dup', { status: 409, code: 'AUDIENCE_CODE_DUPLICATED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('이미 있는 서비스 code입니다.')
  })

  it('code 규칙과 삭제 불가 안내는 code 옆 배지의 툴팁으로 보여준다', async () => {
    setup(true)
    const user = userEvent.setup()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument() // 평소에는 안내 문장이 보이지 않는다

    await user.hover(screen.getByRole('img', { name: 'code 입력 규칙' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('등록한 뒤에는 바꿀 수 없고, 서비스는 삭제할 수 없습니다.')
  })

  it('code가 규칙에 맞지 않을 때만 입력칸 아래에 규칙을 보여준다', async () => {
    setup(true)
    const user = userEvent.setup()
    expect(screen.queryByText(/영문 소문자로 시작/, { selector: 'p' })).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('code'), 'Order!')

    expect(screen.getByText('code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있습니다.', { selector: 'p' })).toBeInTheDocument()
  })
})
