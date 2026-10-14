import { describe, expect, it } from 'vitest'
import type { Category } from './catalogSchemas'
import { categoryLabel, groupCategories } from './categoryLabel'

const categories: Category[] = [
  { id: 1, name: '음료', parentId: null },
  { id: 2, name: '푸드', parentId: null },
  { id: 5, name: '커피', parentId: 1 },
  { id: 6, name: '디저트', parentId: 2 },
]

describe('categoryLabel', () => {
  it('소분류는 대분류와 함께, 대분류는 이름만 보여준다', () => {
    expect(categoryLabel(categories, 5)).toBe('음료 > 커피')
    expect(categoryLabel(categories, 1)).toBe('음료')
  })

  it('목록에 없는 카테고리는 null이다', () => {
    expect(categoryLabel(categories, 99)).toBeNull()
    expect(categoryLabel([], 5)).toBeNull()
  })
})

describe('groupCategories', () => {
  it('대분류 아래에 소분류를 묶는다', () => {
    expect(groupCategories(categories).map(({ top, children }) => [top.name, children.map((child) => child.name)])).toEqual([['음료', ['커피']], ['푸드', ['디저트']]])
  })
})
