import { describe, expect, it } from 'vitest'
import { currentUserSchema, loginResponseSchema } from './authSchemas'
import { actorModeIds } from './actorModes'

describe('loginResponseSchema', () => {
  it('accessToken을 파싱한다', () => {
    const result = loginResponseSchema.parse({ accessToken: 'test-token' })

    expect(result.accessToken).toBe('test-token')
  })

  it('accessToken이 없으면 파싱에 실패한다', () => {
    expect(() => loginResponseSchema.parse({})).toThrow()
  })
})

describe('currentUserSchema', () => {
  const validUser = {
    id: 'user-001',
    name: '김도윤',
    actorModes: [actorModeIds.warehouseManager],
    permissions: ['dashboard.read', 'inventory.write'],
    scope: { warehouseIds: [1, 2] },
  }

  it('서버 응답 형태를 파싱한다', () => {
    const result = currentUserSchema.parse(validUser)

    expect(result.name).toBe('김도윤')
    expect(result.actorModes).toEqual([actorModeIds.warehouseManager])
    expect(result.permissions).toEqual(['dashboard.read', 'inventory.write'])
  })

  it('알 수 없는 permission 값이면 파싱에 실패한다', () => {
    expect(() => currentUserSchema.parse({ ...validUser, permissions: ['unknown.permission'] })).toThrow()
  })

  it('알 수 없는 액터 모드 값이면 파싱에 실패한다', () => {
    expect(() => currentUserSchema.parse({ ...validUser, actorModes: ['unknown-mode'] })).toThrow()
  })
})
