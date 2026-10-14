import type { OptionInput } from './catalogSchemas'

/** 폼에서 편집 중인 옵션 한 줄. 가격은 입력 중에는 문자열이다. `locked`면 이미 저장된 옵션이라 옵션 키를 바꿀 수 없다. */
export type OptionDraft = { rowId: number; optionKey: string; name: string; price: string; locked: boolean }
export type OptionRowField = 'optionKey' | 'name' | 'price'
export type OptionGroupErrors = {
  name?: string
  /** 옵션이 하나도 없을 때 */
  options?: string
  rows: Record<number, Partial<Record<OptionRowField, string>>>
}

const wholeNumber = /^\d+$/

/** 옵션 그룹 입력의 오류 문구(문제가 없는 곳은 빠진다). UX용 검사이며 최종 판단은 서버가 한다. */
export function validateOptionGroup(name: string, rows: readonly OptionDraft[]): OptionGroupErrors {
  const errors: OptionGroupErrors = { rows: {} }
  if (name.trim() === '') errors.name = '이름을 입력하세요.'
  if (rows.length === 0) errors.options = '옵션을 하나 이상 추가하세요.'
  const keyCounts = new Map<string, number>()
  for (const row of rows) keyCounts.set(row.optionKey.trim(), (keyCounts.get(row.optionKey.trim()) ?? 0) + 1)
  for (const row of rows) {
    const rowErrors: Partial<Record<OptionRowField, string>> = {}
    const key = row.optionKey.trim()
    if (key === '') rowErrors.optionKey = '옵션 키를 입력하세요.'
    else if ((keyCounts.get(key) ?? 0) > 1) rowErrors.optionKey = '옵션 키가 겹칩니다.'
    if (row.name.trim() === '') rowErrors.name = '옵션 이름을 입력하세요.'
    if (row.price.trim() === '') rowErrors.price = '가격을 입력하세요.'
    else if (!wholeNumber.test(row.price.trim())) rowErrors.price = '0 이상의 정수로 입력하세요.'
    if (Object.keys(rowErrors).length > 0) errors.rows[row.rowId] = rowErrors
  }
  return errors
}

export const hasOptionGroupErrors = (errors: OptionGroupErrors) => errors.name !== undefined || errors.options !== undefined || Object.keys(errors.rows).length > 0

/** 이미 저장된 옵션으로 편집 줄을 만든다(옵션 키는 잠근다). `rowId`는 줄을 구분하는 화면 안의 번호다. */
export const draftsFromOptions = (options: readonly OptionInput[]): OptionDraft[] =>
  options.map((option, index) => ({ rowId: index, optionKey: option.optionKey, name: option.name, price: String(option.price), locked: true }))

/** 입력을 요청 본문으로 바꾼다. 검증을 통과한 입력에만 쓴다. */
export const toOptionInputs = (rows: readonly OptionDraft[]): OptionInput[] =>
  rows.map((row) => ({ optionKey: row.optionKey.trim(), name: row.name.trim(), price: Number(row.price.trim()) }))

/** 새 목록에서 사라진 옵션 키. 이 키의 상품별 예외가 모든 연결 상품에서 삭제된다. */
export function removedOptionKeys(original: readonly OptionInput[], next: readonly OptionInput[]): string[] {
  const kept = new Set(next.map((option) => option.optionKey))
  return original.filter((option) => !kept.has(option.optionKey)).map((option) => option.optionKey)
}

/** 옵션 목록이 달라졌는지(키·이름·가격·순서). */
export const optionsChanged = (original: readonly OptionInput[], next: readonly OptionInput[]): boolean =>
  original.length !== next.length || original.some((option, index) => option.optionKey !== next[index].optionKey || option.name !== next[index].name || option.price !== next[index].price)
