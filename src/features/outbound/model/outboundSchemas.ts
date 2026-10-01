import { z } from 'zod'

// dozy-wms-api 출고 상태 모델: REQUESTED → PICKING → INSPECTING → COMPLETED.
export const outboundStatusSchema = z.enum(['REQUESTED', 'PICKING', 'INSPECTING', 'COMPLETED'])
export type OutboundStatus = z.infer<typeof outboundStatusSchema>
export const outboundStatusLabels: Record<OutboundStatus, string> = { REQUESTED: '출고 요청', PICKING: '피킹중', INSPECTING: '검수중', COMPLETED: '출고 완료' }

export const outboundSchema = z.object({
  outboundId: z.number(),
  warehouseId: z.number(),
  status: outboundStatusSchema,
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

export const registerOutboundRequestSchema = z.object({
  warehouseId: z.number(),
  items: z.array(z.object({ productId: z.number(), requestedQuantity: z.number().int().positive() })).min(1),
})
export type RegisterOutboundRequest = z.infer<typeof registerOutboundRequestSchema>

export const outboundRecommendationSchema = z.object({
  lotId: z.number(),
  lotNumber: z.string(),
  productId: z.number(),
  productName: z.string(),
  expirationDate: z.string(),
  availableQuantity: z.number(),
  recommendedAt: z.string(),
})
export type OutboundRecommendation = z.infer<typeof outboundRecommendationSchema>
export const outboundRecommendationListSchema = z.array(outboundRecommendationSchema)

export type OutboundStatusCounts = Record<OutboundStatus, number>
export type PaginatedOutbound = { items: Outbound[]; total: number; page: number; size: number; statusCounts: OutboundStatusCounts }
