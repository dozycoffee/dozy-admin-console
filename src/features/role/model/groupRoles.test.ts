import { describe, expect, it } from 'vitest'
import { groupByAudience } from './groupRoles'

describe('groupByAudience', () => {
  it('서비스별로 묶고 서비스와 role의 순서를 유지한다', () => {
    const roles = [
      { audience: 'wms', code: 'a' }, { audience: 'catalog', code: 'b' }, { audience: 'wms', code: 'c' },
    ]

    expect(groupByAudience(roles)).toEqual([
      ['wms', [{ audience: 'wms', code: 'a' }, { audience: 'wms', code: 'c' }]],
      ['catalog', [{ audience: 'catalog', code: 'b' }]],
    ])
  })

  it('비어 있으면 묶음도 없다', () => {
    expect(groupByAudience([])).toEqual([])
  })
})
