import { describe, expect, it } from 'vitest'
import { loginResponseSchema, meResponseSchema } from './authSchemas'

describe('loginResponseSchema', () => {
  it('accessToken을 파싱하고 나머지 필드는 무시한다', () => {
    const result = loginResponseSchema.parse({ accessToken: 'test-token', tokenType: 'Bearer', expiresIn: 600 })

    expect(result).toEqual({ accessToken: 'test-token' })
  })

  it('accessToken이 없으면 파싱에 실패한다', () => {
    expect(() => loginResponseSchema.parse({})).toThrow()
  })
})

describe('meResponseSchema', () => {
  const validMe = {
    principalType: 'employee',
    principalId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f',
    name: '김도윤',
    email: 'kim@dozycoffee.com',
    roles: ['wms:warehouse_manager'],
  }

  it('dozy-auth의 내 정보 응답을 파싱한다', () => {
    expect(meResponseSchema.parse(validMe)).toEqual(validMe)
  })

  it('role이 없는 직원은 빈 배열로 파싱한다', () => {
    expect(meResponseSchema.parse({ ...validMe, roles: [] }).roles).toEqual([])
  })

  it('roles가 없으면 파싱에 실패한다', () => {
    const { roles: _roles, ...withoutRoles } = validMe
    expect(() => meResponseSchema.parse(withoutRoles)).toThrow()
  })
})
