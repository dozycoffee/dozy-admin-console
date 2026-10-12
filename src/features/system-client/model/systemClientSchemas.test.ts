import { describe, expect, it } from 'vitest'
import { isValidClientId, registeredClientSchema, systemClientListSchema } from './systemClientSchemas'

describe('isValidClientId (CLI-01)', () => {
  it.each(['svc-store', 'svc-store-sync', 'svc-a1', 'svc-order2-api'])('%s는 올바른 clientId다', (value) => {
    expect(isValidClientId(value)).toBe(true)
  })

  it.each(['', 'store', 'svc-', 'svc-1store', 'svc-Store', 'svc_store', 'svc-store-', 'svc--store', 'svc-store sync', 'SVC-store'])('%s는 올바르지 않은 clientId다', (value) => {
    expect(isValidClientId(value)).toBe(false)
  })

  it('컬럼 길이(100자)를 넘으면 올바르지 않다', () => {
    expect(isValidClientId(`svc-${'a'.repeat(96)}`)).toBe(true)
    expect(isValidClientId(`svc-${'a'.repeat(97)}`)).toBe(false)
  })
})

describe('systemClientListSchema', () => {
  const client = { principalId: 'p-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: ['auth:partner_reader'], secretRotatedAt: '2026-09-24T05:00:00Z', createdAt: '2026-09-24T05:00:00Z' }

  it('목록 응답을 파싱한다', () => {
    expect(systemClientListSchema.parse({ items: [client] }).items[0].clientId).toBe('svc-store')
  })

  it('비활성화된 client는 role이 비어 있어도 파싱한다', () => {
    expect(systemClientListSchema.parse({ items: [{ ...client, status: 'DEACTIVATED', clientId: 'deleted-p-1', roles: [], secretRotatedAt: null }] }).items[0].status).toBe('DEACTIVATED')
  })

  it('알 수 없는 상태 값이면 파싱에 실패한다', () => {
    expect(() => systemClientListSchema.parse({ items: [{ ...client, status: 'PENDING' }] })).toThrow()
  })
})

describe('registeredClientSchema', () => {
  it('등록 응답에서 clientSecret을 파싱한다', () => {
    expect(registeredClientSchema.parse({ principalId: 'p-1', clientId: 'svc-store', clientSecret: 'Zr8qL2mX' }).clientSecret).toBe('Zr8qL2mX')
  })

  it('clientSecret이 없으면 파싱에 실패한다', () => {
    expect(() => registeredClientSchema.parse({ principalId: 'p-1', clientId: 'svc-store' })).toThrow()
  })
})
