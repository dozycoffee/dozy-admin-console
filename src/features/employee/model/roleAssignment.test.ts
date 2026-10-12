import { describe, expect, it } from 'vitest'
import type { Role } from '../../role/model/roleSchemas'
import { assignableRoles, grantBlockedReason, revokeBlockedReason } from './roleAssignment'

const role = (fullCode: string, isSystem = false): Role => {
  const [audience, code] = fullCode.split(':')
  return { id: 1, audience, code, fullCode, name: fullCode, description: null, isSystem, grantedCount: 0 }
}
const all = [role('auth:owner', true), role('auth:admin', true), role('wms:warehouse_manager'), role('wms:hq_inventory_manager')]

describe('assignableRoles', () => {
  it('owner role은 누구에게도 부여할 수 없다(GOV-05)', () => {
    expect(assignableRoles(all, [], true).map((r) => r.fullCode)).not.toContain('auth:owner')
    expect(assignableRoles(all, [], false).map((r) => r.fullCode)).not.toContain('auth:owner')
  })

  it('auth:admin은 owner에게만 선택지로 보인다(GOV-05)', () => {
    expect(assignableRoles(all, [], true).map((r) => r.fullCode)).toContain('auth:admin')
    expect(assignableRoles(all, [], false).map((r) => r.fullCode)).not.toContain('auth:admin')
  })

  it('이미 가진 role은 선택지에서 뺀다', () => {
    expect(assignableRoles(all, ['wms:warehouse_manager'], false).map((r) => r.fullCode)).toEqual(['wms:hq_inventory_manager'])
  })

  it('role이 없으면 빈 목록이다', () => {
    expect(assignableRoles([], [], true)).toEqual([])
  })
})

describe('revokeBlockedReason', () => {
  it('owner role은 회수할 수 없다', () => {
    expect(revokeBlockedReason('auth:owner', true)).toMatch(/owner를 양도/)
  })

  it('admin 해임은 owner만 할 수 있다', () => {
    expect(revokeBlockedReason('auth:admin', false)).toBe('admin 해임은 owner만 할 수 있습니다.')
    expect(revokeBlockedReason('auth:admin', true)).toBeNull()
  })

  it('일반 role은 누구나 회수할 수 있다', () => {
    expect(revokeBlockedReason('wms:warehouse_manager', false)).toBeNull()
  })
})

describe('grantBlockedReason', () => {
  it('자기 자신에게는 부여할 수 없다(GOV-04)', () => {
    expect(grantBlockedReason({ status: 'ACTIVE', isSelf: true })).toBe('자기 자신에게는 role을 부여할 수 없습니다.')
  })

  it('정지·비활성화된 직원에게는 부여할 수 없다(GOV-07)', () => {
    expect(grantBlockedReason({ status: 'SUSPENDED', isSelf: false })).toMatch(/정지를 해제/)
    expect(grantBlockedReason({ status: 'DEACTIVATED', isSelf: false })).toMatch(/비활성화/)
  })

  it('초대 대기·활성 직원에게는 부여할 수 있다(GOV-07)', () => {
    expect(grantBlockedReason({ status: 'PENDING', isSelf: false })).toBeNull()
    expect(grantBlockedReason({ status: 'ACTIVE', isSelf: false })).toBeNull()
  })
})
