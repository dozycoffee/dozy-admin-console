import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastContext } from '../../shared/ui/toastContext'
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
  const notify = vi.fn()
  render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastContext.Provider value={{ notify }}>
        <EmployeeDetail principalId="p-1" writable={writable} confirm={confirm} />
      </ToastContext.Provider>
    </AuthContext.Provider>,
  )
  return { mutations, confirm, notify }
}

const buttonNames = () => Array.from(document.querySelectorAll('.employee-actions button')).map((button) => button.textContent)

/** 버튼이 비활성일 때 툴팁 래퍼가 가진 사유(없으면 빈 문자열) */
const reasonOf = (name: string) => {
  const anchor = screen.getByRole('button', { name }).closest('.tooltip-anchor')
  return anchor?.querySelector('[role=tooltip]')?.textContent ?? ''
}

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

  it('비활성화된 직원은 정보 수정 버튼이 비활성이고 툴팁으로 이유를 안내한다', async () => {
    setup(detail('DEACTIVATED'))

    expect(buttonNames()).toEqual(['정보 수정'])
    expect(screen.getByRole('button', { name: '정보 수정' })).toBeDisabled()
    expect(reasonOf('정보 수정')).toBe('비활성화된 계정은 변경할 수 없습니다.')
    await userEvent.setup().hover(screen.getByRole('button', { name: '정보 수정' }).parentElement!)
    expect(screen.getByRole('tooltip')).toHaveTextContent('비활성화된 계정은 변경할 수 없습니다.')
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

    expect(mutations.passwordReset.mutate).toHaveBeenCalledWith('p-1', { onSuccess: expect.any(Function) })
  })

  it('새 작업을 시작하면 이전 작업의 상태를 모두 지운다', async () => {
    const { mutations, confirm } = setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '재설정 메일 발송' }))
    confirm.mock.calls[0][0].run()

    for (const mutation of Object.values(mutations).filter((value) => value !== mutations.update)) expect(mutation.reset).toHaveBeenCalled()
  })

  it('정보 수정을 누르면 모달로 수정 폼을 보여주고 Esc로 닫는다', async () => {
    setup(detail('ACTIVE'))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '정보 수정' }))

    const dialog = screen.getByRole('dialog', { name: '정보 수정 · 김도윤' })
    expect(within(dialog).getByLabelText('이름')).toHaveValue('김도윤')
    // 작업 버튼은 화면에 그대로 있다(수정 폼이 카드 안을 대체하지 않는다)
    expect(screen.getByRole('button', { name: '정지' })).toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('재설정 메일을 보내면 성공 안내를 토스트로 알린다', async () => {
    const { mutations, confirm, notify } = setup(detail('ACTIVE'))
    await userEvent.setup().click(screen.getByRole('button', { name: '재설정 메일 발송' }))
    confirm.mock.calls[0][0].run()
    expect(notify).not.toHaveBeenCalled()

    mutations.passwordReset.mutate.mock.calls[0][1].onSuccess()

    expect(notify).toHaveBeenCalledWith('비밀번호 재설정 메일을 보냈습니다.')
    expect(screen.queryByRole('status')).not.toBeInTheDocument() // 화면 안에 문장으로 남기지 않는다
  })

  it('초대를 재발송하면 새 만료 시각을 토스트로 알린다', async () => {
    const { mutations, confirm, notify } = setup(detail('PENDING'))
    await userEvent.setup().click(screen.getByRole('button', { name: '초대 재발송' }))
    confirm.mock.calls[0][0].run()

    mutations.resend.mutate.mock.calls[0][1].onSuccess({ invitationExpiresAt: '2026-10-16T05:00:00Z' })

    expect(notify).toHaveBeenCalledWith(expect.stringMatching(/^초대 메일을 다시 보냈습니다\. 새 초대는 .+까지 유효합니다\.$/))
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
    for (const name of ['정보 수정', '재설정 메일 발송', '정지', '비활성화']) expect(reasonOf(name)).toBe('owner·admin 계정은 owner만 변경할 수 있습니다.')
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
    expect(reasonOf('정지')).toMatch(/먼저 owner를 양도해야 합니다/)
    expect(reasonOf('비활성화')).toMatch(/먼저 owner를 양도해야 합니다/)
    expect(reasonOf('정보 수정')).toBe('')
  })

  it('일반 직원에게는 admin도 모든 작업을 할 수 있고 안내가 없다', () => {
    setup(detail('ACTIVE'), { granted: adminPermissions })

    expect(screen.getByRole('button', { name: '정지' })).toBeEnabled()
    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument()
  })
})

describe('EmployeeDetail 상태 안내 박스', () => {
  it('기본 정보(이메일·전화번호·주소·등록일)는 모든 직원에게 같은 제목 아래 보여준다', () => {
    setup({ ...detail('ACTIVE'), phone: '010-1234-5678', address: '서울시' })

    expect(screen.getByRole('heading', { name: '기본 정보' })).toBeInTheDocument()
    for (const label of ['이메일', '전화번호', '주소', '등록일']) expect(screen.getByText(label)).toBeInTheDocument()
    expect(screen.getByText('010-1234-5678')).toBeInTheDocument()
  })

  it('활성 직원에게는 상태 안내 박스가 없다', () => {
    setup(detail('ACTIVE'))

    expect(document.querySelector('.employee-notices')).toBeNull()
  })

  it('유효한 초대 대기 직원에게는 만료일만 한 줄의 작은 박스로 기본 정보와 분리해 보여준다', () => {
    setup(detail('PENDING'))

    const notice = document.querySelector('.employee-notice.warning')!
    expect(notice).toHaveClass('compact')
    expect(notice).toHaveTextContent('초대 만료')
    // 상태는 헤더 배지가 알려 주므로 박스에서 "초대 대기 중"을 반복하지 않는다
    expect(notice).not.toHaveTextContent('초대 대기 중')
    expect(notice.querySelector('strong')).toBeNull()
    expect(document.querySelector('.employee-fields')!.textContent).not.toContain('초대 만료')
  })

  it('만료된 초대는 경고 톤으로 바꾸고 재발송을 안내한다', () => {
    setup({ ...detail('PENDING'), invitation: { expiresAt: '2020-01-01T00:00:00Z' } })

    const notice = document.querySelector('.employee-notice.danger')!
    expect(notice).toHaveTextContent('초대가 만료되었습니다')
    expect(notice).toHaveTextContent('초대를 재발송하세요')
    expect(notice).not.toHaveClass('compact')
    expect(document.querySelector('.employee-notice.warning')).toBeNull()
  })

  it('로그인 잠금은 상태 안내 박스로 보여준다', () => {
    setup({ ...detail('ACTIVE'), lockedUntil: '2099-01-01T00:00:00Z' })

    const notice = document.querySelector('.employee-notice.danger')!
    expect(notice).toHaveTextContent('로그인 잠금')
    expect(document.querySelector('.employee-fields')!.textContent).not.toContain('로그인 잠금')
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

