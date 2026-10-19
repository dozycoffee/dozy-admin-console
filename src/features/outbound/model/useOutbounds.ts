import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import {
  outboundAllocationListSchema, outboundItemListSchema, outboundListSchema, outboundSchema, reportPickingShortageRequestSchema,
  type Outbound, type OutboundItem, type OutboundStatus, type OutboundStatusCounts, type PaginatedOutbound, type ReportPickingShortageRequest,
} from './outboundSchemas'

const emptyCounts = (): OutboundStatusCounts => ({ REQUESTED: 0, PICKING: 0, INSPECTING: 0, COMPLETED: 0, CANCEL_REQUESTED: 0, CANCELED: 0 })

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

/** 출고의 피킹 계획(Lot별 할당). 재할당 뒤에는 새 할당으로 바뀐다. */
export function useOutboundAllocations(outboundId: number | undefined) {
  return useQuery({
    queryKey: ['outbounds', 'allocations', outboundId],
    queryFn: async () => outboundAllocationListSchema.parse((await httpClient.get('/api/outbound-allocations', { params: { outboundId } })).data),
    enabled: outboundId !== undefined,
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

export function useStartOutboundPicking() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/picking`)).data), ['inventory', 'lots'])
}
export function useStartOutboundInspecting() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/inspecting`)).data))
}
export function useCompleteOutbound() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.patch(`/api/outbounds/${outboundId}/complete`)).data), ['inventory', 'lots'])
}

// 피킹 전 출고는 바로 취소되고, 피킹·검수 중 출고는 CANCEL_REQUESTED로 관리자 승인을 기다린다.
export function useRequestOutboundCancel() {
  return useInvalidatingMutation(async (outboundId: number) => outboundSchema.parse((await httpClient.post(`/api/outbounds/${outboundId}/cancel-requests`)).data), ['inventory'])
}
// 부족을 보고하면 inventory가 다른 Lot으로 재할당하고 새 할당 전체를 돌려준다.
export function useReportPickingShortage() {
  return useInvalidatingMutation(async ({ outboundId, ...body }: { outboundId: number } & ReportPickingShortageRequest) => outboundAllocationListSchema.parse((await httpClient.post(`/api/outbounds/${outboundId}/reallocation`, reportPickingShortageRequestSchema.parse(body))).data), ['inventory'])
}
