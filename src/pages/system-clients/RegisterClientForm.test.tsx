import { render, screen, within } from '@testing-library/react'
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
  const onCancel = vi.fn()
  render(<RegisterClientForm writable={writable} onRegistered={onRegistered} onCancel={onCancel} />)
  return Object.assign(onRegistered, { onCancel })
}

beforeEach(() => vi.clearAllMocks())

describe('RegisterClientForm', () => {
  it('system role은 선택지에서 빼고 일반 role만 보여준다', () => {
    setup()

    expect(screen.getByLabelText(/파트너 조회/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Admin/)).not.toBeInTheDocument()
  })

  it('clientId와 이름에 형식 예시를 플레이스홀더로 보여준다', () => {
    setup()

    expect(screen.getByLabelText('clientId')).toHaveAttribute('placeholder', 'svc-store')
    expect(screen.getByLabelText('이름')).toHaveAttribute('placeholder', 'Store 서비스')
  })

  it('입력하는 동안에는 오류를 띄우지 않고 필드를 벗어나면 이유를 보여주며 고치면 사라진다', async () => {
    setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('clientId'), 'store')
    expect(screen.getByLabelText('clientId')).not.toHaveAttribute('aria-invalid')
    await user.tab() // 배지 툴팁으로 포커스가 옮겨 가며 clientId를 벗어난다

    expect(screen.getByText(/svc-로 시작하는 소문자·숫자·하이픈 형식으로 입력하세요/)).toBeInTheDocument()
    expect(screen.getByLabelText('clientId')).toHaveAttribute('aria-invalid', 'true')
    await user.clear(screen.getByLabelText('clientId'))
    await user.type(screen.getByLabelText('clientId'), 'svc-store')
    expect(screen.queryByText(/svc-로 시작하는 소문자·숫자·하이픈 형식으로 입력하세요/)).not.toBeInTheDocument()
  })

  it('입력이 잘못된 채 등록을 누르면 요청하지 않고 틀린 필드에 오류와 포커스를 준다', async () => {
    setup()
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: '시스템 클라이언트 등록' })
    expect(submit).toBeEnabled() // 비활성으로 막지 않고 눌렀을 때 이유를 알려 준다

    await user.click(submit)

    expect(screen.getByText('clientId를 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('clientId')).toHaveFocus()
    expect(mutate).not.toHaveBeenCalled()
  })

  it('clientId 규칙은 라벨 옆 배지의 툴팁으로 안내한다', async () => {
    setup()
    const user = userEvent.setup()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('img', { name: 'clientId 입력 규칙' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('svc-로 시작하는 소문자·숫자·하이픈 형식입니다. (예: svc-store, svc-store-sync) 등록한 뒤에는 바꿀 수 없습니다.')
  })

  it('오류 문구 자리는 오류가 없을 때도 비워 두어 레이아웃이 변하지 않는다', async () => {
    setup()
    const slots = () => [...document.querySelectorAll('.field-error')].map((slot) => slot.textContent)
    expect(slots()).toEqual(['', ''])

    await userEvent.setup().click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))

    expect(slots()).toEqual(['clientId를 입력하세요.', '이름을 입력하세요.'])
  })

  it('role은 서비스별 그룹 아래에 묶어서 보여준다', () => {
    setup()

    const group = screen.getByRole('group', { name: 'AUTH role' })
    expect(within(group).getByLabelText(/파트너 조회/)).toBeInTheDocument()
  })

  it('취소 버튼은 등록하지 않고 닫기만 요청한다', async () => {
    const onRegistered = setup()

    await userEvent.setup().click(screen.getByRole('button', { name: '취소' }))

    expect(onRegistered.onCancel).toHaveBeenCalledTimes(1)
    expect(mutate).not.toHaveBeenCalled()
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
