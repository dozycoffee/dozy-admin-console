import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { locationStockListSchema, type LocationStock, type QualityStatus } from './inventorySchemas'

export type LocationStockFilters = {
  zoneId?: number
  locationId?: number
  productId?: number
  qualityStatus?: QualityStatus
  includeEmpty?: boolean
}

// 서버는 접근 가능한 창고로 범위를 제한하고, warehouseIds를 주면 그 안으로 좁힌다.
export function useLocationStocks(warehouseIds: number[], filters: LocationStockFilters = {}) {
  return useQuery({
    queryKey: ['inventory', 'location-stocks', { warehouseIds, ...filters }],
    queryFn: async (): Promise<LocationStock[]> => locationStockListSchema.parse((await httpClient.get('/api/location-stocks', { params: { warehouseIds, ...filters } })).data).items,
  })
}

// 폐기 등록 대상은 정상(NORMAL)이 아닌 재고(불량·폐기 예정)뿐이다 — 서버도 그 외는 거부한다.
// 서버 필터가 qualityStatus 하나만 받으므로 두 상태를 각각 조회해 합친다.
export function useDisposableLocationStocks(warehouseIds: number[]) {
  return useQuery({
    queryKey: ['inventory', 'disposable', { warehouseIds }],
    queryFn: async (): Promise<LocationStock[]> => {
      const [defective, scheduled] = await Promise.all((['DEFECTIVE', 'DISPOSAL_SCHEDULED'] as const).map(async (qualityStatus) =>
        locationStockListSchema.parse((await httpClient.get('/api/location-stocks', { params: { qualityStatus, warehouseIds } })).data).items))
      return [...defective, ...scheduled]
    },
  })
}
