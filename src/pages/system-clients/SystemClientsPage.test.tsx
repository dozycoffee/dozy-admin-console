import { render, screen } from '@testing-library/react'
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
  it('system client 목록을 보여준다', () => {
    setup({ data: [client] })

    expect(screen.getByRole('heading', { name: 'Store 서비스' })).toBeInTheDocument()
  })

  it('목록이 비었거나 로딩·에러일 때 각각 안내한다', () => {
    setup({ data: [] })
    expect(screen.getByText('등록된 system client가 없습니다.')).toBeInTheDocument()
  })

  it('로딩 중과 에러를 안내한다', () => {
    setup({ isLoading: true, data: undefined })
    expect(screen.getByText('system client 목록을 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('목록 조회가 실패하면 에러 안내를 보여준다', () => {
    setup({ isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined })

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('쓰기 권한이 없으면 등록 버튼을 숨긴다', () => {
    setup({ data: [client] }, [permissions.accountRead])

    expect(screen.queryByRole('button', { name: 'client 등록' })).not.toBeInTheDocument()
  })

  it('등록하면 secret을 한 번 보여주고 등록 폼을 닫는다', async () => {
    setup({ data: [client] })
    registerMutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-2', clientId: 'svc-order', clientSecret: 'Zr8qL2mX-new' }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'client 등록' }))
    await user.type(screen.getByLabelText('clientId'), 'svc-order')
    await user.type(screen.getByLabelText('이름'), '주문 서비스')
    await user.click(screen.getByRole('button', { name: 'system client 등록' }))

    expect(screen.getByLabelText('client secret')).toHaveValue('Zr8qL2mX-new')
    expect(screen.queryByRole('button', { name: 'system client 등록' })).not.toBeInTheDocument()
  })

  it('secret은 저장했다고 확인하고 닫으면 화면에서 사라진다', async () => {
    setup({ data: [client] })
    registerMutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-2', clientId: 'svc-order', clientSecret: 'Zr8qL2mX-new' }))
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: 'client 등록' }))
    await user.type(screen.getByLabelText('clientId'), 'svc-order')
    await user.type(screen.getByLabelText('이름'), '주문 서비스')
    await user.click(screen.getByRole('button', { name: 'system client 등록' }))

    await user.click(screen.getByLabelText('secret을 안전한 곳에 저장했습니다'))
    await user.click(screen.getByRole('button', { name: '닫기' }))

    expect(screen.queryByLabelText('client secret')).not.toBeInTheDocument()
    expect(screen.queryByText('Zr8qL2mX-new')).not.toBeInTheDocument()
  })
})
