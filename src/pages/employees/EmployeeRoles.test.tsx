import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastContext } from '../../shared/ui/toastContext'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type CurrentUser, type Permission } from '../../features/auth/model/permissions'
import type { EmployeeDetail, EmployeeStatus } from '../../features/employee/model/employeeSchemas'
import { useGrantRoles, useRevokeRole } from '../../features/employee/model/useEmployees'
import type { Role } from '../../features/role/model/roleSchemas'
import { useRoles } from '../../features/role/model/useRoles'
import { EmployeeRoles } from './EmployeeRoles'

vi.mock('../../features/employee/model/useEmployees')
vi.mock('../../features/role/model/useRoles')

const role = (fullCode: string, name: string, isSystem = false): Role => {
  const [audience, code] = fullCode.split(':')
  return { id: Math.abs(fullCode.length * 7), audience, code, fullCode, name, description: null, isSystem, grantedCount: 0 }
}
const catalog = [role('auth:owner', 'Owner', true), role('auth:admin', 'Admin', true), role('wms:warehouse_manager', '창고 관리자'), role('wms:hq_inventory_manager', '본사 재고 담당자')]

const ownerPermissions = [permissions.accountRead, permissions.accountWrite, permissions.accountManage]
const adminPermissions = [permissions.accountRead, permissions.accountWrite]

const employee = (roles: string[], status: EmployeeStatus = 'ACTIVE'): EmployeeDetail => ({
  principalId: 'p-1', email: 'kim@dozycoffee.com', name: '김도윤', phone: null, address: null, status, roles,
  lockedUntil: null, invitation: null, createdAt: '2026-09-24T05:00:00Z', updatedAt: '2026-09-24T05:00:00Z',
})

const grantMutate = vi.fn()
const revokeMutate = vi.fn()
const notify = vi.fn()

type SetupOptions = { granted?: Permission[]; writable?: boolean; viewerId?: string; grantState?: Record<string, unknown>; revokeState?: Record<string, unknown> }

function setup(target: EmployeeDetail, { granted = ownerPermissions, writable = true, viewerId = 'viewer', grantState = {}, revokeState = {} }: SetupOptions = {}) {
  vi.mocked(useRoles).mockReturnValue({ isLoading: false, isError: false, data: catalog } as never)
  vi.mocked(useGrantRoles).mockReturnValue({ mutate: grantMutate, reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...grantState } as never)
  vi.mocked(useRevokeRole).mockReturnValue({ mutate: revokeMutate, reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...revokeState } as never)
  const confirm = vi.fn()
  const user: CurrentUser = { id: viewerId, name: '보는 사람', actorModes: [], permissions: granted, scope: { warehouseIds: [] } }
  render(
    <AuthContext.Provider value={{ user, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastContext.Provider value={{ notify }}>
        <EmployeeRoles employee={target} writable={writable} confirm={confirm} />
      </ToastContext.Provider>
    </AuthContext.Provider>,
  )
  return confirm
}

const optionValues = () => Array.from(screen.getByLabelText('role 추가').querySelectorAll('option')).map((option) => (option as HTMLOptionElement).value).filter(Boolean)

/** role 추가 영역이 비활성일 때 툴팁이 가진 사유(없으면 빈 문자열) */
const grantReason = () => screen.getByLabelText('role 추가').closest('.tooltip-anchor')?.querySelector('[role=tooltip]')?.textContent ?? ''

beforeEach(() => vi.clearAllMocks())

describe('EmployeeRoles 표시', () => {
  it('부여된 role을 보여준다', () => {
    setup(employee(['wms:warehouse_manager']))
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
  })

  it('role이 없으면 콘솔 모드를 쓸 수 없다고 안내한다', () => {
    setup(employee([]))

    expect(screen.getByText(/부여된 role이 없습니다/)).toBeInTheDocument()
  })

  it('owner role에는 회수 버튼을 보여주지 않는다', () => {
    setup(employee(['auth:owner']))

    expect(screen.queryByRole('button', { name: 'auth:owner 회수' })).not.toBeInTheDocument()
  })
})

describe('EmployeeRoles 부여', () => {
  it('이미 가진 role과 auth:owner는 선택지에서 빼고, owner에게는 auth:admin도 보인다', () => {
    setup(employee(['wms:warehouse_manager']))

    expect(optionValues()).toEqual(['auth:admin', 'wms:hq_inventory_manager'])
  })

  it('admin(비 owner)에게는 auth:admin이 선택지에 없다', () => {
    setup(employee([]), { granted: adminPermissions })

    expect(optionValues()).toEqual(['wms:warehouse_manager', 'wms:hq_inventory_manager'])
  })

  it('role을 고르기 전에는 부여 버튼이 비활성이다', () => {
    setup(employee([]))

    expect(screen.getByRole('button', { name: '부여' })).toBeDisabled()
  })

  it('일반 role은 확인 없이 바로 부여를 요청하고 선택을 비운다', async () => {
    setup(employee([]))
    grantMutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('role 추가'), 'wms:warehouse_manager')
    await user.click(screen.getByRole('button', { name: '부여' }))

    expect(grantMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', roles: ['wms:warehouse_manager'] })
    expect(screen.getByLabelText('role 추가')).toHaveValue('')
  })

  it('auth:admin 임명은 owner 알림 안내와 함께 확인을 거친다', async () => {
    const confirm = setup(employee([]))
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('role 추가'), 'auth:admin')
    await user.click(screen.getByRole('button', { name: '부여' }))

    expect(grantMutate).not.toHaveBeenCalled()
    expect(confirm.mock.calls[0][0]).toMatchObject({ title: '이 직원을 admin으로 임명할까요?', confirmLabel: '임명' })
    expect(confirm.mock.calls[0][0].description).toMatch(/owner에게 즉시 알림/)
    confirm.mock.calls[0][0].run()
    expect(grantMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', roles: ['auth:admin'] })
  })

  it('쓰기 권한이 없으면 부여할 수 없다', () => {
    setup(employee([]), { writable: false })

    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(screen.getByRole('button', { name: '부여' })).toBeDisabled()
    expect(grantReason()).toBe('직원 정보를 변경할 권한이 없습니다.')
  })

  it.each([
    ['자기 자신', employee([]), { viewerId: 'p-1' }, '자기 자신에게는 role을 부여할 수 없습니다.'],
    ['정지된 직원', employee([], 'SUSPENDED'), {}, '정지된 직원에게는 role을 부여할 수 없습니다. 정지를 해제한 뒤 부여하세요.'],
    ['비활성화된 직원', employee([], 'DEACTIVATED'), {}, '비활성화된 계정에는 role을 부여할 수 없습니다.'],
  ])('%s에게는 부여 UI를 비활성화하고 툴팁으로 이유를 안내한다', (_label, target, options, message) => {
    setup(target, options)

    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(screen.getByRole('button', { name: '부여' })).toBeDisabled()
    expect(grantReason()).toBe(message)
  })

  it('admin은 owner·admin 계정에 role을 부여·회수할 수 없다', () => {
    setup(employee(['auth:admin', 'wms:warehouse_manager']), { granted: adminPermissions })

    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(grantReason()).toBe('owner·admin 계정의 role은 owner만 변경할 수 있습니다.')
    expect(screen.getByRole('button', { name: 'wms:warehouse_manager 회수' })).toBeDisabled()
  })

  it('owner는 admin 계정에도 role을 부여할 수 있다', () => {
    setup(employee(['auth:admin']))

    expect(screen.getByLabelText('role 추가')).toBeEnabled()
  })
})

describe('EmployeeRoles 회수', () => {
  it('일반 role은 확인 후 회수를 요청한다', async () => {
    const confirm = setup(employee(['wms:warehouse_manager']), { granted: adminPermissions })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'wms:warehouse_manager 회수' }))
    expect(revokeMutate).not.toHaveBeenCalled()
    expect(confirm.mock.calls[0][0]).toMatchObject({ title: 'wms:warehouse_manager role을 회수할까요?', confirmLabel: '회수' })
    confirm.mock.calls[0][0].run()

    expect(revokeMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', role: 'wms:warehouse_manager' })
  })

  it('auth:admin 해임은 owner만 할 수 있고 확인에서 owner 알림을 안내한다', async () => {
    const confirm = setup(employee(['auth:admin']))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'auth:admin 회수' }))

    expect(confirm.mock.calls[0][0]).toMatchObject({ title: '이 직원을 admin에서 해임할까요?', confirmLabel: '해임' })
  })

  it('정지된 직원에게서도 role을 회수할 수 있다', () => {
    setup(employee(['wms:warehouse_manager'], 'SUSPENDED'))

    expect(screen.getByRole('button', { name: 'wms:warehouse_manager 회수' })).toBeEnabled()
  })

  it('쓰기 권한이 없으면 회수할 수 없다', () => {
    setup(employee(['wms:warehouse_manager']), { writable: false })

    expect(screen.getByRole('button', { name: 'wms:warehouse_manager 회수' })).toBeDisabled()
  })
})

