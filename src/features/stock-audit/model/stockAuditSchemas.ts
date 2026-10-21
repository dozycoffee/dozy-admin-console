import { z } from 'zod'

// dozy-wms-api 실사 상태 모델: SCHEDULED → IN_PROGRESS → COMPLETED → CLOSED (역행·건너뛰기 불가).
export const stockAuditStatusSchema = z.enum(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CLOSED'])
export type StockAuditStatus = z.infer<typeof stockAuditStatusSchema>
export const stockAuditStatusLabels: Record<StockAuditStatus, string> = { SCHEDULED: '실사 예정', IN_PROGRESS: '실사 진행', COMPLETED: '조정 확정 대기', CLOSED: '조정 확정' }

export const stockAuditSchema = z.object({
  stockAuditId: z.number(),
  warehouseId: z.number(),
  zoneId: z.number(),
  status: stockAuditStatusSchema,
  assignee: z.string().nullable(),
  approvedBy: z.string().nullable(),
})
export type StockAudit = z.infer<typeof stockAuditSchema>
export const stockAuditListSchema = z.array(stockAuditSchema)

// discrepancy는 카운트값 - 스냅샷값이고 카운트 전에는 null이다. hasUncommittedMovement는 스냅샷 이후 장부 행이 바뀌었다는 표시(완료 때 계산)다.
export const stockAuditItemSchema = z.object({
  stockAuditItemId: z.number(),
  stockAuditId: z.number(),
  locationStockId: z.number(),
  snapshotQuantity: z.number(),
  countedQuantity: z.number().nullable(),
  discrepancy: z.number().nullable(),
  hasUncommittedMovement: z.boolean(),
})
export type StockAuditItem = z.infer<typeof stockAuditItemSchema>
export const stockAuditItemListSchema = z.array(stockAuditItemSchema)

export const registerStockAuditRequestSchema = z.object({ warehouseId: z.number(), zoneId: z.number() })
export type RegisterStockAuditRequest = z.infer<typeof registerStockAuditRequestSchema>

export const countStockAuditItemRequestSchema = z.object({ countedQuantity: z.number().int().min(0) })
export type CountStockAuditItemRequest = z.infer<typeof countStockAuditItemRequestSchema>

export type StockAuditStatusCounts = Record<StockAuditStatus, number>
export type PaginatedStockAudit = { items: StockAudit[]; total: number; page: number; size: number; statusCounts: StockAuditStatusCounts }
