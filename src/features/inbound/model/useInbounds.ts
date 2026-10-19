import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import { useZoneInventorySummary } from '../../inventory/model/useZoneInventorySummary'
import type { ZoneCode } from '../../inventory/model/inventorySchemas'
import {
  inboundItemListSchema, inboundItemSchema, inboundListSchema, inboundSchema, inspectInboundItemRequestSchema, registerInboundRequestSchema, type Inbound, type InboundItem, type InboundStatus, type InboundStatusCounts, type InspectInboundItemRequest, type PaginatedInbound, type RegisterInboundRequest,
} from './inboundSchemas'

const emptyCounts = (): InboundStatusCounts => ({ EXPECTED: 0, WAITING: 0, PROCESSING: 0, COMPLETED: 0 })

// 서버 목록 API(GET /api/inbounds)는 창고 필터·페이지네이션이 없다. 한 번 전체를 받아
// 창고 범위(AccessScope) 필터, 상태별 건수, 최신순 정렬, 페이지 분할은 클라이언트에서 처리한다.
export function paginateInbounds(all: Inbound[], warehouseIds: number[], statuses: InboundStatus[], page: number, size: number): PaginatedInbound {
  const scoped = warehouseIds.length ? all.filter((inbound) => warehouseIds.includes(inbound.warehouseId)) : all
  const statusCounts = emptyCounts()
  scoped.forEach((inbound) => { statusCounts[inbound.status] += 1 })
  const filtered = (statuses.length ? scoped.filter((inbound) => statuses.includes(inbound.status)) : scoped).slice().sort((a, b) => b.inboundId - a.inboundId)
  return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts }
}

export function useInbounds(warehouseIds: number[], statuses: InboundStatus[], page: number, size = 4) {
  return useQuery({
    queryKey: ['inbounds', 'list'],
    queryFn: async () => inboundListSchema.parse((await httpClient.get('/api/inbounds')).data),
    select: (all) => paginateInbounds(all, warehouseIds, statuses, page, size),
  })
}

/** shelfLifeDays: 상품에 유통기한 일수가 있는지(검수에서 유통기한 필수 여부). 상품 정보를 아직 모르면 undefined다. */
export type InboundItemView = InboundItem & { productName: string; productCode: string; zoneCode: ZoneCode | null; shelfLifeDays: number | null | undefined }

/** 입고 품목에 상품명(GET /api/products)과 Zone 코드(zone-summary의 zoneId)를 붙여 화면용으로 합친다. */
export function useInboundItems(inboundId: number | undefined, warehouseIds: number[]) {
  const items = useQuery({
    queryKey: ['inbounds', 'items', inboundId],
    queryFn: async () => inboundItemListSchema.parse((await httpClient.get('/api/inbound-items', { params: { inboundId } })).data),
    enabled: inboundId !== undefined,
  })
  const products = useProducts()
  const zones = useZoneInventorySummary(warehouseIds)
  const data: InboundItemView[] | undefined = items.data?.map((item) => {
    const product = products.data?.find((candidate) => candidate.productId === item.productId)
    return { ...item, productName: product?.productName ?? `상품 #${item.productId}`, productCode: product?.productCode ?? '', zoneCode: zones.data?.find((zone) => zone.zoneId === item.zoneId)?.zoneCode ?? null, shelfLifeDays: product?.shelfLifeDays }
  })
  return { data, isLoading: items.isLoading, isError: items.isError, error: items.error }
}

function useInvalidatingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, alsoInvalidate: string[] = []) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['inbounds'] }), ...alsoInvalidate.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))])
    },
  })
}

export function useRegisterInbound() {
  return useInvalidatingMutation(async (body: RegisterInboundRequest) => inboundSchema.parse((await httpClient.post('/api/inbounds', registerInboundRequestSchema.parse(body))).data), ['inventory'])
}
export function useStartInboundProcessing() {
  return useInvalidatingMutation(async (inboundId: number) => inboundSchema.parse((await httpClient.patch(`/api/inbounds/${inboundId}/processing`)).data))
}
// 검수는 수령 라인 전체를 한 번에 보내고 품목당 한 번만 저장할 수 있다. 완료 때 Lot과 재고가 수령 라인 기준으로 등록된다.
export function useInspectInboundItem() {
  return useInvalidatingMutation(async ({ inboundItemId, body }: { inboundItemId: number; body: InspectInboundItemRequest }) => inboundItemSchema.parse((await httpClient.patch(`/api/inbound-items/${inboundItemId}/inspect`, inspectInboundItemRequestSchema.parse(body))).data))
}
// 완료는 본문이 없다. 완료하면 재고·Zone 사용량이 바뀌므로 inventory 쿼리도 함께 무효화한다.
export function useCompleteInbound() {
  return useInvalidatingMutation(async (inboundId: number) => inboundSchema.parse((await httpClient.patch(`/api/inbounds/${inboundId}/complete`)).data), ['inventory'])
}
