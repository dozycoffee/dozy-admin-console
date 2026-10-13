import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useCreateRole } from '../../features/role/model/useRoles'
import { RoleCreateForm } from './RoleCreateForm'

vi.mock('../../features/role/model/useRoles')

const audiences = [{ id: 1, code: 'wms', name: '창고 관리', description: null }, { id: 4, code: 'auth', name: '인증', description: null }]
const mutate = vi.fn()

function setup(state: Record<string, unknown> = {}, writable = true) {
  vi.mocked(useCreateRole).mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...state } as never)
  render(<RoleCreateForm audiences={audiences} writable={writable} />)
}

beforeEach(() => vi.clearAllMocks())


describe('RoleCreateForm', () => {
  it('서비스·code·이름이 모두 올바르기 전에는 등록할 수 없다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: 'role 등록' })
    expect(submit).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('서비스'), 'wms')
    await user.type(screen.getByLabelText('code'), 'Bad Code')
    await user.type(screen.getByLabelText('이름'), '창고 관리자')
    expect(submit).toBeDisabled()
    expect(screen.getByLabelText('code')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('code'))
    await user.type(screen.getByLabelText('code'), 'warehouse_manager')
    expect(submit).toBeEnabled()
  })

  it('입력한 값으로 등록하고 비어 있는 설명은 보내지 않는다', async () => {
    setup()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('서비스'), 'wms')
    await user.type(screen.getByLabelText('code'), 'warehouse_manager')
    await user.type(screen.getByLabelText('이름'), ' 창고 관리자 ')
    await user.click(screen.getByRole('button', { name: 'role 등록' }))

    expect(mutate.mock.calls[0][0]).toEqual({ audience: 'wms', code: 'warehouse_manager', name: '창고 관리자' })
  })

  it('설명을 입력하면 함께 보내고, 성공하면 입력을 비운다', async () => {
    setup()
    mutate.mockImplementation((_body, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('서비스'), 'auth')
    await user.type(screen.getByLabelText('code'), 'partner_reader')
    await user.type(screen.getByLabelText('이름'), '파트너 조회')
    await user.type(screen.getByLabelText('설명 (선택)'), '파트너 조회 권한')
    await user.click(screen.getByRole('button', { name: 'role 등록' }))

    expect(mutate.mock.calls[0][0]).toEqual({ audience: 'auth', code: 'partner_reader', name: '파트너 조회', description: '파트너 조회 권한' })
    expect(screen.getByLabelText('code')).toHaveValue('')
    expect(screen.getByLabelText('이름')).toHaveValue('')
  })

  it('중복 code 에러를 안내한다', () => {
    setup({ isError: true, error: new ApiError('dup', { status: 409, code: 'ROLE_CODE_DUPLICATED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('같은 서비스에 이미 있는 role code입니다.')
  })

  it('쓰기 권한이 없으면 입력과 버튼이 비활성이다', () => {
    setup({}, false)

    expect(screen.getByLabelText('code')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'role 등록' })).toBeDisabled()
  })

  it('code 규칙은 항상 보이는 문장 대신 code 옆 배지의 툴팁으로 안내한다', async () => {
    setup()
    const user = userEvent.setup()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument() // 평소에는 규칙 문장이 보이지 않는다
    expect(document.querySelector('p.employee-hint')).toBeNull()

    await user.hover(screen.getByRole('img', { name: 'code 입력 규칙' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있습니다. 등록한 뒤에는 code와 서비스를 바꿀 수 없습니다.')
  })

  it('code가 규칙에 맞지 않으면 입력칸 아래에 규칙을 보여주고 고치면 사라진다', async () => {
    setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('code'), 'Bad Code')
    expect(screen.getByText('code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있습니다.', { selector: 'p' })).toBeInTheDocument()

    await user.clear(screen.getByLabelText('code'))
    await user.type(screen.getByLabelText('code'), 'good_code')
    expect(screen.queryByText('code는 영문 소문자로 시작하고 소문자·숫자·밑줄(_)만 쓸 수 있습니다.', { selector: 'p' })).not.toBeInTheDocument()
  })
})
