import { act, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { EmployeeDetail, EmployeeSummary } from '../../features/employee/model/employeeSchemas'
import { useCancelInvitation, useDeactivateEmployee, useEmployee, useEmployees, useInviteEmployee, useReactivateEmployee, useResendInvitation, useSendPasswordReset, useSuspendEmployee, useUpdateEmployee, useGrantRoles, useRevokeRole } from '../../features/employee/model/useEmployees'
import { useRoles } from '../../features/role/model/useRoles'
import { EmployeesPage } from './EmployeesPage'

vi.mock('../../features/employee/model/useEmployees')
vi.mock('../../features/role/model/useRoles')

const mockedUseEmployees = vi.mocked(useEmployees)
const mockedUseEmployee = vi.mocked(useEmployee)
const mockedUseRoles = vi.mocked(useRoles)
const mockedUseResend = vi.mocked(useResendInvitation)
const mockedUseCancel = vi.mocked(useCancelInvitation)
const mockedUseInvite = vi.mocked(useInviteEmployee)
const idleMutation = { mutate: vi.fn(), reset: vi.fn(), isPending: false, isError: false, isSuccess: false } as never

const kim: EmployeeSummary = { principalId: 'p-1', email: 'kim@dozycoffee.com', name: '김도윤', status: 'ACTIVE', roles: ['wms:warehouse_manager'], createdAt: '2026-09-24T05:00:00Z' }
const lee: EmployeeSummary = { principalId: 'p-2', email: 'lee@dozycoffee.com', name: '이서연', status: 'PENDING', roles: [], createdAt: '2026-09-25T05:00:00Z' }
const detailOf = (summary: EmployeeSummary, extra: Partial<EmployeeDetail> = {}): EmployeeDetail => ({
  ...summary, phone: '010-1234-5678', address: null, lockedUntil: null, invitation: null, updatedAt: summary.createdAt, ...extra,
})

const resend = vi.fn()
const cancel = vi.fn()

function setup(items: EmployeeSummary[] = [kim, lee], totalPages = 1) {
  mockedUseEmployees.mockReturnValue({ isLoading: false, isError: false, data: { items, page: { number: 0, size: 5, totalElements: items.length, totalPages } } } as never)
  mockedUseEmployee.mockImplementation((id) => {
    const summary = items.find((item) => item.principalId === id)
    const detail = summary && detailOf(summary, summary.status === 'PENDING' ? { invitation: { expiresAt: '2099-01-01T00:00:00Z' } } : {})
    return { isLoading: false, isError: false, data: detail } as never
  })
  mockedUseRoles.mockReturnValue({ isLoading: false, isError: false, data: [{ id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 1 }] } as never)
  mockedUseResend.mockReturnValue({ mutate: resend, reset: vi.fn(), isPending: false, isError: false, isSuccess: false } as never)
  mockedUseCancel.mockReturnValue({ mutate: cancel, reset: vi.fn(), isPending: false, isError: false, isSuccess: false } as never)
  vi.mocked(useSuspendEmployee).mockReturnValue(idleMutation)
  vi.mocked(useReactivateEmployee).mockReturnValue(idleMutation)
  vi.mocked(useDeactivateEmployee).mockReturnValue(idleMutation)
  vi.mocked(useSendPasswordReset).mockReturnValue(idleMutation)
  vi.mocked(useUpdateEmployee).mockReturnValue(idleMutation)
  vi.mocked(useGrantRoles).mockReturnValue(idleMutation)
  vi.mocked(useRevokeRole).mockReturnValue(idleMutation)
  mockedUseInvite.mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false, isSuccess: false } as never)
}

