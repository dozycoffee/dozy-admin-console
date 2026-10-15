import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { inventoryHttpClient } from '../../../shared/api/httpClient'
import { outboxEventPageSchema, outboxEventSchema } from './outboxSchemas'

/** 발행에 영구 실패해 격리된(DEAD) 이벤트 목록. 서버가 DEAD만 준다. */
export function useOutboxEvents(page: number, size: number) {
  return useQuery({
    queryKey: ['outbox', 'list', page, size],
    queryFn: async () => outboxEventPageSchema.parse((await inventoryHttpClient.get('/api/v1/outbox-events', { params: { page, size } })).data),
    placeholderData: (previous) => previous,
  })
}

/**
 * 격리된 이벤트를 발행 대기(PENDING)로 되돌린다. 시도 횟수와 오류를 지우고, 이미 대기 중이거나 발행됐으면 409 `INV_INVALID_OUTBOX_STATE`다.
 * 실패해도 목록을 다시 받아 다른 사람이 먼저 처리한 상태를 보여준다.
 */
export function useRequeueOutboxEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (outboxEventId: number) => outboxEventSchema.parse((await inventoryHttpClient.post(`/api/v1/outbox-events/${outboxEventId}/requeue`)).data),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['outbox'] }),
  })
}
