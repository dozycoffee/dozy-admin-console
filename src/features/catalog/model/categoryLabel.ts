import type { Category } from './catalogSchemas'

/** 소분류는 "대분류 > 소분류"로, 대분류는 이름만 보여준다. 분류 목록에 없으면 null이다. */
export function categoryLabel(categories: readonly Category[], categoryId: number): string | null {
  const category = categories.find((item) => item.id === categoryId)
  if (!category) return null
  const parent = category.parentId === null ? null : categories.find((item) => item.id === category.parentId)
  return parent ? `${parent.name} > ${category.name}` : category.name
}

/** 상품 필터용 선택지: 대분류 아래에 소분류를 묶는다. 대분류를 고르면 서버가 그 아래 소분류의 상품을 모두 포함한다. */
export function groupCategories(categories: readonly Category[]): Array<{ top: Category; children: Category[] }> {
  return categories
    .filter((category) => category.parentId === null)
    .map((top) => ({ top, children: categories.filter((category) => category.parentId === top.id) }))
}
