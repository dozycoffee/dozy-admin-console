import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { httpClient } from '../../../shared/api/httpClient'
import { completeInspectionRequestSchema, inboundSchema, paginatedInboundSchema, type CompleteInspectionRequest, type InboundStatus } from './inboundSchemas'

const key = (warehouseIds: number[], statuses: InboundStatus[], page: number) => ['inbounds', { warehouseIds, statuses, page }] as const
export function useInbounds(warehouseIds: number[], statuses: InboundStatus[], page: number, size = 4) {
  return useQuery({ queryKey: key(warehouseIds, statuses, page), queryFn: async () => paginatedInboundSchema.parse((await httpClient.get('/api/inbounds', { params: { warehouseIds, statuses: statuses.join(','), page, size } })).data), placeholderData: keepPreviousData })
}
function useInboundAction(path: (id: string) => string) {
  const queryClient = useQueryClient()
  return useMutation({ mutationFn: async ({ id, body }: { id: string; body?: unknown }) => inboundSchema.parse((await httpClient.post(path(id), body)).data), onSuccess: () => queryClient.invalidateQueries({ queryKey: ['inbounds'] }) })
}
export function useStartInspection() { return useInboundAction((id) => `/api/inbounds/${id}/start-inspection`) }
export function useApproveInbound() { return useInboundAction((id) => `/api/inbounds/${id}/approve`) }
export function useMarkInboundArrived() { return useInboundAction((id) => `/api/inbounds/${id}/mark-arrived`) }
export function useMoveToReceivingArea() { return useInboundAction((id) => `/api/inbounds/${id}/move-to-receiving-area`) }
export function useCompleteInspection() {
  const action = useInboundAction((id) => `/api/inbounds/${id}/complete-inspection`)
  return { ...action, mutate: (input: { id: string; body: CompleteInspectionRequest }) => action.mutate({ ...input, body: completeInspectionRequestSchema.parse(input.body) }) }
}
export function useCompletePutaway() { return useInboundAction((id) => `/api/inbounds/${id}/complete-putaway`) }
