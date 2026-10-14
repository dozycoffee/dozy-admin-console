import { useQueries, useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { warehouseListSchema, warehouseSchema, type Warehouse } from './warehouseSchemas'

export type UseWarehousesResult = {
  data: Warehouse[]
  isLoading: boolean
  isError: boolean
}

/**
 * 창고 마스터 목록. 다른 서비스(inventory)의 응답이 창고 id만 주므로 이름을 채우거나 창고 선택지를 만드는 데 쓴다.
 * 이름은 보조 정보라 실패해도 화면을 막지 않는다(재시도하지 않고 호출한 쪽이 id로 대신 보여준다).
 */
export function useWarehouseList() {
  return useQuery({
    queryKey: ['warehouse', 'list'],
    staleTime: 5 * 60_000,
    retry: false,
    queryFn: async () => warehouseListSchema.parse((await httpClient.get('/api/warehouses')).data).items,
  })
}

/** AccessScope.warehouseIds 각각을 단건 조회(GET /api/warehouses/{id})해 병렬로 가져온다. 창고 관리자 모드의 담당 창고용이다. */
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
