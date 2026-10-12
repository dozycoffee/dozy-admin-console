import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { EmployeeDetail as EmployeeDetailData, EmployeeStatus } from '../../features/employee/model/employeeSchemas'
import {
  useCancelInvitation, useDeactivateEmployee, useEmployee, useGrantRoles, useReactivateEmployee, useResendInvitation, useRevokeRole, useSendPasswordReset, useSuspendEmployee, useUpdateEmployee,
} from '../../features/employee/model/useEmployees'
import { useRoles } from '../../features/role/model/useRoles'
import { EmployeeDetail } from './EmployeeDetail'

vi.mock('../../features/employee/model/useEmployees')
vi.mock('../../features/role/model/useRoles')

const ownerPermissions = [permissions.accountRead, permissions.accountWrite, permissions.accountManage]
const adminPermissions = [permissions.accountRead, permissions.accountWrite]

const detail = (status: EmployeeStatus, roles: string[] = ['wms:warehouse_manager']): EmployeeDetailData => ({
  principalId: 'p-1', email: 'kim@dozycoffee.com', name: '김도윤', phone: null, address: null, status, roles,
  lockedUntil: null, invitation: status === 'PENDING' ? { expiresAt: '2099-01-01T00:00:00Z' } : null, createdAt: '2026-09-24T05:00:00Z', updatedAt: '2026-09-24T05:00:00Z',
})

function mutation(extra: Record<string, unknown> = {}) {
  return { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...extra }
}

function mockMutations(overrides: Partial<Record<'resend' | 'cancel' | 'suspend' | 'reactivate' | 'deactivate' | 'passwordReset' | 'update', Record<string, unknown>>> = {}) {
  const all = {
    resend: mutation(overrides.resend), cancel: mutation(overrides.cancel), suspend: mutation(overrides.suspend), reactivate: mutation(overrides.reactivate),
    deactivate: mutation(overrides.deactivate), passwordReset: mutation(overrides.passwordReset), update: mutation(overrides.update),
  }
  vi.mocked(useResendInvitation).mockReturnValue(all.resend as never)
  vi.mocked(useCancelInvitation).mockReturnValue(all.cancel as never)
  vi.mocked(useSuspendEmployee).mockReturnValue(all.suspend as never)
  vi.mocked(useReactivateEmployee).mockReturnValue(all.reactivate as never)
  vi.mocked(useDeactivateEmployee).mockReturnValue(all.deactivate as never)
  vi.mocked(useSendPasswordReset).mockReturnValue(all.passwordReset as never)
  vi.mocked(useUpdateEmployee).mockReturnValue(all.update as never)
  vi.mocked(useGrantRoles).mockReturnValue(mutation() as never)
  vi.mocked(useRevokeRole).mockReturnValue(mutation() as never)
  vi.mocked(useRoles).mockReturnValue({ isLoading: false, isError: false, data: [] } as never)
  return all
}

function setup(employee: EmployeeDetailData, { granted = ownerPermissions, writable = true, overrides = {} }: { granted?: Permission[]; writable?: boolean; overrides?: Parameters<typeof mockMutations>[0] } = {}) {
  vi.mocked(useEmployee).mockReturnValue({ isLoading: false, isError: false, data: employee } as never)
  const mutations = mockMutations(overrides)
  const confirm = vi.fn()
  render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <EmployeeDetail principalId="p-1" writable={writable} confirm={confirm} />
    </AuthContext.Provider>,
  )
  return { mutations, confirm }
}

const buttonNames = () => Array.from(document.querySelectorAll('.employee-actions button')).map((button) => button.textContent)

beforeEach(() => vi.clearAllMocks())

describe('EmployeeDetail 상태별 작업', () => {
  it('활성 직원은 정보 수정·재설정 메일·정지·비활성화를 보여준다', () => {
    setup(detail('ACTIVE'))

    expect(buttonNames()).toEqual(['정보 수정', '재설정 메일 발송', '정지', '비활성화'])
  })

  it('정지된 직원은 정보 수정·정지 해제·비활성화를 보여준다', () => {
    setup(detail('SUSPENDED'))

    expect(buttonNames()).toEqual(['정보 수정', '정지 해제', '비활성화'])
  })

  it('초대 대기 직원은 정보 수정·초대 재발송·초대 취소를 보여준다', () => {
    setup(detail('PENDING'))

    expect(buttonNames()).toEqual(['정보 수정', '초대 재발송', '초대 취소'])
  })

  it('비활성화된 직원은 변경할 수 없다고 안내하고 작업 버튼이 없다', () => {
    setup(detail('DEACTIVATED'))

    expect(screen.getByText('비활성화된 계정은 변경할 수 없습니다.')).toBeInTheDocument()
    expect(buttonNames()).toEqual([])
  })
})

