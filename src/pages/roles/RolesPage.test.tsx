import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { Role } from '../../features/role/model/roleSchemas'
import { useAudiences, useCreateAudience, useCreateRole, useDeleteRole, useRoles, useUpdateRole } from '../../features/role/model/useRoles'
import { RolesPage } from './RolesPage'

vi.mock('../../features/role/model/useRoles')

const audiences = [{ id: 1, code: 'wms', name: '창고 관리', description: null }, { id: 4, code: 'auth', name: '인증', description: null }]
const owner: Role = { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 }
const manager: Role = { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 3 }
const unused: Role = { id: 12, audience: 'wms', code: 'viewer', fullCode: 'wms:viewer', name: '조회자', description: null, isSystem: false, grantedCount: 0 }

const deleteMutate = vi.fn()
const idle = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, isSuccess: false } as never

function setup(roles: Role[] = [owner, manager, unused], granted: Permission[] = [permissions.accountRead, permissions.accountWrite, permissions.accountManage], deleteState: Record<string, unknown> = {}) {
  vi.mocked(useAudiences).mockReturnValue({ isLoading: false, isError: false, data: audiences } as never)
  vi.mocked(useRoles).mockReturnValue({ isLoading: false, isError: false, data: roles } as never)
  vi.mocked(useDeleteRole).mockReturnValue({ mutate: deleteMutate, reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...deleteState } as never)
  vi.mocked(useCreateRole).mockReturnValue(idle)
  vi.mocked(useUpdateRole).mockReturnValue(idle)
  vi.mocked(useCreateAudience).mockReturnValue(idle)
  render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <RolesPage />
    </AuthContext.Provider>,
  )
}

const row = (name: string) => screen.getByText(name).closest('li')!

beforeEach(() => vi.clearAllMocks())

describe('RolesPage', () => {
  it('서비스와 role 목록을 보여준다', () => {
    setup()

    expect(screen.getByText('인증')).toBeInTheDocument()
    expect(screen.getByText('auth:owner')).toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
  })

  it('서비스 필터를 고르면 API를 다시 부르지 않고 그 서비스의 role만 보여준다', async () => {
    setup()
    const callsBefore = vi.mocked(useRoles).mock.calls.length

    await userEvent.setup().selectOptions(screen.getByLabelText('서비스', { selector: '.role-filter select' }), 'wms')

    expect(screen.queryByText('auth:owner')).not.toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
    // 필터와 무관하게 항상 전체 목록을 요청한다(필터를 바꿔도 새 요청이 생기지 않아 목록이 비었다 다시 그려지지 않는다)
    expect(vi.mocked(useRoles).mock.calls.slice(callsBefore).every((args) => args.length === 0)).toBe(true)
  })

  it('필터를 "전체"로 돌리면 모든 role을 다시 보여준다', async () => {
    setup()
    const user = userEvent.setup()
    const filter = screen.getByLabelText('서비스', { selector: '.role-filter select' })
    await user.selectOptions(filter, 'wms')

    await user.selectOptions(filter, '')

    expect(screen.getByText('auth:owner')).toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
  })

  it('role이 없으면 안내한다', () => {
    setup([])

    expect(screen.getByText('등록된 role이 없습니다.')).toBeInTheDocument()
  })

  it('부여된 직원이 없는 role은 확인 한 번으로 삭제를 요청한다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(within(row('조회자')).getByRole('button', { name: '삭제' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('"조회자" role을 삭제할까요?')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    expect(deleteMutate.mock.calls[0][0]).toEqual({ roleId: 12, revokeAll: false })
  })

  it('ROLE_IN_USE로 거부되면 영향 인원을 보여주고 확인 후 revokeAll로 다시 요청한다', async () => {
    setup()
    deleteMutate.mockImplementationOnce((_variables, options) => options.onError(new ApiError('in use', { status: 409, code: 'ROLE_IN_USE' })))
    const user = userEvent.setup()

    await user.click(within(row('창고 관리자')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    const dialog = await screen.findByRole('dialog')
    expect(dialog).toHaveTextContent('3명에게 부여된 role입니다')
    await user.click(within(dialog).getByRole('button', { name: '모두 회수하고 삭제' }))

    expect(deleteMutate).toHaveBeenCalledTimes(2)
    expect(deleteMutate.mock.calls[0][0]).toEqual({ roleId: 11, revokeAll: false })
    expect(deleteMutate.mock.calls[1][0]).toEqual({ roleId: 11, revokeAll: true })
  })

  it('영향 인원 확인에서 취소하면 revokeAll 요청을 보내지 않는다', async () => {
    setup()
    deleteMutate.mockImplementationOnce((_variables, options) => options.onError(new ApiError('in use', { status: 409, code: 'ROLE_IN_USE' })))
    const user = userEvent.setup()

    await user.click(within(row('창고 관리자')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(deleteMutate).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('ROLE_IN_USE가 아닌 삭제 에러는 안내만 하고 다시 묻지 않는다', async () => {
    setup([owner, unused], undefined, { isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }) })
    deleteMutate.mockImplementationOnce((_variables, options) => options.onError(new ApiError('x', { status: 403, code: 'FORBIDDEN' })))
    const user = userEvent.setup()

    await user.click(within(row('조회자')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('owner가 아니면 서비스 추가 폼을 보여주지 않는다', () => {
    setup(undefined, [permissions.accountRead, permissions.accountWrite])

    expect(screen.queryByRole('form', { name: '서비스 추가' })).not.toBeInTheDocument()
  })

  it('쓰기 권한이 없으면 role 등록과 수정·삭제가 비활성이다', () => {
    setup(undefined, [permissions.accountRead])

    expect(screen.getByRole('button', { name: 'role 등록' })).toBeDisabled()
    expect(within(row('조회자')).getByRole('button', { name: '삭제' })).toBeDisabled()
  })
})
