import { describe, expect, it } from 'vitest'
import { filtersFromSearch } from './stockFilterParams'

describe('filtersFromSearch', () => {
  it('주소의 품질 상태·Lot 상태·할당 보류로 필터를 정한다', () => {
    expect(filtersFromSearch(new URLSearchParams('lotStatus=EXPIRED'))).toEqual({ lotStatus: 'EXPIRED' })
    expect(filtersFromSearch(new URLSearchParams('qualityStatus=DEFECTIVE&allocationHold=true'))).toEqual({ qualityStatus: 'DEFECTIVE', allocationHold: true })
  })

  it('알 수 없는 값이나 값이 없는 주소는 무시한다', () => {
    expect(filtersFromSearch(new URLSearchParams('lotStatus=ROTTEN&qualityStatus=BAD&allocationHold=maybe'))).toEqual({})
    expect(filtersFromSearch(new URLSearchParams(''))).toEqual({})
  })
})
