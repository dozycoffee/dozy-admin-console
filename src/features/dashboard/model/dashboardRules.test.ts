import { describe, expect, it } from 'vitest'
import type { EmployeeDetail } from '../../employee/model/employeeSchemas'
import type { SystemClient } from '../../system-client/model/systemClientSchemas'
import { countClients, daysBetween, expiredInvitations, mayHaveExpired, staleSecretClients } from './dashboardRules'

const now = new Date('2026-10-13T12:00:00Z')
const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3600_000).toISOString()
const daysAgo = (days: number) => hoursAgo(days * 24)

const detail = (overrides: Partial<EmployeeDetail>): EmployeeDetail => ({
  principalId: 'p-1', email: 'a@dozycoffee.com', name: '직원', status: 'PENDING', roles: [], createdAt: daysAgo(5), updatedAt: daysAgo(5),
  invitation: { expiresAt: daysAgo(1) }, ...overrides,
})
const client = (overrides: Partial<SystemClient>): SystemClient => ({ principalId: 'c-1', clientId: 'svc-a', name: 'A', status: 'ACTIVE', roles: [], secretRotatedAt: daysAgo(10), createdAt: daysAgo(200), ...overrides })

describe('daysBetween', () => {
  it('지난 일수를 내림으로 센다', () => {
    expect(daysBetween(hoursAgo(47), now)).toBe(1)
    expect(daysBetween(hoursAgo(48), now)).toBe(2)
  })
})

describe('mayHaveExpired', () => {
  it('초대한 지 72시간이 지나지 않았으면 만료됐을 수 없다', () => {
    expect(mayHaveExpired(hoursAgo(71), now)).toBe(false)
  })

  it('72시간이 지났다면 만료됐을 수 있어 확인 후보가 된다', () => {
    expect(mayHaveExpired(hoursAgo(72), now)).toBe(true)
    expect(mayHaveExpired(daysAgo(10), now)).toBe(true)
  })
})

describe('expiredInvitations', () => {
  it('만료 시각이 지난 초대 대기 직원만 만료된 지 오래된 순으로 돌려준다', () => {
    const result = expiredInvitations([
      detail({ principalId: 'recent', invitation: { expiresAt: daysAgo(1) } }),
      detail({ principalId: 'old', invitation: { expiresAt: daysAgo(6) } }),
      detail({ principalId: 'valid', invitation: { expiresAt: new Date(now.getTime() + 3600_000).toISOString() } }),
    ], now)

    expect(result.map((item) => item.principalId)).toEqual(['old', 'recent'])
    expect(result[0].overdueDays).toBe(6)
  })

  it('초대 대기가 아니거나 초대 정보가 없는 직원은 제외한다', () => {
    const result = expiredInvitations([
      detail({ principalId: 'active', status: 'ACTIVE', invitation: null }),
      detail({ principalId: 'no-invitation', invitation: undefined }),
    ], now)

    expect(result).toEqual([])
  })
})

describe('staleSecretClients', () => {
  it('활성 클라이언트 중 secret 발급 후 90일이 지난 것만 오래된 순으로 돌려준다', () => {
    const result = staleSecretClients([
      client({ principalId: 'fresh', secretRotatedAt: daysAgo(89) }),
      client({ principalId: 'stale', secretRotatedAt: daysAgo(120) }),
      client({ principalId: 'older', secretRotatedAt: daysAgo(400) }),
      client({ principalId: 'suspended', status: 'SUSPENDED', secretRotatedAt: daysAgo(500) }),
    ], now)

    expect(result.map((entry) => entry.client.principalId)).toEqual(['older', 'stale'])
    expect(result[0].ageDays).toBe(400)
  })

  it('재발급 기록이 없으면 등록일 기준으로 센다', () => {
    const result = staleSecretClients([client({ principalId: 'never', secretRotatedAt: null, createdAt: daysAgo(100) })], now)

    expect(result).toHaveLength(1)
    expect(result[0].ageDays).toBe(100)
  })

  it('기준 일수는 바꿀 수 있다', () => {
    expect(staleSecretClients([client({ secretRotatedAt: daysAgo(40) })], now, 30)).toHaveLength(1)
  })
})

describe('countClients', () => {
  it('상태별 개수를 센다', () => {
    expect(countClients([client({}), client({}), client({ status: 'SUSPENDED' }), client({ status: 'DEACTIVATED' })])).toEqual({ active: 2, suspended: 1, deactivated: 1 })
  })
})