describe('EmployeeDetail 작업 실행', () => {
  it('정지는 사유를 입력해야 실행되고 사유를 담아 요청한다', async () => {
    const { mutations } = setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '정지' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('계정을 정지할까요?')
    await user.type(screen.getByLabelText('사유'), '계정 탈취 의심')
    await user.click(screen.getAllByRole('button', { name: '정지' }).at(-1)!)

    expect(mutations.suspend.mutate).toHaveBeenCalledWith({ principalId: 'p-1', reason: '계정 탈취 의심' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('비활성화는 사유를 담아 요청한다', async () => {
    const { mutations } = setup(detail('SUSPENDED'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '비활성화' }))
    await user.type(screen.getByLabelText('사유'), '퇴사')
    await user.click(screen.getAllByRole('button', { name: '비활성화' }).at(-1)!)

    expect(mutations.deactivate.mutate).toHaveBeenCalledWith({ principalId: 'p-1', reason: '퇴사' })
  })

  it('사유 모달을 취소하면 요청하지 않는다', async () => {
    const { mutations } = setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '정지' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(mutations.suspend.mutate).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('정지 해제는 확인을 거쳐 요청한다', async () => {
    const { mutations, confirm } = setup(detail('SUSPENDED'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '정지 해제' }))
    expect(mutations.reactivate.mutate).not.toHaveBeenCalled()
    confirm.mock.calls[0][0].run()

    expect(mutations.reactivate.mutate).toHaveBeenCalledWith('p-1')
  })

  it('재설정 메일 발송은 확인을 거쳐 요청한다', async () => {
    const { mutations, confirm } = setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '재설정 메일 발송' }))
    confirm.mock.calls[0][0].run()

    expect(mutations.passwordReset.mutate).toHaveBeenCalledWith('p-1')
  })

  it('새 작업을 시작하면 이전 작업의 상태를 모두 지운다', async () => {
    const { mutations, confirm } = setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '재설정 메일 발송' }))
    confirm.mock.calls[0][0].run()

    for (const mutation of Object.values(mutations).filter((value) => value !== mutations.update)) expect(mutation.reset).toHaveBeenCalled()
  })

  it('정보 수정을 누르면 수정 폼을 보여주고 작업 버튼을 숨긴다', async () => {
    setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '정보 수정' }))

    expect(screen.getByLabelText('이름')).toHaveValue('김도윤')
    expect(screen.queryByRole('button', { name: '정지' })).not.toBeInTheDocument()
  })

  it('재설정 메일을 보내면 성공 안내를 보여준다', () => {
    setup(detail('ACTIVE'), { overrides: { passwordReset: { isSuccess: true } } })

    expect(screen.getByRole('status')).toHaveTextContent('비밀번호 재설정 메일을 보냈습니다.')
  })

  it('작업이 실패하면 에러 code별 안내를 보여준다', () => {
    setup(detail('ACTIVE'), { overrides: { suspend: { isError: true, error: new ApiError('x', { status: 403, code: 'PROTECTED_ACCOUNT' }) } } })

    expect(screen.getByRole('alert')).toHaveTextContent('owner·admin 계정은 admin이 변경할 수 없습니다.')
  })

  it('작업이 진행 중이면 모든 작업 버튼이 비활성이다', () => {
    setup(detail('ACTIVE'), { overrides: { suspend: { isPending: true } } })

    for (const name of ['정보 수정', '재설정 메일 발송', '정지', '비활성화']) expect(screen.getByRole('button', { name })).toBeDisabled()
  })

  it('쓰기 권한이 없으면 모든 작업 버튼이 비활성이다', () => {
    setup(detail('ACTIVE'), { writable: false })

    for (const name of ['정보 수정', '재설정 메일 발송', '정지', '비활성화']) expect(screen.getByRole('button', { name })).toBeDisabled()
  })
})

describe('EmployeeDetail owner·admin 보호', () => {
  it('admin은 owner·admin 계정의 모든 작업이 비활성이고 이유를 안내한다', () => {
    setup(detail('ACTIVE', ['auth:admin']), { granted: adminPermissions })

    for (const name of ['정보 수정', '재설정 메일 발송', '정지', '비활성화']) expect(screen.getByRole('button', { name })).toBeDisabled()
    expect(screen.getByText('owner·admin 계정은 owner만 변경할 수 있습니다.')).toBeInTheDocument()
  })

  it('owner는 admin 계정을 변경할 수 있다', () => {
    setup(detail('ACTIVE', ['auth:admin']))

    for (const name of ['정보 수정', '재설정 메일 발송', '정지', '비활성화']) expect(screen.getByRole('button', { name })).toBeEnabled()
  })

  it('owner 계정은 owner도 정지·비활성화할 수 없지만 정보 수정은 할 수 있다', () => {
    setup(detail('ACTIVE', ['auth:owner']))

    expect(screen.getByRole('button', { name: '정지' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '비활성화' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '정보 수정' })).toBeEnabled()
    expect(screen.getByText(/먼저 owner를 양도해야 합니다/)).toBeInTheDocument()
  })

  it('일반 직원에게는 admin도 모든 작업을 할 수 있고 안내가 없다', () => {
    setup(detail('ACTIVE'), { granted: adminPermissions })

    expect(screen.getByRole('button', { name: '정지' })).toBeEnabled()
    expect(screen.queryByText(/owner만 변경할 수 있습니다/)).not.toBeInTheDocument()
  })
})

describe('EmployeeDetail 조회 상태', () => {
  it('로딩 중과 에러를 구분해 보여준다', () => {
    mockMutations()
    vi.mocked(useEmployee).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    const { unmount } = render(<AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}><EmployeeDetail principalId="p-1" writable confirm={vi.fn()} /></AuthContext.Provider>)
    expect(screen.getByText('직원 정보를 불러오는 중입니다...')).toBeInTheDocument()
    unmount()
  })
})

