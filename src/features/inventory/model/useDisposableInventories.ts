import { useQuery } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { inventoryItemListSchema, type InventoryItem } from './inventorySchemas'

// 폐기 등록 대상은 정상(NORMAL)이 아닌 재고(불량·폐기 예정)뿐이다 — 서버도 그 외는 거부한다.
// 서버 필터가 qualityStatus 하나만 받으므로 두 상태를 각각 조회해 합친다.
export function useDisposableInventories(warehouseIds: number[]) {
  return useQuery({
    queryKey: ['inventory', 'disposable', { warehouseIds }],
    queryFn: async (): Promise<InventoryItem[]> => {
      const [defective, scheduled] = await Promise.all((['DEFECTIVE', 'DISPOSAL_SCHEDULED'] as const).map(async (qualityStatus) =>
        inventoryItemListSchema.parse((await httpClient.get('/api/inventories', { params: { qualityStatus, warehouseIds } })).data)))
      return [...defective, ...scheduled]
    },
  })
}
