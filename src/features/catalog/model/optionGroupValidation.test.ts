import { describe, expect, it } from 'vitest'
import { draftsFromOptions, hasOptionGroupErrors, optionsChanged, removedOptionKeys, toOptionInputs, validateOptionGroup, type OptionDraft } from './optionGroupValidation'

const row = (rowId: number, extra: Partial<OptionDraft> = {}): OptionDraft => ({ rowId, optionKey: 'REGULAR', name: '레귤러', price: '0', locked: false, ...extra })

describe('validateOptionGroup', () => {
  it('문제가 없으면 오류가 없다', () => {
    const errors = validateOptionGroup('사이즈', [row(1), row(2, { optionKey: 'LARGE', name: '라지', price: '700' })])

    expect(hasOptionGroupErrors(errors)).toBe(false)
  })

  it('이름이 비면 안내한다', () => {
    expect(validateOptionGroup('  ', [row(1)]).name).toBe('이름을 입력하세요.')
  })

  it('옵션이 하나도 없으면 안내한다(옵션 그룹은 옵션이 1개 이상이어야 한다)', () => {
    expect(validateOptionGroup('사이즈', []).options).toBe('옵션을 하나 이상 추가하세요.')
  })

  it('줄마다 비어 있는 입력을 알려 준다', () => {
    const errors = validateOptionGroup('사이즈', [row(1, { optionKey: ' ', name: '', price: '' })])

    expect(errors.rows[1]).toEqual({ optionKey: '옵션 키를 입력하세요.', name: '옵션 이름을 입력하세요.', price: '가격을 입력하세요.' })
  })

  it.each(['-1', '4.5', '1,000', '700원', 'abc'])('가격 %s는 0 이상의 정수가 아니라고 안내한다', (price) => {
    expect(validateOptionGroup('사이즈', [row(1, { price })]).rows[1].price).toBe('0 이상의 정수로 입력하세요.')
  })

  it('가격 0은 허용한다', () => {
    expect(validateOptionGroup('사이즈', [row(1, { price: '0' })]).rows).toEqual({})
  })

  it('같은 옵션 키는 겹치는 줄 모두에 알린다(앞뒤 공백은 무시)', () => {
    const errors = validateOptionGroup('사이즈', [row(1, { optionKey: 'LARGE' }), row(2, { optionKey: ' LARGE ' }), row(3, { optionKey: 'REGULAR' })])

    expect(errors.rows[1].optionKey).toBe('옵션 키가 겹칩니다.')
    expect(errors.rows[2].optionKey).toBe('옵션 키가 겹칩니다.')
    expect(errors.rows[3]).toBeUndefined()
  })
})

describe('옵션 목록 변환', () => {
  const options = [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 700 }]

  it('저장된 옵션은 키가 잠긴 줄이 되고 요청 본문으로 되돌릴 수 있다', () => {
    const drafts = draftsFromOptions(options)

    expect(drafts.every((draft) => draft.locked)).toBe(true)
    expect(drafts[1]).toMatchObject({ optionKey: 'LARGE', price: '700' })
    expect(toOptionInputs(drafts)).toEqual(options)
  })

  it('요청 본문은 공백을 다듬고 가격을 숫자로 바꾼다', () => {
    expect(toOptionInputs([row(1, { optionKey: ' XL ', name: ' 엑스라지 ', price: ' 1000 ' })])).toEqual([{ optionKey: 'XL', name: '엑스라지', price: 1000 }])
  })

  it('사라진 옵션 키를 찾는다', () => {
    expect(removedOptionKeys(options, [options[0]])).toEqual(['LARGE'])
    expect(removedOptionKeys(options, [...options, { optionKey: 'XL', name: '엑스라지', price: 1000 }])).toEqual([])
  })

  it('이름이나 가격만 바뀌어도 키가 같으면 사라진 옵션이 아니다', () => {
    expect(removedOptionKeys(options, [{ ...options[0], price: 500 }, options[1]])).toEqual([])
  })

  it('키·이름·가격·순서가 달라졌는지 비교한다', () => {
    expect(optionsChanged(options, [...options])).toBe(false)
    expect(optionsChanged(options, [options[1], options[0]])).toBe(true)
    expect(optionsChanged(options, [{ ...options[0], price: 100 }, options[1]])).toBe(true)
    expect(optionsChanged(options, [options[0]])).toBe(true)
  })
})
