import type { AuditLog } from '../../audit/model/auditSchemas'
import type { EmployeeDetail } from '../../employee/model/employeeSchemas'
import type { SystemClient } from '../../system-client/model/systemClientSchemas'

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

/** 초대 링크 유효 기간(dozy-auth 72시간). 재발송은 만료 시각을 늦출 뿐 앞당기지 않으므로, 이 시간이 지나지 않은 초대는 만료됐을 수 없다. */
export const INVITATION_VALID_MS = 72 * HOUR_MS
/** secret 발급 후 이 일수가 지나면 재발급을 권장한다 */
export const STALE_SECRET_DAYS = 90
/** 처리가 필요한 일 카드에 미리 보여줄 항목 수 */
export const TASK_PREVIEW_LIMIT = 3
/** 대기 중인 초대 중 만료 여부를 상세로 확인할 최대 인원 */
export const EXPIRY_LOOKUP_LIMIT = 20
/** 로그인 실패·잠금을 세는 기간(시간) */
export const LOGIN_ALERT_WINDOW_HOURS = 24

export const loginAlertActions = ['LOGIN_FAILED', 'ACCOUNT_LOCKED']

export function daysBetween(fromIso: string, now: Date): number {
  return Math.floor((now.getTime() - new Date(fromIso).getTime()) / DAY_MS)
}

/** 초대한 지 72시간이 지났다면 만료됐을 수 있어 상세로 만료 시각을 확인할 후보다. */
export function mayHaveExpired(createdAt: string, now: Date): boolean {
  return now.getTime() - new Date(createdAt).getTime() >= INVITATION_VALID_MS
}

export type ExpiredInvitation = { principalId: string; name: string; email: string; expiresAt: string; overdueDays: number }

/** 상세의 초대 만료 시각이 지난 직원만 만료 시각이 오래된 순으로 돌려준다. */
export function expiredInvitations(details: readonly EmployeeDetail[], now: Date): ExpiredInvitation[] {
  return details
    .filter((detail) => detail.status === 'PENDING' && detail.invitation && new Date(detail.invitation.expiresAt).getTime() < now.getTime())
    .map((detail) => ({ principalId: detail.principalId, name: detail.name, email: detail.email, expiresAt: detail.invitation!.expiresAt, overdueDays: daysBetween(detail.invitation!.expiresAt, now) }))
    .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime())
}

export type StaleSecretClient = { client: SystemClient; ageDays: number }

/** 활성 클라이언트 중 secret 발급(없으면 등록) 후 `days`일이 지난 것을 오래된 순으로 돌려준다. */
export function staleSecretClients(clients: readonly SystemClient[], now: Date, days = STALE_SECRET_DAYS): StaleSecretClient[] {
  return clients
    .filter((client) => client.status === 'ACTIVE')
    .map((client) => ({ client, ageDays: daysBetween(client.secretRotatedAt ?? client.createdAt, now) }))
    .filter((entry) => entry.ageDays >= days)
    .sort((a, b) => b.ageDays - a.ageDays)
}

export type ClientCounts = { active: number; suspended: number; deactivated: number }

export function countClients(clients: readonly SystemClient[]): ClientCounts {
  return {
    active: clients.filter((client) => client.status === 'ACTIVE').length,
    suspended: clients.filter((client) => client.status === 'SUSPENDED').length,
    deactivated: clients.filter((client) => client.status === 'DEACTIVATED').length,
  }
}

/** 로그인 실패·잠금 기록을 계정별로 묶지 않고 건수와 최근 기록을 그대로 보여주기 위한 요약 */
export type LoginAlert = Pick<AuditLog, 'id' | 'occurredAt' | 'action' | 'actorId' | 'ip'>
