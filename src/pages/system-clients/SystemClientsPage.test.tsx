import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { useRoles } from '../../features/role/model/useRoles'
import { useDeactivateSystemClient, useGrantClientRole, useRegisterSystemClient, useRevokeClientRole, useRotateClientSecret, useSystemClients } from '../../features/system-client/model/useSystemClients'
import { SystemClientsPage } from './SystemClientsPage'

vi.mock('../../features/role/model/useRoles')
vi.mock('../../features/system-client/model/useSystemClients')

const client = { principalId: 'p-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: [], secretRotatedAt: null, createdAt: '2026-09-24T05:00:00Z' }
const idle = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false } as never
const registerMutate = vi.fn()

function setup(clients: Record<string, unknown>, granted: Permission[] = [permissions.accountRead, permissions.accountWrite]) {
  vi.mocked(useSystemClients).mockReturnValue({ isLoading: false, isError: false, ...clients } as never)
  vi.mocked(useRoles).mockReturnValue({ isLoading: false, isError: false, data: [] } as never)
  vi.mocked(useRegisterSystemClient).mockReturnValue({ mutate: registerMutate, reset: vi.fn(), isPending: false, isError: false } as never)
  vi.mocked(useRotateClientSecret).mockReturnValue(idle)
  vi.mocked(useGrantClientRole).mockReturnValue(idle)
  vi.mocked(useRevokeClientRole).mockReturnValue(idle)
  vi.mocked(useDeactivateSystemClient).mockReturnValue(idle)
  render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <SystemClientsPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('SystemClientsPage', () => {
  it('시스템 클라이언트 목록을 보여준다', () => {
    setup({ data: [client] })

    expect(screen.getByRole('heading', { name: 'Store 서비스' })).toBeInTheDocument()
  })

  it('목록이 비었거나 로딩·에러일 때 각각 안내한다', () => {
    setup({ data: [] })
    expect(screen.getByText('등록된 시스템 클라이언트가 없습니다.')).toBeInTheDocument()
  })

  it('로딩 중과 에러를 안내한다', () => {
    setup({ isLoading: true, data: undefined })
    expect(screen.getByText('시스템 클라이언트 목록을 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('목록 조회가 실패하면 에러 안내를 보여준다', () => {
    setup({ isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined })

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('쓰기 권한이 없으면 등록 버튼을 숨긴다', () => {
    setup({ data: [client] }, [permissions.accountRead])

    expect(screen.queryByRole('button', { name: '클라이언트 등록' })).not.toBeInTheDocument()
  })

  it('client 등록은 목록을 밀어내지 않고 모달로 열며 취소·Esc로 닫는다', async () => {
    setup({ data: [client] })
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '클라이언트 등록' }))
    const dialog = screen.getByRole('dialog', { name: '시스템 클라이언트 등록' })
    expect(within(dialog).getByLabelText('clientId')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '클라이언트 등록' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('등록 직후 secret은 모달로 보이고 저장했다고 확인하기 전에는 Esc로 닫히지 않는다', async () => {
    setup({ data: [client] })
    registerMutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-2', clientId: 'svc-order', clientSecret: 'Zr8qL2mX-new' }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '클라이언트 등록' }))
    await user.type(screen.getByLabelText('clientId'), 'svc-order')
    await user.type(screen.getByLabelText('이름'), '주문 서비스')
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))

    expect(screen.getAllByRole('dialog')).toHaveLength(1) // 등록 모달은 닫히고 secret 모달만 남는다
    expect(screen.getByRole('dialog', { name: 'svc-order의 secret' })).toBeInTheDocument()
    await user.keyboard('{Escape}')

    expect(screen.getByLabelText('클라이언트 secret')).toHaveValue('Zr8qL2mX-new')
  })

  it('등록하면 secret을 한 번 보여주고 등록 폼을 닫는다', async () => {
    setup({ data: [client] })
    registerMutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-2', clientId: 'svc-order', clientSecret: 'Zr8qL2mX-new' }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '클라이언트 등록' }))
    await user.type(screen.getByLabelText('clientId'), 'svc-order')
    await user.type(screen.getByLabelText('이름'), '주문 서비스')
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))

    expect(screen.getByLabelText('클라이언트 secret')).toHaveValue('Zr8qL2mX-new')
    expect(screen.queryByRole('button', { name: '시스템 클라이언트 등록' })).not.toBeInTheDocument()
  })

  it('secret은 저장했다고 확인하고 닫으면 화면에서 사라진다', async () => {
    setup({ data: [client] })
    registerMutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-2', clientId: 'svc-order', clientSecret: 'Zr8qL2mX-new' }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '클라이언트 등록' }))
    await user.type(screen.getByLabelText('clientId'), 'svc-order')
    await user.type(screen.getByLabelText('이름'), '주문 서비스')
    await user.click(screen.getByRole('button', { name: '시스템 클라이언트 등록' }))

    await user.click(screen.getByLabelText('secret을 안전한 곳에 저장했습니다'))
    await user.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByLabelText('클라이언트 secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Zr8qL2mX-new')).not.toBeInTheDocument()
  })
})

describe('SystemClientsPage 펴기·접기', () => {
  const many = (count: number) => Array.from({ length: count }, (_, index) => ({ ...client, principalId: `p-${index}`, clientId: `svc-test-${index}`, name: `클라이언트 ${index}` }))
  const toggle = (name: string) => screen.getByRole('button', { name })

  it('클라이언트가 적으면(3개 이하) 처음부터 모두 펼쳐 보여준다', () => {
    setup({ data: many(3) })

    expect(toggle('클라이언트 0')).toHaveAttribute('aria-expanded', 'true')
    expect(toggle('클라이언트 2')).toHaveAttribute('aria-expanded', 'true')
  })

  it('클라이언트가 많으면(4개 이상) 처음에는 모두 접어 두고 개수를 알려 준다', () => {
    setup({ data: many(4) })

    expect(toggle('클라이언트 0')).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('4개')).toBeInTheDocument()
  })

  it('카드를 하나씩 펴고 접을 수 있다', async () => {
    setup({ data: many(4) })
    const user = userEvent.setup()

    await user.click(toggle('클라이언트 1'))
    expect(toggle('클라이언트 1')).toHaveAttribute('aria-expanded', 'true')
    expect(toggle('클라이언트 0')).toHaveAttribute('aria-expanded', 'false')

    await user.click(toggle('클라이언트 1'))
    expect(toggle('클라이언트 1')).toHaveAttribute('aria-expanded', 'false')
  })

  it('모두 펴기·모두 접기로 한꺼번에 바꾼다', async () => {
    setup({ data: many(4) })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '모두 펴기' }))
    expect(many(4).every((_, index) => toggle(`클라이언트 ${index}`).getAttribute('aria-expanded') === 'true')).toBe(true)

    await user.click(screen.getByRole('button', { name: '모두 접기' }))
    expect(many(4).every((_, index) => toggle(`클라이언트 ${index}`).getAttribute('aria-expanded') === 'false')).toBe(true)
  })

  it('클라이언트가 하나뿐이면 모두 펴기·접기 버튼을 보여주지 않는다', () => {
    setup({ data: [client] })

    expect(screen.queryByRole('button', { name: '모두 펴기' })).not.toBeInTheDocument()
  })
})