describe('EmployeeRoles 결과 안내', () => {
  it('부여에 성공하면 다음 토큰 갱신부터 반영된다고 토스트로 알린다', async () => {
    setup(employee([]))
    grantMutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('role 추가'), 'wms:warehouse_manager')
    await user.click(screen.getByRole('button', { name: '부여' }))

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('다음 로그인·토큰 갱신(최대 10분)부터'))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('회수에 성공해도 같은 안내를 토스트로 알린다', async () => {
    const confirm = setup(employee(['wms:warehouse_manager']), { granted: adminPermissions })
    revokeMutate.mockImplementation((_variables, options) => options.onSuccess())
    await userEvent.setup().click(screen.getByRole('button', { name: 'wms:warehouse_manager 회수' }))

    confirm.mock.calls[0][0].run()

    expect(notify).toHaveBeenCalledWith(expect.stringContaining('role을 변경했습니다'))
  })

  it('실패하면 에러 code별 안내를 보여준다', () => {
    setup(employee([]), { grantState: { isError: true, error: new ApiError('x', { status: 403, code: 'SELF_GRANT_NOT_ALLOWED' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('자기 자신에게는 role을 부여할 수 없습니다.')
  })

  it('회수 실패도 안내한다', () => {
    setup(employee(['wms:warehouse_manager']), { revokeState: { isError: true, error: new ApiError('x', { status: 404, code: 'NOT_FOUND' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('대상을 찾을 수 없습니다.')
  })
})

describe('EmployeeRoles 회수 버튼 툴팁', () => {
  it('회수할 수 없는 role은 버튼 툴팁으로 이유를 안내한다', async () => {
    setup(employee(['auth:owner', 'wms:warehouse_manager'], 'ACTIVE'), { granted: adminPermissions })
    const user = userEvent.setup()

    const button = screen.getByRole('button', { name: 'wms:warehouse_manager 회수' })
    expect(button).toBeDisabled()
    await user.hover(button.parentElement!)

    expect(screen.getByRole('tooltip')).toHaveTextContent('owner·admin 계정은 owner만 변경할 수 있습니다.')
  })

  it('회수할 수 있으면 툴팁이 없다', () => {
    setup(employee(['wms:warehouse_manager']))

    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument()
  })
})
