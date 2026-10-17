import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import { useLocationStocks } from '../../inventory/model/useLocationStocks'
import {
  disposalItemListSchema, disposalListSchema, disposalSchema, registerDisposalRequestSchema,
  type Disposal, type DisposalItem, type DisposalStatus, type DisposalStatusCounts, type PaginatedDisposal, type RegisterDisposalRequest,
} from './disposalSchemas'

const emptyCounts = (): DisposalStatusCounts => ({ REQUESTED: 0, APPROVED: 0, COMPLETED: 0 })

// 서버 목록 API(GET /api/disposals)는 창고 필터·페이지네이션이 없어 입고·출고와 같이 클라이언트에서 처리한다.
export function paginateDisposals(all: Disposal[], warehouseIds: number[], statuses: DisposalStatus[], page: number, size: number): PaginatedDisposal {
  const scoped = warehouseIds.length ? all.filter((disposal) => warehouseIds.includes(disposal.warehouseId)) : all
  const statusCounts = emptyCounts()
  scoped.forEach((disposal) => { statusCounts[disposal.status] += 1 })
  const filtered = (statuses.length ? scoped.filter((disposal) => statuses.includes(disposal.status)) : scoped).slice().sort((a, b) => b.disposalId - a.disposalId)
  return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts }
}

export function useDisposals(warehouseIds: number[], statuses: DisposalStatus[], page: number, size = 4) {
  return useQuery({
    queryKey: ['disposals', 'list'],
    queryFn: async () => disposalListSchema.parse((await httpClient.get('/api/disposals')).data),
    select: (all) => paginateDisposals(all, warehouseIds, statuses, page, size),
  })
}

export type DisposalItemView = DisposalItem & { productName: string | null }

/**
 * 폐기 품목에 상품명을 붙인다. 폐기 대상은 Location 재고 행(locationStockId)만 가리키므로 수량 0 행까지 조회해 상품을 찾는다.
 * 행이 사라졌거나 상품 마스터에 없으면 null이고 화면은 재고 번호로 대체한다.
 */
export function useDisposalItems(disposalId: number | undefined, warehouseIds: number[]) {
  const items = useQuery({
    queryKey: ['disposals', 'items', disposalId],
    queryFn: async () => disposalItemListSchema.parse((await httpClient.get('/api/disposal-items', { params: { disposalId } })).data),
    enabled: disposalId !== undefined,
  })
  const products = useProducts()
  const stocks = useLocationStocks(warehouseIds, { includeEmpty: true })
  const data: DisposalItemView[] | undefined = items.data?.map((item) => {
    const stock = stocks.data?.find((candidate) => candidate.locationStockId === item.locationStockId)
    const product = stock && products.data?.find((candidate) => candidate.productId === stock.productId)
    return { ...item, productName: product?.productName ?? null }
  })
  return { data, isLoading: items.isLoading, isError: items.isError, error: items.error }
}

// 승인은 재고를 폐기 처리장으로 옮기고, 완료는 재고 수량을 줄이므로 inventory 쿼리도 무효화한다.
function useInvalidatingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['disposals'] }), queryClient.invalidateQueries({ queryKey: ['inventory'] })])
    },
  })
}

export function useRegisterDisposal() {
  return useInvalidatingMutation(async (body: RegisterDisposalRequest) => disposalSchema.parse((await httpClient.post('/api/disposals', registerDisposalRequestSchema.parse(body))).data))
}
export function useApproveDisposal() {
  return useInvalidatingMutation(async (disposalId: number) => disposalSchema.parse((await httpClient.patch(`/api/disposals/${disposalId}/approve`)).data))
}
export function useCompleteDisposal() {
  return useInvalidatingMutation(async (disposalId: number) => disposalSchema.parse((await httpClient.patch(`/api/disposals/${disposalId}/complete`)).data))
}
