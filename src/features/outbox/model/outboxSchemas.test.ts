import { describe, expect, it } from 'vitest'
import { aggregateTypeLabels, formatPayload, labelOf, outboxStatusLabels } from './outboxSchemas'

describe('formatPayload', () => {
  it('JSON payload를 들여써서 보여준다', () => {
    expect(formatPayload('{"a":1,"b":{"c":[1,2]}}')).toBe('{\n  "a": 1,\n  "b": {\n    "c": [\n      1,\n      2\n    ]\n  }\n}')
  })

  it('JSON이 아니면 받은 그대로 보여준다', () => {
    expect(formatPayload('not json')).toBe('not json')
    expect(formatPayload('')).toBe('')
  })
})

describe('labelOf', () => {
  it('알려진 코드는 이름으로, 모르는 코드는 코드 그대로 보여준다', () => {
    expect(labelOf(aggregateTypeLabels, 'LOT')).toBe('Lot')
    expect(labelOf(outboxStatusLabels, 'DEAD')).toBe('격리됨')
    expect(labelOf(aggregateTypeLabels, 'NEW_TYPE')).toBe('NEW_TYPE')
  })
})
