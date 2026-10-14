import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { useAccountDashboard, type AccountDashboard as Dashboard, type TaskState } from '../../features/dashboard/model/useAccountDashboard'
import { AccountDashboard } from './AccountDashboard'

vi.mock('../../features/dashboard/model/useAccountDashboard')

const ready = <T,>(items: T[], count = items.length, partial = false): TaskState<T> => ({ status: 'ready', count, items, partial })
const employee = (id: string, name: string) => ({ principalId: id, email: `${id}@dozycoffee.com`, name, status: 'ACTIVE' as const, roles: [] as string[], createdAt: '2026-09-01T00:00:00Z' })
const log = (id: number, action: string) => ({ id, occurredAt: '2026-10-13T03:00:00Z', actorId: null, actorType: null, action, targetType: null, targetId: null, detail: null, ip: '203.0.113.7' })

function dashboard(overrides: Partial<Dashboard['tasks']> & { recent?: Dashboard['recent']; stats?: Partial<Dashboard['stats']> } = {}): Dashboard {
  const { recent, stats, ...tasks } = overrides
  return {
    tasks: {
      expiredInvitations: ready([{ principalId: 'p-1', name: '한소율', email: 'han@dozycoffee.com', expiresAt: '2026-10-09T00:00:00Z', overdueDays: 4 }]),
      suspended: ready([employee('p-3', '강현우')]),
      staleSecrets: ready([{ client: { principalId: 'c-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: [], secretRotatedAt: '2026-06-01T00:00:00Z', createdAt: '2026-01-01T00:00:00Z' }, ageDays: 130 }]),
      loginAlerts: ready([log(7, 'LOGIN_FAILED')], 3),
      ...tasks,
    },
    stats: {
      employees: { status: 'ready', active: 9, pending: 2, suspended: 1, deactivated: 4 },
      clients: { status: 'ready', active: 2, suspended: 1, deactivated: 0 },
      roles: { status: 'ready', total: 5, unused: 1 },
      ...stats,
    },
    recent: recent === undefined ? ready([log(9, 'ROLE_GRANTED')], 40) : recent,
  }
}

function renderPage(data: Dashboard, granted: Permission[] = [permissions.accountRead, permissions.accountWrite, permissions.accountManage]) {
  vi.mocked(useAccountDashboard).mockReturnValue(data)
  const queryClient = new QueryClient()
  const invalidate = vi.spyOn(queryClient, 'invalidateQueries')
  render(
    <QueryClientProvider client={queryClient}>
      <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
        <MemoryRouter><AccountDashboard /></MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>,
  )
  return { invalidate }
}

const card = (name: string) => screen.getByRole('region', { name })

beforeEach(() => vi.clearAllMocks())

describe('AccountDashboard', () => {
  it('처리가 필요한 일 카드마다 건수와 미리 보여줄 항목, 전체 보기 링크를 보여준다', () => {
    renderPage(dashboard())

    const expired = card('초대가 만료된 직원')
    expect(within(expired).getByLabelText('1건')).toHaveTextContent('1')
    expect(within(expired).getByText('한소율')).toBeInTheDocument()
    expect(within(expired).getByText(/han@dozycoffee\.com · 만료 4일 경과/)).toBeInTheDocument()
    expect(within(expired).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/employees?status=PENDING')
    expect(within(card('정지된 직원')).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/employees?status=SUSPENDED')
    expect(within(card('secret이 오래된 시스템 클라이언트')).getByText(/svc-store · secret 130일 경과/)).toBeInTheDocument()
    expect(within(card('secret이 오래된 시스템 클라이언트')).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/system-clients')
  })

  it('만료 당일은 "오늘 만료", 발급 기록이 없는 클라이언트는 등록 기준 경과일로 보여준다', () => {
    renderPage(dashboard({
      expiredInvitations: ready([{ principalId: 'p-1', name: '한소율', email: 'h@dozycoffee.com', expiresAt: '2026-10-13T00:00:00Z', overdueDays: 0 }]),
      staleSecrets: ready([{ client: { principalId: 'c-1', clientId: 'svc-new', name: '신규', status: 'ACTIVE', roles: [], secretRotatedAt: null, createdAt: '2026-06-01T00:00:00Z' }, ageDays: 120 }]),
    }))

    expect(screen.getByText(/오늘 만료/)).toBeInTheDocument()
    expect(screen.getByText(/발급 기록 없음 · 등록 120일 경과/)).toBeInTheDocument()
  })

  it('미리 보여주는 것보다 건수가 많으면 나머지 건수를 알려 준다', () => {
    renderPage(dashboard({ suspended: ready([employee('a', '가'), employee('b', '나'), employee('c', '다')], 7) }))

    expect(within(card('정지된 직원')).getByText('외 4건')).toBeInTheDocument()
  })

  it('처리할 일이 없으면 그렇게 알리고 항목은 보여주지 않는다', () => {
    renderPage(dashboard({ expiredInvitations: ready([]) }))

    const expired = card('초대가 만료된 직원')
    expect(within(expired).getByText('처리할 일이 없습니다.')).toBeInTheDocument()
    expect(within(expired).queryByRole('list')).not.toBeInTheDocument()
  })

  it('한 번에 훑는 범위를 넘어 일부만 센 경우 그 기준을 안내한다', () => {
    renderPage(dashboard({ expiredInvitations: ready([], 0, true) }))

    expect(within(card('초대가 만료된 직원')).getByText(/초대 대기 직원 중 일부 기준입니다/)).toBeInTheDocument()
  })

  it('불러오는 중과 오류를 카드별로 보여준다', () => {
    renderPage(dashboard({ expiredInvitations: { status: 'loading' }, staleSecrets: { status: 'error', error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }) } }))

    expect(within(card('초대가 만료된 직원')).getByText('불러오는 중입니다...')).toBeInTheDocument()
    expect(within(card('secret이 오래된 시스템 클라이언트')).getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
    expect(within(card('정지된 직원')).getByText('강현우')).toBeInTheDocument() // 다른 카드는 그대로
  })

  it('현황 요약에 직원 상태별 인원, 시스템 클라이언트, role 수를 보여주고 각 화면으로 연결한다', () => {
    renderPage(dashboard())

    const stats = screen.getByRole('region', { name: '현황 요약' })
    expect(within(stats).getByRole('link', { name: /9\s*활성/ })).toHaveAttribute('href', '/employees?status=ACTIVE')
    expect(within(stats).getByRole('link', { name: /2\s*초대 대기/ })).toHaveAttribute('href', '/employees?status=PENDING')
    expect(within(stats).getByRole('link', { name: /4\s*비활성화/ })).toHaveAttribute('href', '/employees?status=DEACTIVATED')
    expect(within(stats).getByRole('link', { name: /5\s*전체/ })).toHaveAttribute('href', '/roles')
    expect(within(stats).getByText('시스템 클라이언트')).toBeInTheDocument()
  })

  it('owner에게는 로그인 실패·잠금 카드와 최근 활동(분류 칩 포함)을 보여준다', () => {
    renderPage(dashboard())

    const login = card('로그인 실패·잠금 (24시간)')
    expect(within(login).getByText('로그인 실패')).toBeInTheDocument()
    expect(within(login).getByText(/203\.0\.113\.7/)).toBeInTheDocument()
    expect(within(login).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/audit-logs')
    const recent = screen.getByRole('region', { name: '최근 활동' })
    expect(within(recent).getByText('role 부여')).toBeInTheDocument()
    expect(within(recent).getByText('role·서비스')).toHaveClass('audit-cat-role')
    expect(within(recent).getByRole('link', { name: /감사 로그 보기/ })).toHaveAttribute('href', '/audit-logs')
  })

  it('owner가 아니면 감사 로그 기반 항목을 보여주지 않고 요청도 owner 여부로 알린다', () => {
    renderPage(dashboard({ loginAlerts: null, recent: null }), [permissions.accountRead, permissions.accountWrite])

    expect(screen.queryByRole('region', { name: '로그인 실패·잠금 (24시간)' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '최근 활동' })).not.toBeInTheDocument()
    expect(vi.mocked(useAccountDashboard)).toHaveBeenLastCalledWith(expect.objectContaining({ canViewAudit: false }))
  })

  it('owner이면 감사 로그도 조회하도록 요청한다', () => {
    renderPage(dashboard())

    expect(vi.mocked(useAccountDashboard)).toHaveBeenLastCalledWith(expect.objectContaining({ canViewAudit: true }))
  })

  it('최근 기록이 없으면 안내한다', () => {
    renderPage(dashboard({ recent: ready([]) }))

    expect(within(screen.getByRole('region', { name: '최근 활동' })).getByText('최근 기록이 없습니다.')).toBeInTheDocument()
  })

  it('새로고침을 누르면 관련 조회를 다시 불러오고 기준 시각을 갱신한다', async () => {
    const { invalidate } = renderPage(dashboard())
    const callsBefore = vi.mocked(useAccountDashboard).mock.calls.length
    const nowBefore = vi.mocked(useAccountDashboard).mock.calls.at(-1)![0].now

    await userEvent.setup().click(screen.getByRole('button', { name: '새로고침' }))

    const keys = invalidate.mock.calls.map(([filters]) => (filters as { queryKey: string[] }).queryKey[0])
    expect(keys).toEqual(expect.arrayContaining(['employees', 'system-clients', 'roles', 'audit-logs']))
    expect(vi.mocked(useAccountDashboard).mock.calls.length).toBeGreaterThan(callsBefore)
    expect(vi.mocked(useAccountDashboard).mock.calls.at(-1)![0].now.getTime()).toBeGreaterThanOrEqual(nowBefore.getTime())
  })
})
