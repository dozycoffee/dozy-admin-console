export type ProductField = 'name' | 'categoryId' | 'basePrice'
export type ProductFieldErrors = Partial<Record<ProductField, string>>

/** 기준가 입력은 0 이상의 정수만 받는다(원 단위). */
const wholeNumber = /^\d+$/

/** 상품 등록·수정 입력의 오류 문구(문제가 없는 필드는 빠진다). UX용 검사이며 최종 판단은 서버가 한다. */
export function validateProduct({ name, categoryId, basePrice }: { name: string; categoryId: string; basePrice: string }): ProductFieldErrors {
  const errors: ProductFieldErrors = {}
  if (name.trim() === '') errors.name = '상품명을 입력하세요.'
  if (categoryId === '') errors.categoryId = '카테고리를 선택하세요.'
  if (basePrice.trim() === '') errors.basePrice = '기준가를 입력하세요.'
  else if (!wholeNumber.test(basePrice.trim())) errors.basePrice = '기준가는 0 이상의 정수로 입력하세요. (예: 4500)'
  return errors
}

/**
 * 입력한 태그 이름을 선택 목록에 더한다. 공백을 다듬고 빈 이름과 이미 고른 이름은 무시한다.
 * 같은 이름의 태그가 이미 있으면 서버가 새로 만들지 않고 그 태그를 쓰므로(요구사항 1.7) 이름이 같은지만 보면 된다.
 */
export function addTagName(selected: readonly string[], input: string): string[] {
  const name = input.trim()
  return name === '' || selected.includes(name) ? [...selected] : [...selected, name]
}

/** 태그 id를 이름으로 바꿔 입력칸 값으로 만든다. 이름을 찾지 못한 id는 `unresolved`로 알려, 모르는 채 태그를 잃지 않게 한다. */
export function tagNamesOf(tagIds: readonly number[], tags: ReadonlyArray<{ id: number; name: string }>): { names: string[]; unresolved: number } {
  const names: string[] = []
  let unresolved = 0
  for (const id of tagIds) {
    const tag = tags.find((item) => item.id === id)
    if (tag) names.push(tag.name)
    else unresolved += 1
  }
  return { names, unresolved }
}

/** 빈 입력은 null(값 없음)로 보낸다. API는 값이 없는 선택 필드를 `null`로 받는다. */
export const emptyToNull = (value: string): string | null => (value.trim() === '' ? null : value.trim())
