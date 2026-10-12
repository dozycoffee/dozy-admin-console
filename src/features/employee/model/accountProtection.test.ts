import { describe, expect, it } from 'vitest'
import { blockedReason, type ProtectedAction } from './accountProtection'

const actions: ProtectedAction[] = ['edit', 'invitation', 'suspend', 'reactivate', 'deactivate', 'password-reset']

describe('blockedReason', () => {
  it('GOV-03 owner 계정은 owner 자신도 정지·비활성화할 수 없다', () => {
    expect(blockedReason('suspend', ['auth:owner'], true)).toMatch(/먼저 owner를 양도/)
    expect(blockedReason('deactivate', ['auth:owner'], true)).toMatch(/먼저 owner를 양도/)
  })

  it('GOV-02 admin은 owner·admin 계정에 어떤 변경도 할 수 없다', () => {
    for (const action of actions) {
      expect(blockedReason(action, ['auth:admin'], false)).toBe('owner·admin 계정은 owner만 변경할 수 있습니다.')
      expect(blockedReason(action, ['auth:owner'], false)).not.toBeNull()
    }
  })

  it('owner는 admin 계정을 변경할 수 있다', () => {
    for (const action of actions) expect(blockedReason(action, ['auth:admin'], true)).toBeNull()
  })

  it('owner도 owner 계정의 정보 수정·재설정 메일 발송은 할 수 있다', () => {
    expect(blockedReason('edit', ['auth:owner'], true)).toBeNull()
    expect(blockedReason('password-reset', ['auth:owner'], true)).toBeNull()
  })

  it('일반 직원은 admin도 owner도 변경할 수 있다', () => {
    for (const action of actions) {
      expect(blockedReason(action, ['wms:warehouse_manager'], false)).toBeNull()
      expect(blockedReason(action, [], false)).toBeNull()
    }
  })
})
