import { useQueries } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { areaCodeSchema, workAreaSchema, type WorkArea } from './warehouseSchemas'

export type UseWorkAreasResult = {
  data: WorkArea[]
  isLoading: boolean
  isError: boolean
}

// 작업 처리장은 창고마다 코드별로 하나씩이고 서버에 목록 API가 없어 코드별로 단건 조회한다.
const areaCodes = areaCodeSchema.options

export function useWorkAreas(warehouseId: number | undefined): UseWorkAreasResult {
  const queries = useQueries({
    queries: areaCodes.map((areaCode) => ({
      queryKey: ['warehouse', warehouseId, 'work-area', areaCode],
      enabled: warehouseId !== undefined,
      queryFn: async () => workAreaSchema.parse((await httpClient.get(`/api/warehouses/${warehouseId}/work-areas/${areaCode}`)).data),
    })),
  })
  return {
    data: queries.flatMap((query) => (query.data ? [query.data] : [])),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
  }
}
