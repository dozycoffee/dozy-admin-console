import { describe, expect, it } from 'vitest'
import { removalDescription } from './removalDescription'

describe('removalDescription', () => {
  it('영향을 받는 상품 수를 알려 준다', () => {
    expect(removalDescription('이 태그가 붙은', 7)).toBe('이 태그가 붙은 7개 상품에서 제거됩니다. 되돌릴 수 없습니다.')
  })

  it('쓰는 상품이 없으면 그렇다고 알려 준다', () => {
    expect(removalDescription('이 상품 그룹에 속한', 0)).toBe('이 상품 그룹에 속한 상품이 없습니다. 삭제하면 되돌릴 수 없습니다.')
  })

  it('수를 모르면 수 없이 안내한다', () => {
    expect(removalDescription('이 태그가 붙은', null)).toBe('이 태그가 붙은 모든 상품에서 제거되며 되돌릴 수 없습니다.')
  })
})
