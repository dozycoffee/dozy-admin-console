import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { reconciliationPageSchema, reconciliationProposalSchema, type ReconciliationParams } from './reconciliationSchemas'

/** 비어 있는 조건은 쿼리에서 뺀다. */
export function toReconciliationQueryParams({ warehouseId, status, page, size }: ReconciliationParams) {
  return {
    ...(warehouseId !== undefined && { warehouseId }),
    ...(status && { status }),
    page,
    size,
  }
}

/** 대사 보정안 목록(최신순). 창고 관리자는 배정된 창고만 오지만 이 콘솔은 전체 창고를 보는 inventory:admin만 쓴다. */
export function useReconciliationProposals(params: ReconciliationParams) {
  return useQuery({
    queryKey: ['reconciliations', 'list', params],
    queryFn: async () => reconciliationPageSchema.parse((await inventoryHttpClient.get('/api/v1/reconciliations/proposals', { params: toReconciliationQueryParams(params) })).data),
    placeholderData: (previous) => previous,
  })
}

function useReviewMutation(action: 'approval' | 'rejection') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (stockAdjustmentId: number) =>
      reconciliationProposalSchema.parse((await inventoryHttpClient.post(`/api/v1/reconciliations/proposals/${stockAdjustmentId}/${action}`)).data),
    // 승인할 때 수량이 달라졌으면 서버가 보정안만 새 값으로 갱신하고 409를 주므로 실패해도 목록을 다시 받는다.
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
    // 승인하면 재고 수량이 바뀐다.
    onSuccess: () => (action === 'approval' ? queryClient.invalidateQueries({ queryKey: ['stock'] }) : undefined),
  })
}

/** 승인하면 같은 트랜잭션에서 재고에 반영한다. 이미 반영됐으면 변경 없이 현재 보정안을 돌려준다. */
export function useApproveReconciliation() {
  return useReviewMutation('approval')
}

/** 거절은 수량을 바꾸지 않는다. 이미 거절됐으면 변경 없이 현재 보정안을 돌려준다. */
export function useRejectReconciliation() {
  return useReviewMutation('rejection')
}
