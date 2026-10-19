import { z } from 'zod'

// dozy-wms-api 출고 상태 모델: REQUESTED → PICKING → INSPECTING → COMPLETED.
// 취소는 피킹 전이면 바로 CANCELED, 피킹·검수 중이면 CANCEL_REQUESTED(관리자 승인 대기) → CANCELED다.
export const outboundStatusSchema = z.enum(['REQUESTED', 'PICKING', 'INSPECTING', 'COMPLETED', 'CANCEL_REQUESTED', 'CANCELED'])
export type OutboundStatus = z.infer<typeof outboundStatusSchema>
export const outboundStatusLabels: Record<OutboundStatus, string> = { REQUESTED: '출고 요청', PICKING: '피킹중', INSPECTING: '검수중', COMPLETED: '출고 완료', CANCEL_REQUESTED: '취소 승인 대기', CANCELED: '취소됨' }

// 출고는 inventory의 예약 확정으로 만들어져 reservationId·channel·externalOrderId가 있다(예약 없는 출고는 null).
export const outboundSchema = z.object({
  outboundId: z.number(),
  warehouseId: z.number(),
  status: outboundStatusSchema,
  reservationId: z.number().nullish(),
  channel: z.string().nullish(),
  externalOrderId: z.string().nullish(),
})
export type Outbound = z.infer<typeof outboundSchema>
export const outboundListSchema = z.array(outboundSchema)

// pickedQuantity/shortageQuantity는 피킹을 시작하기 전까지 null이다.
export const outboundItemSchema = z.object({
  outboundItemId: z.number(),
  outboundId: z.number(),
  productId: z.number(),
  requestedQuantity: z.number(),
  pickedQuantity: z.number().nullable(),
  shortageQuantity: z.number().nullable(),
})
export type OutboundItem = z.infer<typeof outboundItemSchema>
export const outboundItemListSchema = z.array(outboundItemSchema)

// 피킹 계획: 예약이 할당한 Lot별 수량이다. 피킹을 시작하기 전까지 pickedQuantity는 null이다.
export const outboundAllocationSchema = z.object({
  outboundAllocationId: z.number(),
  outboundItemId: z.number(),
  productId: z.number(),
  inventoryId: z.number(),
  lotNumber: z.string(),
  expirationDate: z.string().nullable(),
  quantity: z.number(),
  pickedQuantity: z.number().nullable(),
})
export type OutboundAllocation = z.infer<typeof outboundAllocationSchema>
export const outboundAllocationListSchema = z.array(outboundAllocationSchema)

// 피킹할 수 없는 Lot의 부족 수량. 같은 할당을 두 번 지정할 수 없다.
export const reportPickingShortageRequestSchema = z.object({
  shortages: z.array(z.object({ outboundAllocationId: z.number(), shortageQuantity: z.number().int().positive() })).min(1),
})
export type ReportPickingShortageRequest = z.infer<typeof reportPickingShortageRequestSchema>

export type OutboundStatusCounts = Record<OutboundStatus, number>
export type PaginatedOutbound = { items: Outbound[]; total: number; page: number; size: number; statusCounts: OutboundStatusCounts }
