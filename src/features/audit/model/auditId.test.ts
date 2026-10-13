import { describe, expect, it } from 'vitest'
import { shortenId } from './auditId'

describe('shortenId', () => {
  it('긴 id는 앞 6자리와 뒤 4자리만 남긴다', () => {
    expect(shortenId('01a13350-6a2e-7c1a-9f3d-2b6e8a1c4d5f')).toBe('01a133…4d5f')
  })

  it('앞자리가 같은 UUID도 뒤 4자리로 구분된다', () => {
    expect(shortenId('01a13350-aaaa-7c1a-9f3d-2b6e8a1c1111')).not.toBe(shortenId('01a13350-aaaa-7c1a-9f3d-2b6e8a1c2222'))
  })

  it('짧은 id는 그대로 둔다', () => {
    expect(shortenId('p-short')).toBe('p-short')
    expect(shortenId('12')).toBe('12')
  })
})
