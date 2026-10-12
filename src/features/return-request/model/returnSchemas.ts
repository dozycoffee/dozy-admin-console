import { z } from 'zod'

// dozy-wms-api 반품 상태 모델: RECEIVED → INSPECTING → COMPLETED.
export const returnStatusSchema = z.enum(['RECEIVED', 'INSPECTING', 'COMPLETED'])
export type ReturnStatus = z.infer<typeof returnStatusSchema>
export const returnStatusLabels: Record<ReturnStatus, string> = { RECEIVED: '반품 접수', INSPECTING: '검수 중', COMPLETED: '반품 완료' }

export const returnInspectionResultSchema = z.enum(['PENDING', 'NORMAL', 'DEFECTIVE'])
export type ReturnInspectionResult = z.infer<typeof returnInspectionResultSchema>
export const returnInspectionResultLabels: Record<ReturnInspectionResult, string> = { PENDING: '검수 대기', NORMAL: '정상', DEFECTIVE: '불량' }

export const returnRequestSchema = z.object({
  returnRequestId: z.number(),
  warehouseId: z.number(),
  status: returnStatusSchema,
})
export type ReturnRequest = z.infer<typeof returnRequestSchema>
export const returnRequestListSchema = z.array(returnRequestSchema)

export const returnItemSchema = z.object({
  returnItemId: z.number(),
  returnRequestId: z.number(),
  productId: z.number(),
  expectedQuantity: z.number(),
  actualQuantity: z.number().nullable(),
  inspectionResult: returnInspectionResultSchema,
  quantityDiscrepancy: z.number().nullable(),
})
export type ReturnItem = z.infer<typeof returnItemSchema>
export const returnItemListSchema = z.array(returnItemSchema)

export const registerReturnRequestSchema = z.object({
  warehouseId: z.number(),
  items: z.array(z.object({ productId: z.number(), expectedQuantity: z.number().int().positive() })).min(1),
})
export type RegisterReturnRequest = z.infer<typeof registerReturnRequestSchema>

export const inspectReturnItemRequestSchema = z.object({
  actualQuantity: z.number().int().nonnegative(),
  inspectionResult: z.enum(['NORMAL', 'DEFECTIVE']),
})
export type InspectReturnItemRequest = z.infer<typeof inspectReturnItemRequestSchema>

// 반품 완료 시 품목마다 Lot을 확정한다. lotNumber는 필수, 제조/유통기한은 선택이다.
export const completeReturnRequestSchema = z.object({
  lotAssignments: z.array(z.object({
    returnItemId: z.number(),
    lotNumber: z.string().trim().min(1),
    manufactureDate: z.string().min(1).optional(),
    expirationDate: z.string().min(1).optional(),
  })),
})
export type CompleteReturnRequest = z.infer<typeof completeReturnRequestSchema>

export type ReturnStatusCounts = Record<ReturnStatus, number>
export type PaginatedReturn = { items: ReturnRequest[]; total: number; page: number; size: number; statusCounts: ReturnStatusCounts }
