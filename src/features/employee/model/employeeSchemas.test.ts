import { describe, expect, it } from 'vitest'
import { employeeDetailSchema, employeePageSchema, inviteEmployeeResponseSchema } from './employeeSchemas'

const summary = {
  principalId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f',
  email: 'kim@dozycoffee.com',
  name: '김도윤',
  status: 'ACTIVE',
  roles: ['wms:warehouse_manager'],
  createdAt: '2026-09-24T05:00:00Z',
}

describe('employeePageSchema', () => {
  it('직원 목록 응답을 파싱한다', () => {
    const result = employeePageSchema.parse({ items: [summary], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } })

    expect(result.items[0].name).toBe('김도윤')
    expect(result.page.totalElements).toBe(1)
  })

  it('알 수 없는 상태 값이면 파싱에 실패한다', () => {
    expect(() => employeePageSchema.parse({ items: [{ ...summary, status: 'UNKNOWN' }], page: { number: 0, size: 20, totalElements: 1, totalPages: 1 } })).toThrow()
  })
})

describe('employeeDetailSchema', () => {
  const detail = { ...summary, phone: null, address: null, lockedUntil: null, invitation: null, updatedAt: '2026-09-24T05:00:00Z' }

  it('선택 필드가 null이어도 파싱한다', () => {
    expect(employeeDetailSchema.parse(detail).invitation).toBeNull()
  })

  it('초대 대기 직원의 초대 만료 시각을 파싱한다', () => {
    const result = employeeDetailSchema.parse({ ...detail, status: 'PENDING', invitation: { expiresAt: '2026-09-27T05:00:00Z' } })

    expect(result.invitation?.expiresAt).toBe('2026-09-27T05:00:00Z')
  })
})

describe('inviteEmployeeResponseSchema', () => {
  it('초대 응답을 파싱한다', () => {
    const result = inviteEmployeeResponseSchema.parse({ principalId: 'p-1', status: 'PENDING', invitationExpiresAt: '2026-09-27T05:00:00Z' })

    expect(result.status).toBe('PENDING')
  })
})