function renderPage(granted: Permission[] = [permissions.accountRead, permissions.accountWrite]) {
  return render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastProvider><EmployeesPage /></ToastProvider>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('EmployeesPage', () => {
  it('직원 목록을 보여주고 첫 직원의 상세를 자동 선택한다', () => {
    setup()

    renderPage()

    expect(screen.getByRole('button', { name: /김도윤/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /이서연/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '김도윤', level: 2 })).toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
  })

  it('로딩 중과 에러, 빈 목록을 구분해 보여준다', () => {
    mockedUseRoles.mockReturnValue({ isLoading: false, isError: false, data: [] } as never)
    mockedUseEmployees.mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    const { unmount } = renderPage()
    expect(screen.getByText('직원 목록을 불러오는 중입니다...')).toBeInTheDocument()
    unmount()

    mockedUseEmployees.mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined } as never)
    const second = renderPage()
    expect(screen.getByText('직원 목록을 불러오지 못했습니다')).toBeInTheDocument()
    expect(screen.getByText('이 작업을 할 권한이 없습니다.')).toBeInTheDocument()
    second.unmount()

    setup([])
    renderPage()
    expect(screen.getByText('조건에 맞는 직원이 없습니다.')).toBeInTheDocument()
  })

  it('직원을 선택하면 그 직원의 상세를 보여준다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: /이서연/ }))

    expect(screen.getByRole('heading', { name: '이서연', level: 2 })).toBeInTheDocument()
    expect(screen.getByText(/부여된 role이 없습니다/)).toBeInTheDocument()
  })

  it('상태 필터와 검색어를 바꾸면 첫 페이지부터 다시 조회한다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('상태'), 'PENDING')
    await user.type(screen.getByLabelText('이름·이메일'), '김')
    await user.click(screen.getByRole('button', { name: '검색' }))

    expect(mockedUseEmployees).toHaveBeenLastCalledWith({ status: 'PENDING', role: undefined, q: '김', page: 0, size: 5 })
  })

  it('role 필터를 고르면 그 role로 조회한다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.selectOptions(screen.getByLabelText('role'), 'wms:warehouse_manager')

    expect(mockedUseEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ role: 'wms:warehouse_manager', page: 0 }))
  })

  it('페이지가 여러 개면 다음 페이지를 조회한다', async () => {
    setup([kim], 3)
    const user = userEvent.setup()
    renderPage()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(mockedUseEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })

  it('초대 대기 직원은 확인 후 초대를 재발송한다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /이서연/ }))

    await user.click(screen.getByRole('button', { name: '초대 재발송' }))
    expect(resend).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '재발송' }))

    expect(resend).toHaveBeenCalledWith('p-2', expect.anything())
  })

  it('초대 취소는 확인 후 실행한다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    await user.click(screen.getByRole('button', { name: /이서연/ }))

    await user.click(screen.getByRole('button', { name: '초대 취소' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '초대 취소' }))

    expect(cancel).toHaveBeenCalledWith('p-2')
  })

  it('초대 대기가 아닌 직원에게는 초대 관련 버튼을 보여주지 않는다', () => {
    setup()

    renderPage()

    expect(screen.queryByRole('button', { name: '초대 재발송' })).not.toBeInTheDocument()
  })

  it('쓰기 권한이 없으면 초대 버튼을 숨기고 초대 작업 버튼을 비활성화한다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage([permissions.accountRead])
    await user.click(screen.getByRole('button', { name: /이서연/ }))

    expect(screen.queryByRole('button', { name: '직원 추가' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '초대 재발송' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '초대 취소' })).toBeDisabled()
  })

  it('직원 추가 버튼을 누르면 모달로 추가 폼을 열고 취소·Esc로 닫는다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '직원 추가' }))
    const dialog = screen.getByRole('dialog', { name: '직원 추가' })
    expect(within(dialog).getByLabelText('이메일')).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '취소' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '직원 추가' }))
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('직원 추가 모달은 제목 오른쪽에 현재 단계를 보여주고 단계가 바뀌면 따라 바뀐다', async () => {
    setup()
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '직원 추가' }))
    const dialog = screen.getByRole('dialog', { name: '직원 추가' }) // 단계 표시는 대화상자 이름에 들어가지 않는다
    expect(within(dialog).getByText('1 / 2')).toBeInTheDocument()
    expect(within(dialog).getByText('기본 정보')).toBeInTheDocument()

    await user.type(within(dialog).getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(within(dialog).getByLabelText('이름'), '신입')
    await user.click(within(dialog).getByRole('button', { name: '다음' }))
    expect(within(dialog).getByText('2 / 2')).toBeInTheDocument()
    expect(within(dialog).getByText('role 부여 (선택)')).toBeInTheDocument()
  })

  it('모달을 열어도 뒤의 목록과 이전/다음 버튼 위치(레이아웃)를 밀어내지 않는다', async () => {
    setup()
    const user = userEvent.setup()
    const { container } = renderPage()
    const before = container.querySelector('.employee-workspace')

    await user.click(screen.getByRole('button', { name: '직원 추가' }))

    expect(container.querySelector('.employee-workspace')).toBe(before)
    expect(container.querySelector('.employee-invite-form')).toBeNull() // 인라인 패널로 열리지 않는다
  })

  it('직원을 추가하면 모달을 닫고 안내를 보여주며 필터를 풀고 새 직원을 선택한다', async () => {
    setup()
    mockedUseInvite.mockReturnValue({
      mutate: (_body: unknown, options: { onSuccess: (value: unknown) => void }) => options.onSuccess({ principalId: 'p-2', status: 'PENDING', invitationExpiresAt: '2026-10-16T05:00:00Z' }),
      isPending: false, isError: false, isSuccess: false,
    } as never)
    const user = userEvent.setup()
    renderPage()
    await user.selectOptions(screen.getByLabelText('상태'), 'ACTIVE')

    await user.click(screen.getByRole('button', { name: '직원 추가' }))
    await user.type(screen.getByLabelText('이메일', { selector: 'form input' }), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름', { selector: 'form input' }), '신입')
    await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '직원 추가하기' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('직원을 추가했습니다. 초대 메일을 보냈으며')
    expect(screen.getByRole('status').parentElement).toBe(document.body) // 상위 요소의 transform과 무관하게 화면 기준 위치에 뜨도록 body에 그린다
    expect(mockedUseEmployees).toHaveBeenLastCalledWith({ status: undefined, role: undefined, q: '', page: 0, size: 5 })
    expect(mockedUseEmployee).toHaveBeenLastCalledWith('p-2')

    await user.click(screen.getByRole('button', { name: '안내 닫기' }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('추가 성공 안내는 8초 뒤 저절로 사라진다', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    try {
      setup()
      mockedUseInvite.mockReturnValue({
        mutate: (_body: unknown, options: { onSuccess: (value: unknown) => void }) => options.onSuccess({ principalId: 'p-2', status: 'PENDING', invitationExpiresAt: '2026-10-16T05:00:00Z' }),
        isPending: false, isError: false, isSuccess: false,
      } as never)
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
      renderPage()
      await user.click(screen.getByRole('button', { name: '직원 추가' }))
      await user.type(screen.getByLabelText('이메일', { selector: 'form input' }), 'new@dozycoffee.com')
      await user.type(screen.getByLabelText('이름', { selector: 'form input' }), '신입')
      await user.click(screen.getByRole('button', { name: '다음' }))
    await user.click(screen.getByRole('button', { name: '직원 추가하기' }))
      expect(screen.getByRole('status')).toBeInTheDocument()

      await act(async () => { vi.advanceTimersByTime(7000) })
      expect(screen.getByRole('status')).toBeInTheDocument()
      await act(async () => { vi.advanceTimersByTime(1500) })

      expect(screen.queryByRole('status')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })

  it('현재 페이지가 마지막 페이지를 넘으면(필터에서 빠진 경우 등) 마지막 페이지로 되돌린다', async () => {
    setup([kim], 3)
    let totalPages = 3
    mockedUseEmployees.mockImplementation((params) => ({
      isLoading: false, isError: false,
      data: { items: [kim], page: { number: params.page, size: 5, totalElements: 20, totalPages } },
    }) as never)
    const user = userEvent.setup()
    renderPage()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(screen.getByText('2 / 3')).toBeInTheDocument()
    // 3페이지로 넘어가는 사이에 목록이 줄어 총 2페이지가 된 상황(예: 3페이지의 직원이 필터에서 빠짐)
    totalPages = 2
    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('2 / 2')).toBeInTheDocument()
    expect(mockedUseEmployees).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))
  })
})
