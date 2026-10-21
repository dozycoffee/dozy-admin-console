import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import { useLocationStocks } from '../../inventory/model/useLocationStocks'
import {
  countStockAuditItemRequestSchema, registerStockAuditRequestSchema, stockAuditItemListSchema, stockAuditItemSchema, stockAuditListSchema, stockAuditSchema,
  type PaginatedStockAudit, type RegisterStockAuditRequest, type StockAudit, type StockAuditItem, type StockAuditStatus, type StockAuditStatusCounts,
} from './stockAuditSchemas'

const emptyCounts = (): StockAuditStatusCounts => ({ SCHEDULED: 0, IN_PROGRESS: 0, COMPLETED: 0, CLOSED: 0 })

// 서버는 접근 가능한 창고로 범위를 제한하지만, 입고·출고·폐기와 같이 화면의 AccessScope로 한 번 더 좁히고 상태 필터·페이지는 클라이언트에서 처리한다.
export function paginateStockAudits(all: StockAudit[], warehouseIds: number[], statuses: StockAuditStatus[], page: number, size: number): PaginatedStockAudit {
  const scoped = warehouseIds.length ? all.filter((audit) => warehouseIds.includes(audit.warehouseId)) : all
  const statusCounts = emptyCounts()
  scoped.forEach((audit) => { statusCounts[audit.status] += 1 })
  const filtered = (statuses.length ? scoped.filter((audit) => statuses.includes(audit.status)) : scoped).slice().sort((a, b) => b.stockAuditId - a.stockAuditId)
  return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts }
}

export function useStockAudits(warehouseIds: number[], statuses: StockAuditStatus[], page: number, size = 4) {
  return useQuery({
    queryKey: ['stock-audits', 'list'],
    queryFn: async () => stockAuditListSchema.parse((await httpClient.get('/api/stock-audits')).data),
    select: (all) => paginateStockAudits(all, warehouseIds, statuses, page, size),
  })
}

export type StockAuditItemView = StockAuditItem & { locationCode: string | null; productName: string | null; lotNumber: string | null }

/**
 * 실사 항목에 Location 코드·상품명·Lot을 붙인다. 항목은 Location 재고 행(locationStockId)만 가리키므로 수량 0 행까지 조회해 찾고,
 * 행이 사라졌거나 상품 마스터에 없으면 null이며 화면은 재고 번호로 대체한다.
 */
export function useStockAuditItems(stockAuditId: number | undefined, warehouseIds: number[]) {
  const items = useQuery({
    queryKey: ['stock-audits', 'items', stockAuditId],
    queryFn: async () => stockAuditItemListSchema.parse((await httpClient.get('/api/stock-audit-items', { params: { stockAuditId } })).data),
    enabled: stockAuditId !== undefined,
  })
  const products = useProducts()
  const stocks = useLocationStocks(warehouseIds, { includeEmpty: true })
  const data: StockAuditItemView[] | undefined = items.data?.map((item) => {
    const stock = stocks.data?.find((candidate) => candidate.locationStockId === item.locationStockId)
    const product = stock && products.data?.find((candidate) => candidate.productId === stock.productId)
    return { ...item, locationCode: stock?.locationCode ?? null, lotNumber: stock?.lotNumber ?? null, productName: product?.productName ?? null }
  })
  return { data, isLoading: items.isLoading, isError: items.isError, error: items.error }
}

// 조정 확정은 Location 재고 수량을 바꾸므로 inventory 쿼리도 무효화한다.
function useInvalidatingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['stock-audits'] }), queryClient.invalidateQueries({ queryKey: ['inventory'] })])
    },
  })
}

export function useRegisterStockAudit() {
  return useInvalidatingMutation(async (body: RegisterStockAuditRequest) => stockAuditSchema.parse((await httpClient.post('/api/stock-audits', registerStockAuditRequestSchema.parse(body))).data))
}
export function useAssignStockAudit() {
  return useInvalidatingMutation(async (stockAuditId: number) => stockAuditSchema.parse((await httpClient.patch(`/api/stock-audits/${stockAuditId}/assign`)).data))
}
export function useCountStockAuditItem() {
  return useInvalidatingMutation(async ({ stockAuditItemId, countedQuantity }: { stockAuditItemId: number; countedQuantity: number }) =>
    stockAuditItemSchema.parse((await httpClient.patch(`/api/stock-audit-items/${stockAuditItemId}/count`, countStockAuditItemRequestSchema.parse({ countedQuantity }))).data))
}
export function useCompleteStockAudit() {
  return useInvalidatingMutation(async (stockAuditId: number) => stockAuditSchema.parse((await httpClient.patch(`/api/stock-audits/${stockAuditId}/complete`)).data))
}
export function useCloseStockAudit() {
  return useInvalidatingMutation(async (stockAuditId: number) => stockAuditSchema.parse((await httpClient.patch(`/api/stock-audits/${stockAuditId}/close`)).data))
}
