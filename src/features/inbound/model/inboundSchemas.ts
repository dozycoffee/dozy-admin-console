import { z } from 'zod'

// dozy-wms-api 입고 상태 모델: EXPECTED → WAITING → PROCESSING → COMPLETED.
// 등록 시 Zone 용량 사전 점검을 통과하면 서버가 곧바로 WAITING까지 전환하므로 EXPECTED는 사실상 일시 상태다.
export const inboundStatusSchema = z.enum(['EXPECTED', 'WAITING', 'PROCESSING', 'COMPLETED'])
export type InboundStatus = z.infer<typeof inboundStatusSchema>
export const inboundStatusLabels: Record<InboundStatus, string> = { EXPECTED: '입고 예정', WAITING: '입고 대기', PROCESSING: '입고 처리중', COMPLETED: '입고 완료' }

export const inspectionResultSchema = z.enum(['PENDING', 'NORMAL', 'DEFECTIVE'])
export type InspectionResult = z.infer<typeof inspectionResultSchema>
export const inspectionResultLabels: Record<InspectionResult, string> = { PENDING: '검수 대기', NORMAL: '정상', DEFECTIVE: '불량' }

export const inboundSchema = z.object({
  inboundId: z.number(),
  warehouseId: z.number(),
  expectedArrivalDate: z.string(),
  status: inboundStatusSchema,
})
export type Inbound = z.infer<typeof inboundSchema>
export const inboundListSchema = z.array(inboundSchema)

export const inboundItemSchema = z.object({
  inboundItemId: z.number(),
  inboundId: z.number(),
  productId: z.number(),
  zoneId: z.number(),
  expectedQuantity: z.number(),
  actualQuantity: z.number().nullable(),
  inspectionResult: inspectionResultSchema,
  quantityDiscrepancy: z.number().nullable(),
})
export type InboundItem = z.infer<typeof inboundItemSchema>
export const inboundItemListSchema = z.array(inboundItemSchema)

export const registerInboundRequestSchema = z.object({
  warehouseId: z.number(),
  expectedArrivalDate: z.string().min(1),
  items: z.array(z.object({ productId: z.number(), expectedQuantity: z.number().int().positive() })).min(1),
})
export type RegisterInboundRequest = z.infer<typeof registerInboundRequestSchema>

export const inspectInboundItemRequestSchema = z.object({
  actualQuantity: z.number().int().nonnegative(),
  inspectionResult: z.enum(['NORMAL', 'DEFECTIVE']),
})
export type InspectInboundItemRequest = z.infer<typeof inspectInboundItemRequestSchema>

// 입고 완료 시 품목마다 Lot을 확정한다. lotNumber는 필수, 제조/유통기한은 선택이다.
export const completeInboundRequestSchema = z.object({
  lotAssignments: z.array(z.object({
    inboundItemId: z.number(),
    lotNumber: z.string().trim().min(1),
    manufactureDate: z.string().min(1).optional(),
    expirationDate: z.string().min(1).optional(),
  })),
})
export type CompleteInboundRequest = z.infer<typeof completeInboundRequestSchema>

export type InboundStatusCounts = Record<InboundStatus, number>
export type PaginatedInbound = { items: Inbound[]; total: number; page: number; size: number; statusCounts: InboundStatusCounts }
