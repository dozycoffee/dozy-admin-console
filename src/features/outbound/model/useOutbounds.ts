import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import {
  outboundItemListSchema, outboundListSchema, outboundRecommendationListSchema, outboundSchema, registerOutboundRequestSchema,
  type Outbound, type OutboundItem, type OutboundStatus, type OutboundStatusCounts, type PaginatedOutbound, type RegisterOutboundRequest,
} from './outboundSchemas'

const emptyCounts = (): OutboundStatusCounts => ({ REQUESTED: 0, PICKING: 0, INSPECTING: 0, COMPLETED: 0 })

// 서버 목록 API(GET /api/outbounds)는 창고 필터·페이지네이션이 없다. 입고와 같은 방식으로 한 번에 받아
// 창고 범위(AccessScope) 필터, 상태별 건수, 최신순 정렬, 페이지 분할을 클라이언트에서 처리한다.
export function paginateOutbounds(all: Outbound[], warehouseIds: number[], statuses: OutboundStatus[], page: number, size: number): PaginatedOutbound {
  const scoped = warehouseIds.length ? all.filter((outbound) => warehouseIds.includes(outbound.warehouseId)) : all
  const statusCounts = emptyCounts()
  scoped.forEach((outbound) => { statusCounts[outbound.status] += 1 })
  const filtered = (statuses.length ? scoped.filter((outbound) => statuses.includes(outbound.status)) : scoped).slice().sort((a, b) => b.outboundId - a.outboundId)
  return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts }
}

export function useOutbounds(warehouseIds: number[], statuses: OutboundStatus[], page: number, size = 4) {
  return useQuery({
    queryKey: ['outbounds', 'list'],
    queryFn: async () => outboundListSchema.parse((await httpClient.get('/api/outbounds')).data),
    select: (all) => paginateOutbounds(all, warehouseIds, statuses, page, size),
  })
}

export type OutboundItemView = OutboundItem & { productName: string; productCode: string }

/** 출고 품목에 상품명(GET /api/products)을 붙여 화면용으로 합친다. */
export function useOutboundItems(outboundId: number | undefined) {
  const items = useQuery({
    queryKey: ['outbounds', 'items', outboundId],
    queryFn: async () => outboundItemListSchema.parse((await httpClient.get('/api/outbound-items', { params: { outboundId } })).data),
    enabled: outboundId !== undefined,
  })
  const products = useProducts()
  const data: OutboundItemView[] | undefined = items.data?.map((item) => {
    const product = products.data?.find((candidate) => candidate.productId === item.productId)
    return { ...item, productName: product?.productName ?? `상품 #${item.productId}`, productCode: product?.productCode ?? '' }
  })
  return { data, isLoading: items.isLoading, isError: items.isError, error: items.error }
}

export function useOutboundRecommendations() {
  return useQuery({
    queryKey: ['lots', 'outbound-recommendations'],
    queryFn: async () => outboundRecommendationListSchema.parse((await httpClient.get('/api/lots/outbound-recommendations')).data),
  })
}

// 피킹은 재고를 점유하고, 완료는 재고·Location 점유를 확정 해제하므로 두 단계는 inventory 쿼리도 무효화한다.
function useInvalidatingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, alsoInvalidate: string[] = []) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['outbounds'] }), ...alsoInvalidate.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))])
    },
  })
}

export function useRegisterOutbound() {
  return useInvalidatingMutation(async (body: RegisterOutboundRequest) => outboundSchema.parse((await httpClient.post('/api/outbounds', registerOutboundRequestSchema.parse(body))).data))
}
export function useStartOutboundPicking() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/picking`)).data), ['inventory', 'lots'])
}
export function useStartOutboundInspecting() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/inspecting`)).data))
}
export function useCompleteOutbound() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/complete`)).data), ['inventory', 'lots'])
}
