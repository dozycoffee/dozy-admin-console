import { lotStatuses, qualityStatuses, type StockFilters } from './stockSchemas'

/** 주소의 `?lotStatus=EXPIRED` 같은 값으로 처음 필터를 정한다. 알 수 없는 값은 무시한다. */
export function filtersFromSearch(search: URLSearchParams): StockFilters {
  const quality = search.get('qualityStatus')
  const lot = search.get('lotStatus')
  const hold = search.get('allocationHold')
  return {
    ...(quality && (qualityStatuses as readonly string[]).includes(quality) && { qualityStatus: quality }),
    ...(lot && (lotStatuses as readonly string[]).includes(lot) && { lotStatus: lot }),
    ...(hold === 'true' && { allocationHold: true }),
  }
}
