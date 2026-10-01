import { z } from 'zod'

// dozy-wms-api 폐기 상태 모델: REQUESTED → APPROVED → COMPLETED.
export const disposalStatusSchema = z.enum(['REQUESTED', 'APPROVED', 'COMPLETED'])
export type DisposalStatus = z.infer<typeof disposalStatusSchema>
export const disposalStatusLabels: Record<DisposalStatus, string> = { REQUESTED: '폐기 요청', APPROVED: '폐기 승인', COMPLETED: '폐기 완료' }

export const disposalReasonSchema = z.enum(['EXPIRED', 'INSPECTION_DEFECT', 'RETURN_DEFECT', 'OTHER'])
export type DisposalReason = z.infer<typeof disposalReasonSchema>
export const disposalReasonLabels: Record<DisposalReason, string> = { EXPIRED: '유통기한 경과', INSPECTION_DEFECT: '검수 불량', RETURN_DEFECT: '반품 불량', OTHER: '기타' }
// 사용자가 직접 등록할 때 고를 수 있는 사유. 검수·반품 불량은 입고/반품 완료가 자동으로 만든다.
export const manualDisposalReasons: DisposalReason[] = ['EXPIRED', 'OTHER']

export const disposalSchema = z.object({
  disposalId: z.number(),
  warehouseId: z.number(),
  status: disposalStatusSchema,
})
export type Disposal = z.infer<typeof disposalSchema>
export const disposalListSchema = z.array(disposalSchema)

export const disposalItemSchema = z.object({
  disposalItemId: z.number(),
  disposalId: z.number(),
  inventoryId: z.number(),
  quantity: z.number(),
  reason: disposalReasonSchema,
})
export type DisposalItem = z.infer<typeof disposalItemSchema>
export const disposalItemListSchema = z.array(disposalItemSchema)

// 서버는 폐기 수량이 대상 재고 수량과 정확히 같아야 등록을 허용한다.
export const registerDisposalRequestSchema = z.object({
  warehouseId: z.number(),
  items: z.array(z.object({ inventoryId: z.number(), quantity: z.number().int().positive(), reason: disposalReasonSchema })).min(1),
})
export type RegisterDisposalRequest = z.infer<typeof registerDisposalRequestSchema>

export type DisposalStatusCounts = Record<DisposalStatus, number>
export type PaginatedDisposal = { items: Disposal[]; total: number; page: number; size: number; statusCounts: DisposalStatusCounts }
