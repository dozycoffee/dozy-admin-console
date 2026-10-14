import { renderHook, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { authHttpClient } from '../../../shared/api/httpClient'
import { createQueryClientWrapper } from '../../../shared/testing/queryClientWrapper'
import { useAccountDashboard } from './useAccountDashboard'

const now = new Date('2026-10-13T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString()
const daysAgo = (days: number) => hoursAgo(days * 24)

const page = (items: unknown[], totalElements = items.length) => ({ items, page: { number: 0, size: 100, totalElements, totalPages: 1 } })
const employee = (id: string, overrides: Record<string, unknown> = {}) => ({ principalId: id, email: `${id}@dozycoffee.com`, name: id, status: 'ACTIVE', roles: ['wms:warehouse_manager'], createdAt: daysAgo(30), ...overrides })
const detail = (id: string, expiresAt: string) => ({ ...employee(id, { status: 'PENDING', roles: [] }), updatedAt: daysAgo(1), invitation: { expiresAt } })
const client = (id: string, overrides: Record<string, unknown> = {}) => ({ principalId: id, clientId: `svc-${id}`, name: id, status: 'ACTIVE', roles: [], secretRotatedAt: daysAgo(10), createdAt: daysAgo(200), ...overrides })
const log = (id: number, action: string) => ({ id, occurredAt: hoursAgo(1), actorId: null, actorType: null, action, targetType: null, targetId: null, detail: null, ip: null })

type Fixture = Partial<{
  active: unknown; pending: unknown; suspended: unknown; deactivated: unknown; details: Record<string, unknown>
  clients: unknown[]; roles: unknown[]; login: unknown; recent: unknown
}>

function mockApi(fixture: Fixture = {}) {
  const calls: Array<{ url: string; params?: Record<string, unknown> }> = []
  vi.spyOn(authHttpClient, 'get').mockImplementation(async (url: string, config?: { params?: unknown }) => {
    const params = (config?.params ?? {}) as Record<string, unknown>
    calls.push({ url, params })
    if (url === '/admin/employees') {
      const byStatus: Record<string, unknown> = {
        ACTIVE: fixture.active ?? page([]), PENDING: fixture.pending ?? page([]), SUSPENDED: fixture.suspended ?? page([]), DEACTIVATED: fixture.deactivated ?? page([]),
      }
      return { data: byStatus[params.status as string] }
    }
    if (url.startsWith('/admin/employees/')) return { data: fixture.details?.[url.split('/').pop()!] }
    if (url === '/admin/system-clients') return { data: { items: fixture.clients ?? [] } }
    if (url === '/admin/roles') return { data: { items: fixture.roles ?? [] } }
    if (url === '/admin/audit-logs') return { data: params.action ? (fixture.login ?? page([])) : (fixture.recent ?? page([])) }
    throw new Error(`unexpected GET ${url}`)
  })
  return calls
}

afterEach(() => vi.restoreAllMocks())

function render(canViewAudit: boolean) {
  return renderHook(() => useAccountDashboard({ now, canViewAudit }), { wrapper: createQueryClientWrapper() })
}

describe('useAccountDashboard', () => {
  it('처음에는 모두 불러오는 중이다', () => {
    mockApi()

    const { result } = render(true)

    expect(result.current.tasks.suspended.status).toBe('loading')
    expect(result.current.stats.employees.status).toBe('loading')
  })

  it('초대한 지 72시간이 지난 대기 직원만 상세를 조회해 만료된 사람을 찾는다', async () => {
    const calls = mockApi({
      pending: page([employee('fresh', { status: 'PENDING', createdAt: hoursAgo(10) }), employee('old', { status: 'PENDING', createdAt: daysAgo(10) }), employee('resent', { status: 'PENDING', createdAt: daysAgo(10) })]),
      details: { old: detail('old', daysAgo(4)), resent: detail('resent', new Date(now.getTime() + 3600_000).toISOString()) },
    })

    const { result } = render(true)

    await waitFor(() => expect(result.current.tasks.expiredInvitations.status).toBe('ready'))
    const task = result.current.tasks.expiredInvitations
    if (task.status !== 'ready') throw new Error('not ready')
    expect(task.count).toBe(1)
    expect(task.items[0]).toMatchObject({ principalId: 'old', overdueDays: 4 })
    const detailCalls = calls.filter((call) => call.url.startsWith('/admin/employees/')).map((call) => call.url)
    expect(detailCalls.sort()).toEqual(['/admin/employees/old', '/admin/employees/resent']) // 최근에 초대한 직원은 조회하지 않는다
  })

  it('정지된 직원은 서버의 총 건수로 센다', async () => {
    mockApi({ suspended: page([employee('s1', { status: 'SUSPENDED' })], 7) })

    const { result } = render(true)

    await waitFor(() => expect(result.current.tasks.suspended.status).toBe('ready'))
    const suspended = result.current.tasks.suspended
    if (suspended.status !== 'ready') throw new Error('not ready')
    expect(suspended.count).toBe(7)
  })

  it('활성 클라이언트 중 secret이 90일 넘은 것만 오래된 순으로 센다', async () => {
    mockApi({ clients: [client('fresh'), client('stale', { secretRotatedAt: daysAgo(120) }), client('never', { secretRotatedAt: null, createdAt: daysAgo(300) }), client('off', { status: 'SUSPENDED', secretRotatedAt: daysAgo(500) })] })

    const { result } = render(true)

    await waitFor(() => expect(result.current.tasks.staleSecrets.status).toBe('ready'))
    const task = result.current.tasks.staleSecrets
    if (task.status !== 'ready') throw new Error('not ready')
    expect(task.items.map((entry) => entry.client.principalId)).toEqual(['never', 'stale'])
  })

  it('현황 요약은 직원 상태별 인원, 클라이언트 상태별 수, role 수와 사용되지 않는 role 수를 보여준다', async () => {
    mockApi({
      active: page([employee('a')], 8), pending: page([employee('p', { status: 'PENDING', createdAt: hoursAgo(1) })], 2), suspended: page([], 1), deactivated: page([], 4),
      clients: [client('a'), client('b', { status: 'SUSPENDED' })],
      roles: [{ id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 0 }, { id: 2, audience: 'wms', code: 'x', fullCode: 'wms:x', name: 'X', description: null, isSystem: false, grantedCount: 0 }, { id: 3, audience: 'wms', code: 'y', fullCode: 'wms:y', name: 'Y', description: null, isSystem: false, grantedCount: 3 }],
    })

    const { result } = render(true)

    await waitFor(() => expect(result.current.stats.employees.status).toBe('ready'))
    await waitFor(() => expect(result.current.stats.roles.status).toBe('ready'))
    expect(result.current.stats.employees).toMatchObject({ active: 8, pending: 2, suspended: 1, deactivated: 4 })
    expect(result.current.stats.clients).toMatchObject({ active: 1, suspended: 1 })
    expect(result.current.stats.roles).toMatchObject({ total: 3, unused: 1 }) // system role은 사용 여부와 상관없이 제외
  })

  it('owner는 최근 24시간 로그인 실패·잠금과 최근 활동을 감사 로그에서 받는다', async () => {
    const calls = mockApi({ login: page([log(2, 'LOGIN_FAILED'), log(1, 'ACCOUNT_LOCKED')], 5), recent: page([log(9, 'ROLE_GRANTED')], 40) })

    const { result } = render(true)

    await waitFor(() => expect(result.current.tasks.loginAlerts?.status).toBe('ready'))
    await waitFor(() => expect(result.current.recent?.status).toBe('ready'))
    const login = result.current.tasks.loginAlerts
    if (login?.status !== 'ready') throw new Error('not ready')
    expect(login.count).toBe(5)
    const loginCall = calls.find((call) => call.url === '/admin/audit-logs' && call.params?.action)!
    expect(loginCall.params).toMatchObject({ action: 'LOGIN_FAILED,ACCOUNT_LOCKED', from: hoursAgo(24) })
  })

  it('owner가 아니면 감사 로그를 요청하지 않고 감사 로그 기반 항목은 없다', async () => {
    const calls = mockApi()

    const { result } = render(false)

    await waitFor(() => expect(result.current.tasks.suspended.status).toBe('ready'))
    expect(result.current.tasks.loginAlerts).toBeNull()
    expect(result.current.recent).toBeNull()
    expect(calls.some((call) => call.url === '/admin/audit-logs')).toBe(false)
  })

  it('요청이 실패한 항목만 오류가 되고 나머지는 그대로 보여준다', async () => {
    mockApi()
    vi.spyOn(authHttpClient, 'get').mockImplementation(async (url: string, config?: { params?: unknown }) => {
      if (url === '/admin/system-clients') throw new Error('boom')
      if (url === '/admin/employees') return { data: page([]) }
      if (url === '/admin/roles') return { data: { items: [] } }
      if (url === '/admin/audit-logs') return { data: page([]) }
      throw new Error(`unexpected GET ${url} ${JSON.stringify(config)}`)
    })

    const { result } = render(true)

    await waitFor(() => expect(result.current.tasks.staleSecrets.status).toBe('error'))
    await waitFor(() => expect(result.current.tasks.suspended.status).toBe('ready'))
  })
})
