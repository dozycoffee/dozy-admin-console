import { useQuery } from '@tanstack/react-query'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { productPageSchema, stockHistoryPageSchema, stockPageSchema, type Product, type StockParams } from './stockSchemas'

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

/** 재고 행의 수량 변동 이력(최신순). */
export function useStockHistories(inventoryId: number | null, page: number, size: number) {
  return useQuery({
    enabled: inventoryId !== null,
    queryKey: ['stock', 'histories', inventoryId, page, size],
    queryFn: async () => stockHistoryPageSchema.parse((await inventoryHttpClient.get(`/api/v1/inventories/${inventoryId}/histories`, { params: { page, size } })).data),
    placeholderData: (previous) => previous,
  })
}

const PRODUCT_PAGE_SIZE = 100
/** 상품 마스터가 이 수를 넘으면 이름을 못 찾는 상품은 id로 보여준다. */
const PRODUCT_MAX_PAGES = 5

/** 재고 응답에는 상품 이름이 없어 상품 조회로 채운다. 원부자재 마스터는 크지 않아 처음 몇 페이지를 모두 읽는다. */
export function useProducts() {
  return useQuery({
    queryKey: ['stock', 'products'],
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<Product[]> => {
      const products: Product[] = []
      for (let page = 0; page < PRODUCT_MAX_PAGES; page += 1) {
        const data = productPageSchema.parse((await inventoryHttpClient.get('/api/v1/products', { params: { page, size: PRODUCT_PAGE_SIZE } })).data)
        products.push(...data.items)
        if (products.length >= data.totalElements || data.items.length === 0) break
      }
      return products
    },
  })
}
