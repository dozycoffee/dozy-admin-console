import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { zoneInventorySummaryListSchema } from './inventorySchemas'

export function useZoneInventorySummary(warehouseIds: number[]) {
  return useQuery({
    queryKey: ['inventory', 'zone-summary', { warehouseIds }],
    queryFn: async () => {
      const { data } = await httpClient.get('/api/inventories/zone-summary', {
        params: { warehouseIds },
      })
      return zoneInventorySummaryListSchema.parse(data)
    },
  })
}
