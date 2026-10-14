import { useQueries } from '@tanstack/react-query'
import type { AuditLog } from '../../audit/model/auditSchemas'
import { useAuditLogs } from '../../audit/model/useAuditLogs'
import { employeeDetailKey, fetchEmployeeDetail, useEmployees } from '../../employee/model/useEmployees'
import type { EmployeeSummary } from '../../employee/model/employeeSchemas'
import { useRoles } from '../../role/model/useRoles'
import { useSystemClients } from '../../system-client/model/useSystemClients'
import {
  countClients, EXPIRY_LOOKUP_LIMIT, expiredInvitations, LOGIN_ALERT_WINDOW_HOURS, loginAlertActions, mayHaveExpired,
  staleSecretClients, TASK_PREVIEW_LIMIT, type ClientCounts, type ExpiredInvitation, type StaleSecretClient,
} from './dashboardRules'

/** 초대 대기 직원을 한 번에 훑는 인원 */
const PENDING_SCAN_SIZE = 50
const RECENT_ACTIVITY_SIZE = 5

export type TaskState<T> =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | {
    status: 'ready'
    /** 처리가 필요한 전체 건수(훑은 범위 안에서) */
    count: number
    /** 카드에 미리 보여줄 항목(최대 `TASK_PREVIEW_LIMIT`) */
    items: T[]
    /** 한 번에 훑는 범위를 넘어 일부만 센 경우 true */
    partial: boolean
  }

export type EmployeeStats = { active: number; pending: number; suspended: number; deactivated: number }

export type AccountDashboard = {
  tasks: {
    expiredInvitations: TaskState<ExpiredInvitation>
    suspended: TaskState<EmployeeSummary>
    staleSecrets: TaskState<StaleSecretClient>
    /** owner만. 로그인 실패·잠금 기록 */
    loginAlerts: TaskState<AuditLog> | null
  }
  stats: {
    employees: { status: 'loading' } | { status: 'error'; error: unknown } | ({ status: 'ready' } & EmployeeStats)
    clients: { status: 'loading' } | { status: 'error'; error: unknown } | ({ status: 'ready' } & ClientCounts)
    roles: { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; total: number; unused: number }
  }
  /** owner만. 감사 로그 최신 기록 */
  recent: TaskState<AuditLog> | null
}

type QueryLike<T> = { isLoading: boolean; isError: boolean; error: unknown; data: T | undefined }

function fromQuery<T, R>(query: QueryLike<T>, ready: (data: T) => R): { status: 'loading' } | { status: 'error'; error: unknown } | ({ status: 'ready' } & R) {
  if (query.isError) return { status: 'error', error: query.error }
  if (query.data === undefined) return { status: 'loading' }
  return { status: 'ready', ...ready(query.data) }
}

/**
 * 계정 관리자 대시보드에 필요한 데이터를 dozy-auth 관리 API에서 모아 "처리가 필요한 일"과 현황으로 정리한다.
 * `now`는 기간 계산의 기준이다(바꾸면 쿼리 키가 달라져 새로 조회한다). 감사 로그 기반 항목은 owner만 조회할 수 있어 `canViewAudit`가 false이면 요청하지 않는다.
 */
export function useAccountDashboard({ now, canViewAudit }: { now: Date; canViewAudit: boolean }): AccountDashboard {
  const active = useEmployees({ status: 'ACTIVE', page: 0, size: 1 })
  const pending = useEmployees({ status: 'PENDING', page: 0, size: PENDING_SCAN_SIZE })
  const suspended = useEmployees({ status: 'SUSPENDED', page: 0, size: TASK_PREVIEW_LIMIT })
  const deactivated = useEmployees({ status: 'DEACTIVATED', page: 0, size: 1 })
  const clients = useSystemClients()
  const roles = useRoles()
  const loginFrom = new Date(now.getTime() - LOGIN_ALERT_WINDOW_HOURS * 3600_000).toISOString()
  const loginAlerts = useAuditLogs({ from: loginFrom, actions: loginAlertActions, page: 0, size: TASK_PREVIEW_LIMIT }, { enabled: canViewAudit })
  const recent = useAuditLogs({ actions: [], page: 0, size: RECENT_ACTIVITY_SIZE }, { enabled: canViewAudit })

  // 초대한 지 72시간이 지난 직원만 상세로 만료 시각을 확인한다(재발송으로 만료가 늦춰졌을 수 있어서).
  const pendingItems = pending.data?.items ?? []
  const candidates = pendingItems.filter((employee) => mayHaveExpired(employee.createdAt, now)).slice(0, EXPIRY_LOOKUP_LIMIT)
  const details = useQueries({
    queries: candidates.map((employee) => ({ queryKey: employeeDetailKey(employee.principalId), queryFn: () => fetchEmployeeDetail(employee.principalId), staleTime: 30_000 })),
  })
  const detailsSettled = pending.data !== undefined && details.every((query) => !query.isLoading)

  const expiredTask: TaskState<ExpiredInvitation> = pending.isError
    ? { status: 'error', error: pending.error }
    : !detailsSettled
      ? { status: 'loading' }
      : (() => {
        const expired = expiredInvitations(details.flatMap((query) => (query.data ? [query.data] : [])), now)
        const partial = (pending.data?.page.totalElements ?? 0) > PENDING_SCAN_SIZE || pendingItems.filter((employee) => mayHaveExpired(employee.createdAt, now)).length > EXPIRY_LOOKUP_LIMIT
        return { status: 'ready', count: expired.length, items: expired.slice(0, TASK_PREVIEW_LIMIT), partial }
      })()

  const suspendedTask: TaskState<EmployeeSummary> = fromQuery(suspended, (data) => ({ count: data.page.totalElements, items: data.items.slice(0, TASK_PREVIEW_LIMIT), partial: false }))

  const staleTask: TaskState<StaleSecretClient> = fromQuery(clients, (data) => {
    const list = staleSecretClients(data, now)
    return { count: list.length, items: list.slice(0, TASK_PREVIEW_LIMIT), partial: false }
  })

  const loginTask: TaskState<AuditLog> | null = canViewAudit ? fromQuery(loginAlerts, (data) => ({ count: data.page.totalElements, items: data.items.slice(0, TASK_PREVIEW_LIMIT), partial: false })) : null
  const recentTask: TaskState<AuditLog> | null = canViewAudit ? fromQuery(recent, (data) => ({ count: data.page.totalElements, items: data.items, partial: false })) : null

  const employeeStats = ((): AccountDashboard['stats']['employees'] => {
    const queries = [active, pending, suspended, deactivated]
    const failed = queries.find((query) => query.isError)
    if (failed) return { status: 'error', error: failed.error }
    if (queries.some((query) => query.data === undefined)) return { status: 'loading' }
    return { status: 'ready', active: active.data!.page.totalElements, pending: pending.data!.page.totalElements, suspended: suspended.data!.page.totalElements, deactivated: deactivated.data!.page.totalElements }
  })()

  return {
    tasks: { expiredInvitations: expiredTask, suspended: suspendedTask, staleSecrets: staleTask, loginAlerts: loginTask },
    stats: {
      employees: employeeStats,
      clients: fromQuery(clients, (data) => countClients(data)),
      roles: fromQuery(roles, (data) => ({ total: data.length, unused: data.filter((role) => !role.isSystem && role.grantedCount === 0).length })),
    },
    recent: recentTask,
  }
}
