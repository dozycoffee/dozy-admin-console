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
  it('audience·code·이름이 모두 올바르기 전에는 등록할 수 없다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: 'role 등록' })
    expect(submit).toBeDisabled()

    await user.selectOptions(screen.getByLabelText('audience'), 'wms')
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

    await user.selectOptions(screen.getByLabelText('audience'), 'wms')
    await user.type(screen.getByLabelText('code'), 'warehouse_manager')
    await user.type(screen.getByLabelText('이름'), ' 창고 관리자 ')
    await user.click(screen.getByRole('button', { name: 'role 등록' }))

    expect(mutate.mock.calls[0][0]).toEqual({ audience: 'wms', code: 'warehouse_manager', name: '창고 관리자' })
  })

  it('설명을 입력하면 함께 보내고, 성공하면 입력을 비운다', async () => {
    setup()
    mutate.mockImplementation((_body, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('audience'), 'auth')
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

    expect(screen.getByRole('alert')).toHaveTextContent('같은 audience에 이미 있는 role code입니다.')
  })

  it('쓰기 권한이 없으면 입력과 버튼이 비활성이다', () => {
    setup({}, false)

    expect(screen.getByLabelText('code')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'role 등록' })).toBeDisabled()
  })
})
