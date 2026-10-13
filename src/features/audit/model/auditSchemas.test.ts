import { describe, expect, it } from 'vitest'
import { auditActionCategory, auditActionGroups, auditActionLabel, auditLogPageSchema } from './auditSchemas'

describe('auditActionLabel', () => {
  it('알려진 action은 한글 이름으로 바꾼다', () => {
    expect(auditActionLabel('ROLE_GRANTED')).toBe('role 부여')
    expect(auditActionLabel('OWNER_TRANSFERRED')).toBe('owner 양도 완료')
  })

  it('목록에 없는 새 action은 코드를 그대로 보여준다', () => {
    expect(auditActionLabel('SOMETHING_NEW')).toBe('SOMETHING_NEW')
  })
})

describe('auditActionCategory', () => {
  it('action이 속한 분류의 id와 이름을 돌려준다', () => {
    expect(auditActionCategory('LOGIN_FAILED')).toEqual({ id: 'session', label: '로그인·세션' })
    expect(auditActionCategory('PASSWORD_CHANGED')).toEqual({ id: 'password', label: '비밀번호' })
    expect(auditActionCategory('ACCOUNT_SUSPENDED')).toEqual({ id: 'account', label: '계정' })
    expect(auditActionCategory('ROLE_GRANTED')).toEqual({ id: 'role', label: 'role·서비스' })
    expect(auditActionCategory('OWNER_TRANSFERRED')).toEqual({ id: 'client', label: '시스템 클라이언트·owner' })
  })

  it('목록에 없는 새 action은 분류가 없다', () => {
    expect(auditActionCategory('SOMETHING_NEW')).toBeNull()
  })

  it('모든 action이 정확히 한 분류에 속하고 분류 id는 서로 다르다', () => {
    const ids = auditActionGroups.map((group) => group.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(auditActionGroups.flatMap((group) => group.actions).every((action) => auditActionCategory(action.code) !== null)).toBe(true)
  })
})

describe('auditActionGroups', () => {
  it('dozy-auth의 감사 action 26개를 중복 없이 모두 담는다(AUD-01)', () => {
    const codes = auditActionGroups.flatMap((group) => group.actions.map((action) => action.code))

    expect(codes).toHaveLength(26)
    expect(new Set(codes).size).toBe(26)
  })
})

describe('auditLogPageSchema', () => {
  const log = {
    id: 1024, occurredAt: '2026-09-24T05:00:00Z', actorId: '0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24', actorType: 'employee', action: 'ROLE_GRANTED',
    targetType: 'PRINCIPAL', targetId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f', detail: { roles: ['wms:inbound_manager'] }, ip: '203.0.113.10',
  }
  const page = { number: 0, size: 20, totalElements: 1, totalPages: 1 }

  it('감사 로그 응답을 파싱한다', () => {
    expect(auditLogPageSchema.parse({ items: [log], page }).items[0].detail).toEqual({ roles: ['wms:inbound_manager'] })
  })

  it('시스템 작업처럼 행위자·대상·detail·ip가 null이어도 파싱한다', () => {
    const result = auditLogPageSchema.parse({ items: [{ ...log, actorId: null, actorType: null, targetType: null, targetId: null, detail: null, ip: null }], page })

    expect(result.items[0].actorId).toBeNull()
  })

  it('필수 필드가 없으면 파싱에 실패한다', () => {
    expect(() => auditLogPageSchema.parse({ items: [{ id: 1 }], page })).toThrow()
  })
})
