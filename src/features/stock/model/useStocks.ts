import { useQuery } from '@tanstack/react-query'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { stockHistoryPageSchema, stockPageSchema, stockSummaryPageSchema, type StockParams } from './stockSchemas'

/** 비어 있는 조건은 쿼리에서 뺀다. */
export function toStockQueryParams({ warehouseId, productId, qualityStatus, lotStatus, allocationHold, page, size }: StockParams) {
  return {
    ...(warehouseId !== undefined && { warehouseId }),
    ...(productId !== undefined && { productId }),
    ...(qualityStatus && { qualityStatus }),
    ...(lotStatus && { lotStatus }),
    ...(allocationHold !== undefined && { allocationHold }),
    page,
    size,
  }
}

/** 재고 현황(재고 행 목록). 정렬은 서버가 정한다(창고, 상품, 유통기한, 행 id). */
export function useStocks(params: StockParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: ['stock', 'list', params],
    queryFn: async () => stockPageSchema.parse((await inventoryHttpClient.get('/api/v1/inventories', { params: toStockQueryParams(params) })).data),
    placeholderData: (previous) => previous,
  })
}

/** 상품별 재고 요약. 재고 현황과 같은 조건으로 거른 행을 상품 단위로 합쳐 상품 ID 순서로 서버가 페이지를 나눈다. */
export function useStockSummaries(params: StockParams) {
  return useQuery({
    queryKey: ['stock', 'summaries', params],
    queryFn: async () => stockSummaryPageSchema.parse((await inventoryHttpClient.get('/api/v1/inventories/summary', { params: toStockQueryParams(params) })).data),
    placeholderData: (previous) => previous,
  })
}

/** 재고 행의 수량 변동 이력(최신순). */
export function useStockHistories(inventoryId: number | null, page: number, size: number) {
  return useQuery({
    enabled: inventoryId !== null,
    queryKey: ['stock', 'histories', inventoryId, page, size],
    queryFn: async () => stockHistoryPageSchema.parse((await inventoryHttpClient.get(`/api/v1/inventories/${inventoryId}/histories`, { params: { page, size } })).data),
    placeholderData: (previous) => previous,
  })
}
