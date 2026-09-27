import { z } from 'zod'
import { zoneCodeSchema } from '../../inventory/model/inventorySchemas'

export const inboundStatusSchema = z.enum(['REQUESTED', 'APPROVED', 'ARRIVED', 'WAITING', 'PROCESSING', 'PUTAWAY_READY', 'COMPLETED', 'REJECTED'])
export type InboundStatus = z.infer<typeof inboundStatusSchema>
export const inboundStatusLabels: Record<InboundStatus, string> = { REQUESTED: '입고 요청', APPROVED: '입고 승인', ARRIVED: '물품 도착', WAITING: '검수 대기', PROCESSING: '검수 중', PUTAWAY_READY: '적재 대기', COMPLETED: '입고 완료', REJECTED: '입고 보류' }

export const inspectionQualitySchema = z.enum(['NORMAL', 'DEFECTIVE'])
export type InspectionQuality = z.infer<typeof inspectionQualitySchema>
export const inspectionQualityLabels: Record<InspectionQuality, string> = { NORMAL: '정상', DEFECTIVE: '불량 분리' }

const putawayPlanSchema = z.object({ locationId: z.string(), quantity: z.number().nonnegative(), capacity: z.number().positive(), remainingCapacity: z.number().nonnegative() })
export const inboundItemSchema = z.object({
  id: z.string(), sku: z.string(), productName: z.string(), targetZoneCode: zoneCodeSchema,
  expectedQuantity: z.number().positive(), receivedQuantity: z.number().nullable(), qualityStatus: inspectionQualitySchema.nullable(),
  lotNumber: z.string().nullable(), expirationDate: z.string().nullable(), putawayPlans: z.array(putawayPlanSchema),
})
export type InboundItem = z.infer<typeof inboundItemSchema>
export const inboundSchema = z.object({
  id: z.string(), warehouseId: z.number(), supplierName: z.string(), expectedArrivalAt: z.string(), status: inboundStatusSchema,
  capacityCheck: z.object({ status: z.enum(['AVAILABLE', 'PARTIAL', 'UNAVAILABLE']), requiredCapacity: z.number(), availableCapacity: z.number(), message: z.string() }),
  receivingAreaCheck: z.object({ workAreaName: z.string(), status: z.enum(['AVAILABLE', 'UNAVAILABLE']), requiredCapacity: z.number(), availableCapacity: z.number(), message: z.string(), nextAvailableAt: z.string().nullable() }),
  items: z.array(inboundItemSchema),
})
export type Inbound = z.infer<typeof inboundSchema>
export const inboundListSchema = z.array(inboundSchema)
export const inboundStatusCountSchema = z.record(inboundStatusSchema, z.number())
export const paginatedInboundSchema = z.object({ items: inboundListSchema, total: z.number().nonnegative(), page: z.number().positive(), size: z.number().positive(), statusCounts: inboundStatusCountSchema })
export type PaginatedInbound = z.infer<typeof paginatedInboundSchema>

export const completeInspectionRequestSchema = z.object({ items: z.array(z.object({ inboundItemId: z.string(), receivedQuantity: z.number().nonnegative(), qualityStatus: inspectionQualitySchema })) })
export type CompleteInspectionRequest = z.infer<typeof completeInspectionRequestSchema>
