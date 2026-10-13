import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { Role } from '../../features/role/model/roleSchemas'
import type { SystemClient } from '../../features/system-client/model/systemClientSchemas'
import { useDeactivateSystemClient, useGrantClientRole, useRevokeClientRole, useRotateClientSecret } from '../../features/system-client/model/useSystemClients'
import { ClientCard } from './ClientCard'

vi.mock('../../features/system-client/model/useSystemClients')

const role = (fullCode: string, name: string, isSystem = false): Role => {
  const [audience, code] = fullCode.split(':')
  return { id: fullCode.length, audience, code, fullCode, name, description: null, isSystem, grantedCount: 0 }
}
const catalog = [role('auth:owner', 'Owner', true), role('auth:admin', 'Admin', true), role('auth:partner_reader', '파트너 조회'), role('wms:viewer', '재고 조회')]
const base: SystemClient = { principalId: 'p-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: ['auth:partner_reader'], secretRotatedAt: '2026-09-24T05:00:00Z', createdAt: '2026-09-24T05:00:00Z' }

const rotateMutate = vi.fn(); const grantMutate = vi.fn(); const revokeMutate = vi.fn(); const deactivateMutate = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, state: Record<string, unknown> = {}) => ({ mutate, reset: vi.fn(), isPending: false, isError: false, ...state }) as never

function setup(client: SystemClient = base, { writable = true, rotate = {}, grant = {}, revoke = {}, deactivate = {} }: { writable?: boolean; rotate?: Record<string, unknown>; grant?: Record<string, unknown>; revoke?: Record<string, unknown>; deactivate?: Record<string, unknown> } = {}) {
  vi.mocked(useRotateClientSecret).mockReturnValue(mutation(rotateMutate, rotate))
  vi.mocked(useGrantClientRole).mockReturnValue(mutation(grantMutate, grant))
  vi.mocked(useRevokeClientRole).mockReturnValue(mutation(revokeMutate, revoke))
  vi.mocked(useDeactivateSystemClient).mockReturnValue(mutation(deactivateMutate, deactivate))
  const onRotated = vi.fn()
  render(<ul><ClientCard client={client} allRoles={catalog} writable={writable} onRotated={onRotated} /></ul>)
  return onRotated
}

const optionValues = () => Array.from(screen.getByLabelText('role 추가').querySelectorAll('option')).map((option) => (option as HTMLOptionElement).value).filter(Boolean)

beforeEach(() => vi.clearAllMocks())

describe('ClientCard 표시', () => {
  it('clientId·이름·상태·role·secret 발급 시각을 보여준다', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Store 서비스' })).toBeInTheDocument()
    expect(screen.getByText('svc-store')).toBeInTheDocument()
    expect(screen.getByText('auth:partner_reader')).toBeInTheDocument()
    expect(screen.getByText('활성')).toBeInTheDocument()
  })

  it('부여할 role 선택지에서 system role과 이미 가진 role을 뺀다', () => {
    setup()

    expect(optionValues()).toEqual(['wms:viewer'])
  })

  it('role이 없으면 토큰으로 서비스를 호출할 수 없다고 안내한다', () => {
    setup({ ...base, roles: [] })

    expect(screen.getByText(/어떤 서비스도 호출할 수 없습니다/)).toBeInTheDocument()
  })

  it('폐기된 클라이언트는 작업 버튼 없이 안내만 보여준다', () => {
    setup({ ...base, status: 'DEACTIVATED', clientId: 'deleted-p-1', roles: [], secretRotatedAt: null })

    expect(screen.getByText(/폐기된 클라이언트입니다/)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'secret 재발급' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: '폐기' })).not.toBeInTheDocument()
    expect(screen.queryByLabelText('role 추가')).not.toBeInTheDocument()
  })

  it('정지된 클라이언트는 재발급·role 부여를 할 수 없다', () => {
    setup({ ...base, status: 'SUSPENDED' })

    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeDisabled()
    expect(screen.queryByLabelText('role 추가')).not.toBeInTheDocument()
    expect(screen.getByText('정지된 클라이언트에는 role을 부여할 수 없습니다.')).toBeInTheDocument()
  })
})

describe('ClientCard 작업', () => {
  it('secret 재발급은 기존 secret 무효 안내를 확인한 뒤 새 secret을 부모에 넘긴다', async () => {
    const onRotated = setup()
    rotateMutate.mockImplementation((_id, options) => options.onSuccess({ clientSecret: 'Qw4nV7pK' }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'secret 재발급' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('기존 secret은 즉시 무효가 됩니다')
    expect(rotateMutate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '재발급' }))

    expect(rotateMutate.mock.calls[0][0]).toBe('p-1')
    expect(onRotated).toHaveBeenCalledWith({ clientId: 'svc-store', clientSecret: 'Qw4nV7pK' })
  })

  it('role을 골라 부여하면 role 하나를 요청하고 선택을 비운다', async () => {
    setup()
    grantMutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('role 추가'), 'wms:viewer')
    await user.click(screen.getByRole('button', { name: '부여' }))

    expect(grantMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', role: 'wms:viewer' })
    expect(screen.getByLabelText('role 추가')).toHaveValue('')
  })

  it('role 칩의 × 버튼으로 회수한다', async () => {
    setup()

    await userEvent.setup().click(screen.getByRole('button', { name: 'auth:partner_reader 회수' }))

    expect(revokeMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', role: 'auth:partner_reader' })
  })

  it('폐기는 사유를 입력해야 하고 되돌릴 수 없다고 안내한다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '폐기' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('되돌릴 수 없습니다')
    await user.type(screen.getByLabelText('사유'), '서비스 종료')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '폐기' }))

    expect(deactivateMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', reason: '서비스 종료' })
  })

  it('새 작업을 시작하면 이전 작업의 상태를 지운다', async () => {
    const reset = vi.fn()
    setup(base, { revoke: { reset } })

    await userEvent.setup().click(screen.getByRole('button', { name: 'auth:partner_reader 회수' }))

    expect(reset).toHaveBeenCalled()
  })

  it('작업이 실패하면 에러 code별 안내를 보여준다', () => {
    setup(base, { rotate: { isError: true, error: new ApiError('x', { status: 409, code: 'INVALID_STATE' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('현재 계정 상태에서는 할 수 없는 작업입니다.')
  })

  it('쓰기 권한이 없으면 모든 작업이 비활성이다', () => {
    setup(base, { writable: false })

    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '폐기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'auth:partner_reader 회수' })).toBeDisabled()
    expect(screen.getByLabelText('role 추가')).toBeDisabled()
  })
})
