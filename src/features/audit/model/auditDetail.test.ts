import { describe, expect, it } from 'vitest'
import { describeDetail } from './auditDetail'

describe('describeDetail', () => {
  it('detail이 없으면 항목이 없다', () => {
    expect(describeDetail(null)).toEqual([])
    expect(describeDetail(undefined)).toEqual([])
    expect(describeDetail({})).toEqual([])
  })

  it('아는 키는 한글 이름으로, 배열은 값 여러 개로 바꾼다', () => {
    expect(describeDetail({ roles: ['wms:warehouse_manager', 'wms:hq_inventory_manager'], revokedSessions: 3 })).toEqual([
      { key: 'roles', label: 'role', values: ['wms:warehouse_manager', 'wms:hq_inventory_manager'] },
      { key: 'revokedSessions', label: '폐기한 세션 수', values: ['3'] },
    ])
  })

  it('아는 사유·경로·수정 항목 값은 한글 설명을 붙이고 원래 값도 남긴다', () => {
    expect(describeDetail({ reason: 'INVALID_CREDENTIALS', via: 'invitation_cancelled', fields: ['name', 'phone'] })).toEqual([
      { key: 'reason', label: '사유', values: ['이메일·비밀번호 불일치 (INVALID_CREDENTIALS)'] },
      { key: 'via', label: '경로', values: ['초대 취소 (invitation_cancelled)'] },
      { key: 'fields', label: '수정한 항목', values: ['이름 (name)', '전화번호 (phone)'] },
    ])
  })

  it('관리자가 입력한 사유처럼 모르는 값은 그대로 보여준다', () => {
    expect(describeDetail({ reason: '계정 탈취 의심' })[0].values).toEqual(['계정 탈취 의심'])
  })

  it('모르는 키는 키 이름 그대로, 객체 값은 JSON으로 보여준다', () => {
    expect(describeDetail({ something: { a: 1 } })).toEqual([{ key: 'something', label: 'something', values: ['{"a":1}'] }])
  })
})
