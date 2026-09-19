import { useQueries } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { warehouseSchema, type Warehouse } from './warehouseSchemas'

export type UseWarehousesResult = {
  data: Warehouse[]
  isLoading: boolean
  isError: boolean
}

/** 창고 목록 조회 API가 없어(GET /api/warehouses/{id} 단건만 존재) AccessScope.warehouseIds 각각을 병렬 조회한다. */
export function useWarehouses(warehouseIds: number[]): UseWarehousesResult {
  const queries = useQueries({
    queries: warehouseIds.map((warehouseId) => ({
      queryKey: ['warehouse', warehouseId],
      queryFn: async () => {
        const { data } = await httpClient.get(`/api/warehouses/${warehouseId}`)
        return warehouseSchema.parse(data)
      },
    })),
  })

  return {
    data: queries.map((query) => query.data).filter((warehouse): warehouse is Warehouse => warehouse !== undefined),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  }
}
