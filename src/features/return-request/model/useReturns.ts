import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { useProducts } from '../../product/model/useProducts'
import {
  completeReturnRequestSchema, inspectReturnItemRequestSchema, registerReturnRequestSchema, returnItemListSchema, returnRequestListSchema, returnRequestSchema,
  type CompleteReturnRequest, type InspectReturnItemRequest, type PaginatedReturn, type RegisterReturnRequest, type ReturnItem, type ReturnRequest, type ReturnStatus, type ReturnStatusCounts,
} from './returnSchemas'

const emptyCounts = (): ReturnStatusCounts => ({ RECEIVED: 0, INSPECTING: 0, COMPLETED: 0 })

// 서버 목록 API(GET /api/return-requests)는 창고 필터·페이지네이션이 없어 입고·출고와 같이 클라이언트에서 처리한다.
export function paginateReturns(all: ReturnRequest[], warehouseIds: number[], statuses: ReturnStatus[], page: number, size: number): PaginatedReturn {
  const scoped = warehouseIds.length ? all.filter((request) => warehouseIds.includes(request.warehouseId)) : all
  const statusCounts = emptyCounts()
  scoped.forEach((request) => { statusCounts[request.status] += 1 })
  const filtered = (statuses.length ? scoped.filter((request) => statuses.includes(request.status)) : scoped).slice().sort((a, b) => b.returnRequestId - a.returnRequestId)
  return { items: filtered.slice((page - 1) * size, page * size), total: filtered.length, page, size, statusCounts }
}

export function useReturns(warehouseIds: number[], statuses: ReturnStatus[], page: number, size = 4) {
  return useQuery({
    queryKey: ['returns', 'list'],
    queryFn: async () => returnRequestListSchema.parse((await httpClient.get('/api/return-requests')).data),
    select: (all) => paginateReturns(all, warehouseIds, statuses, page, size),
  })
}

export type ReturnItemView = ReturnItem & { productName: string; productCode: string }

/** 반품 품목에 상품명(GET /api/products)을 붙여 화면용으로 합친다. */
export function useReturnItems(returnRequestId: number | undefined) {
  const items = useQuery({
    queryKey: ['returns', 'items', returnRequestId],
    queryFn: async () => returnItemListSchema.parse((await httpClient.get('/api/return-items', { params: { returnRequestId } })).data),
    enabled: returnRequestId !== undefined,
  })
  const products = useProducts()
  const data: ReturnItemView[] | undefined = items.data?.map((item) => {
    const product = products.data?.find((candidate) => candidate.productId === item.productId)
    return { ...item, productName: product?.productName ?? `상품 #${item.productId}`, productCode: product?.productCode ?? '' }
  })
  return { data, isLoading: items.isLoading, isError: items.isError, error: items.error }
}

function useInvalidatingMutation<TVariables>(mutationFn: (variables: TVariables) => Promise<unknown>, alsoInvalidate: string[] = []) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn,
    onSuccess: async () => {
      await Promise.all([queryClient.invalidateQueries({ queryKey: ['returns'] }), ...alsoInvalidate.map((root) => queryClient.invalidateQueries({ queryKey: [root] }))])
    },
  })
}

export function useRegisterReturn() {
  return useInvalidatingMutation(async (body: RegisterReturnRequest) => returnRequestSchema.parse((await httpClient.post('/api/return-requests', registerReturnRequestSchema.parse(body))).data))
}
export function useStartReturnInspecting() {
  return useInvalidatingMutation(async (returnRequestId: number) => returnRequestSchema.parse((await httpClient.patch(`/api/return-requests/${returnRequestId}/start-inspecting`)).data))
}
export function useInspectReturnItem() {
  return useInvalidatingMutation(async ({ returnItemId, body }: { returnItemId: number; body: InspectReturnItemRequest }) => (await httpClient.patch(`/api/return-items/${returnItemId}/inspect`, inspectReturnItemRequestSchema.parse(body))).data)
}
// 완료하면 정상 재고가 복귀하고 불량은 폐기 요청이 생기므로 inventory·disposals 쿼리도 함께 무효화한다.
export function useCompleteReturn() {
  return useInvalidatingMutation(async ({ returnRequestId, body }: { returnRequestId: number; body: CompleteReturnRequest }) => returnRequestSchema.parse((await httpClient.patch(`/api/return-requests/${returnRequestId}/complete`, completeReturnRequestSchema.parse(body))).data), ['inventory', 'disposals'])
}
