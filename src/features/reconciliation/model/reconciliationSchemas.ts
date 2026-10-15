import { z } from 'zod'

/** 보정안 상태. 대사 보정안은 승인하면 바로 반영(APPLIED)되어 APPROVED는 거의 보이지 않는다(inventory ADR-0033). 서버가 모르는 값을 보내면 코드를 그대로 보여준다. */
export const reconciliationStatuses = ['PENDING', 'APPLIED', 'REJECTED', 'APPROVED'] as const
export const reconciliationStatusLabels: Record<string, string> = {
  PENDING: '승인 대기',
  APPLIED: '반영됨',
  REJECTED: '거절됨',
  APPROVED: '승인됨',
}

export function labelOf(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code
}

/** 보정안 한 건 = 불일치한 행(창고 × 상품 × Lot × 품질 상태) 하나. 변동량은 WMS 수량 − inventory 수량이다. */
export const reconciliationProposalSchema = z.object({
  stockAdjustmentId: z.number(),
  warehouseId: z.number(),
  reconciliationRunId: z.number().nullish(),
  status: z.string(),
  productId: z.number(),
  lotId: z.number(),
  lotNumber: z.string(),
  qualityStatus: z.string(),
  inventoryQuantity: z.number(),
  wmsQuantity: z.number(),
  quantityChange: z.number(),
  /** 변동량이 임계치를 넘어 상위 승인자(admin)만 승인할 수 있다. */
  requiresAdmin: z.boolean(),
  inventoryId: z.number().nullish(),
  approvedBy: z.string().nullish(),
  approvedAt: z.string().nullish(),
})
export type ReconciliationProposal = z.infer<typeof reconciliationProposalSchema>

export const reconciliationPageSchema = z.object({
  items: z.array(reconciliationProposalSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

/** 보정안 조회 조건. 비어 있는 값은 쿼리에서 뺀다. */
export type ReconciliationFilters = { warehouseId?: number; status?: string }
export type ReconciliationParams = ReconciliationFilters & { page: number; size: number }
