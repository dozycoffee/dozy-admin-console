import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { useRoles } from '../../role/model/useRoles'
import { useInviteEmployee } from '../model/useEmployees'
import { InviteEmployeeForm } from './InviteEmployeeForm'

vi.mock('../../role/model/useRoles')
vi.mock('../model/useEmployees')

const mockedUseRoles = vi.mocked(useRoles)
const mockedUseInviteEmployee = vi.mocked(useInviteEmployee)

const roles = [
  { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 },
  { id: 2, audience: 'auth', code: 'admin', fullCode: 'auth:admin', name: 'Admin', description: null, isSystem: true, grantedCount: 0 },
  { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 3 },
]

function setup(overrides: Partial<ReturnType<typeof useInviteEmployee>> = {}, rolesResult: Partial<ReturnType<typeof useRoles>> = { data: roles }) {
  const mutate = vi.fn()
  mockedUseRoles.mockReturnValue({ isLoading: false, isError: false, ...rolesResult } as never)
  mockedUseInviteEmployee.mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...overrides } as never)
  return mutate
}

describe('InviteEmployeeForm', () => {
  it('system role은 선택지에서 빼고 일반 role만 보여준다', () => {
    setup()

    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    expect(screen.getByLabelText(/창고 관리자/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Admin/)).not.toBeInTheDocument()
  })

  it('이메일과 이름이 올바르기 전에는 초대 버튼이 비활성이다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)
    const submit = screen.getByRole('button', { name: '초대 메일 보내기' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('이메일'), 'not-an-email')
    await user.type(screen.getByLabelText('이름'), '신입')
    expect(submit).toBeDisabled()

    await user.clear(screen.getByLabelText('이메일'))
    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    expect(submit).toBeEnabled()
  })

  it('입력한 값과 선택한 role로 초대하고, 비어 있는 선택 필드는 보내지 않는다', async () => {
    const mutate = setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), ' new@dozycoffee.com ')
    await user.type(screen.getByLabelText('이름'), '신입')
    await user.click(screen.getByLabelText(/창고 관리자/))
    await user.click(screen.getByRole('button', { name: '초대 메일 보내기' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({ email: 'new@dozycoffee.com', name: '신입', roles: ['wms:warehouse_manager'] })
  })

  it('role을 선택하지 않으면 roles를 보내지 않는다', async () => {
    const mutate = setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await user.type(screen.getByLabelText('전화번호 (선택)'), '010-1234-5678')
    await user.click(screen.getByRole('button', { name: '초대 메일 보내기' }))

    expect(mutate.mock.calls[0][0]).toEqual({ email: 'new@dozycoffee.com', name: '신입', phone: '010-1234-5678' })
  })

  it('초대에 성공하면 입력을 비우고 새 직원의 id를 알린다', async () => {
    const mutate = setup()
    mutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-9', status: 'PENDING', invitationExpiresAt: '2026-09-27T05:00:00Z' }))
    const onInvited = vi.fn()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={onInvited} />)

    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await user.click(screen.getByRole('button', { name: '초대 메일 보내기' }))

    expect(onInvited).toHaveBeenCalledWith('p-9')
    expect(screen.getByLabelText('이메일')).toHaveValue('')
    expect(screen.getByLabelText('이름')).toHaveValue('')
  })

  it('에러 code에 맞는 안내 문구를 보여준다', () => {
    setup({ isError: true, error: new ApiError('dup', { status: 409, code: 'DUPLICATE_EMAIL' }) } as never)

    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('이미 사용 중인 이메일입니다.')
  })

  it('성공하면 초대 만료 시각을 안내한다', () => {
    setup({ isSuccess: true, data: { principalId: 'p-9', status: 'PENDING', invitationExpiresAt: '2026-09-27T05:00:00Z' } } as never)

    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    expect(screen.getByRole('status')).toHaveTextContent('초대 메일을 보냈습니다.')
  })

  it('쓰기 권한이 없으면 모든 입력과 버튼이 비활성이다', () => {
    setup()

    render(<InviteEmployeeForm writable={false} onInvited={vi.fn()} />)

    expect(screen.getByLabelText('이메일')).toBeDisabled()
    expect(screen.getByRole('button', { name: '초대 메일 보내기' })).toBeDisabled()
  })

  it('부여할 수 있는 role이 없으면 안내 문구를 보여준다', () => {
    setup({}, { data: [roles[0]] })

    render(<InviteEmployeeForm writable onInvited={vi.fn()} />)

    expect(screen.getByText(/부여할 수 있는 role이 아직 없습니다/)).toBeInTheDocument()
  })
})
