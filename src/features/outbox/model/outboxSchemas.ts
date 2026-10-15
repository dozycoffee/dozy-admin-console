import { z } from 'zod'

/** 이벤트가 속한 집계. 서버가 모르는 값을 보내면 코드를 그대로 보여준다. */
export const aggregateTypeLabels: Record<string, string> = {
  INVENTORY: '재고',
  RESERVATION: '예약',
  LOT: 'Lot',
  PRODUCT: '상품',
  ADJUSTMENT: '조정',
}

export const outboxStatusLabels: Record<string, string> = {
  PENDING: '발행 대기',
  PUBLISHED: '발행됨',
  DEAD: '격리됨',
}

export function labelOf(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code
}

/** 발행에 영구 실패해 격리된(DEAD) Outbox 이벤트. 목록과 상세가 같은 모양이고 payload(JSON 문자열)도 함께 온다. */
export const outboxEventSchema = z.object({
  outboxEventId: z.number(),
  aggregateType: z.string(),
  aggregateId: z.number(),
  eventType: z.string(),
  partitionKey: z.string(),
  payload: z.string(),
  status: z.string(),
  attemptCount: z.number(),
  lastError: z.string().nullish(),
  createdAt: z.string().nullish(),
  deadAt: z.string().nullish(),
})
export type OutboxEvent = z.infer<typeof outboxEventSchema>

export const outboxEventPageSchema = z.object({
  items: z.array(outboxEventSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

/** payload는 JSON 문자열이다. 보기 좋게 들여써 보여주고 JSON이 아니면 받은 그대로 보여준다. */
export function formatPayload(payload: string): string {
  try {
    return JSON.stringify(JSON.parse(payload), null, 2)
  } catch {
    return payload
  }
}
