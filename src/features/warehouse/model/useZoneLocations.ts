import { useQueries } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { locationListSchema, type Location } from './warehouseSchemas'

export type UseZoneLocationsResult = {
  data: Location[]
  isLoading: boolean
  isError: boolean
  error: unknown
}

/** Zone 각각의 Location(용량)을 병렬로 가져와 합친다. */
export function useZoneLocations(zoneIds: number[]): UseZoneLocationsResult {
  const queries = useQueries({
    queries: zoneIds.map((zoneId) => ({
      queryKey: ['warehouse', 'zone-locations', zoneId],
      queryFn: async () => locationListSchema.parse((await httpClient.get(`/api/zones/${zoneId}/locations`)).data),
    })),
  })
  return {
    data: queries.flatMap((query) => query.data ?? []),
    isLoading: queries.some((query) => query.isLoading),
    isError: queries.some((query) => query.isError),
    error: queries.find((query) => query.isError)?.error,
  }
}
