import { describe, expect, it } from 'vitest'
import { audienceListSchema, CODE_PATTERN, roleListSchema } from './roleSchemas'

describe('CODE_PATTERN (DOM-03)', () => {
  it.each(['wms', 'warehouse_manager', 'a1', 'inbound_manager2'])('%s는 올바른 code다', (code) => {
    expect(CODE_PATTERN.test(code)).toBe(true)
  })

  it.each(['', 'Warehouse', '1abc', '_abc', 'wms:manager', 'ware-house', 'ware house', '창고'])('%s는 올바르지 않은 code다', (code) => {
    expect(CODE_PATTERN.test(code)).toBe(false)
  })
})

describe('roleListSchema', () => {
  it('role 목록 응답을 파싱한다', () => {
    const role = { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 }

    expect(roleListSchema.parse({ items: [role] }).items[0].isSystem).toBe(true)
  })

  it('필수 필드가 없으면 파싱에 실패한다', () => {
    expect(() => roleListSchema.parse({ items: [{ id: 1 }] })).toThrow()
  })
})

describe('audienceListSchema', () => {
  it('설명이 null이어도 파싱한다', () => {
    expect(audienceListSchema.parse({ items: [{ id: 1, code: 'wms', name: '창고 관리', description: null }] }).items).toHaveLength(1)
  })
})
