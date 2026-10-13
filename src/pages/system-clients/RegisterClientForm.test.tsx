import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useRoles } from '../../features/role/model/useRoles'
import { useRegisterSystemClient } from '../../features/system-client/model/useSystemClients'
import { RegisterClientForm } from './RegisterClientForm'

vi.mock('../../features/role/model/useRoles')
vi.mock('../../features/system-client/model/useSystemClients')

const roles = [
  { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 },
  { id: 2, audience: 'auth', code: 'admin', fullCode: 'auth:admin', name: 'Admin', description: null, isSystem: true, grantedCount: 0 },
  { id: 11, audience: 'auth', code: 'partner_reader', fullCode: 'auth:partner_reader', name: '파트너 조회', description: null, isSystem: false, grantedCount: 0 },
]
const mutate = vi.fn()
const reset = vi.fn()

function setup(state: Record<string, unknown> = {}, writable = true) {
  vi.mocked(useRoles).mockReturnValue({ isLoading: false, isError: false, data: roles } as never)
  vi.mocked(useRegisterSystemClient).mockReturnValue({ mutate, reset, isPending: false, isError: false, ...state } as never)
  const onRegistered = vi.fn()
  render(<RegisterClientForm writable={writable} onRegistered={onRegistered} />)
  return onRegistered
}

beforeEach(() => vi.clearAllMocks())

describe('RegisterClientForm', () => {
  it('system role은 선택지에서 빼고 일반 role만 보여준다', () => {
    setup()

    expect(screen.getByLabelText(/파트너 조회/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Admin/)).not.toBeInTheDocument()
  })

  it('올바른 clientId와 이름이 있어야 등록할 수 있다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '시스템 클라이언트 등록' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('clientId'), 'store')
    await user.type(screen.getByLabelText('이름'), 'Store 서비스')
    expect(submit).toBeDisabled()
    expect(screen.getByLabelText('clientId')).toHaveAttribute('aria-invalid', 'true')

    await user.clear(screen.getByLabelText('clientId'))
    await user.type(screen.getByLabelText('clientId'), 'svc-store')
    expect(submit).toBeEnabled()
  })

  it('입력한 값과 선택한 role로 등록하고, role을 고르지 않으면 roles를 보내지 않는다', async () => {
    setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('clientId'), 'svc-store')
    await user.type(screen.getByLabelText('이름'), ' Store 서비스 ')
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))
    expect(mutate.mock.calls[0][0]).toEqual({ clientId: 'svc-store', name: 'Store 서비스' })

    await user.click(screen.getByLabelText(/파트너 조회/))
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))
    expect(mutate.mock.calls[1][0]).toEqual({ clientId: 'svc-store', name: 'Store 서비스', roles: ['auth:partner_reader'] })
  })

  it('성공하면 입력을 비우고 secret을 한 번 넘긴 뒤 mutation 상태를 지운다', async () => {
    const onRegistered = setup()
    mutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-1', clientId: 'svc-store', clientSecret: 'Zr8qL2mX' }))
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('clientId'), 'svc-store')
    await user.type(screen.getByLabelText('이름'), 'Store 서비스')
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))

    expect(onRegistered).toHaveBeenCalledWith({ clientId: 'svc-store', clientSecret: 'Zr8qL2mX' })
    expect(reset).toHaveBeenCalled()
    expect(screen.getByLabelText('clientId')).toHaveValue('')
  })

  it('중복 clientId 에러를 안내한다', () => {
    setup({ isError: true, error: new ApiError('dup', { status: 409, code: 'CLIENT_ID_DUPLICATED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('이미 사용 중인 clientId입니다.')
  })

  it('쓰기 권한이 없으면 입력과 버튼이 비활성이다', () => {
    setup({}, false)

    expect(screen.getByLabelText('clientId')).toBeDisabled()
    expect(screen.getByRole('button', { name: '시스템 클라이언트 등록' })).toBeDisabled()
  })
})
