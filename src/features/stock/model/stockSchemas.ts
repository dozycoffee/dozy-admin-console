import { z } from 'zod'

/** 품질 상태. 서버가 모르는 값을 보내면 코드를 그대로 보여준다. */
export const qualityStatuses = ['NORMAL', 'DEFECTIVE', 'DISPOSAL_SCHEDULED'] as const
export const qualityStatusLabels: Record<string, string> = {
  NORMAL: '정상',
  DEFECTIVE: '불량',
  DISPOSAL_SCHEDULED: '폐기 예정',
}

export const lotStatuses = ['NORMAL', 'EXPIRING_SOON', 'EXPIRED'] as const
export const lotStatusLabels: Record<string, string> = {
  NORMAL: '정상',
  EXPIRING_SOON: '유통기한 임박',
  EXPIRED: '유통기한 만료',
}

export const historyTypeLabels: Record<string, string> = {
  INBOUND: '입고',
  RETURN: '반품 복귀',
  OUTBOUND: '출고',
  DISPOSAL: '폐기',
  ADJUSTMENT: '실사 조정',
  RECONCILIATION: '대사 보정',
  QUALITY_TRANSFER: '품질 상태 이동',
}

export const referenceTypeLabels: Record<string, string> = {
  INBOUND_ITEM: '입고 품목',
  RETURN_ITEM: '반품 품목',
  RESERVATION: '예약',
  DISPOSAL_ITEM: '폐기 품목',
  STOCK_ADJUSTMENT_ITEM: '조정 품목',
  LOT_EXPIRATION: 'Lot 유통기한 만료',
}

export function labelOf(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code
}

/** 재고 행 하나(창고 × Lot × 품질 상태). 상품 코드·이름·단위는 inventory가 상품 마스터에서 채워 준다. */
export const stockItemSchema = z.object({
  inventoryId: z.number(),
  warehouseId: z.number(),
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  unit: z.string(),
  lotId: z.number(),
  lotNumber: z.string(),
  manufactureDate: z.string().nullish(),
  expirationDate: z.string().nullish(),
  lotStatus: z.string(),
  qualityStatus: z.string(),
  quantity: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  allocationHold: z.boolean(),
  holdReason: z.string().nullish(),
  heldAt: z.string().nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type StockItem = z.infer<typeof stockItemSchema>

const pageFields = { page: z.number(), size: z.number(), totalElements: z.number(), totalPages: z.number() }

export const stockPageSchema = z.object({ items: z.array(stockItemSchema), ...pageFields })
export type StockPage = z.infer<typeof stockPageSchema>

/**
 * 상품별 요약 한 줄. 조건에 맞는 재고 행을 상품 단위로 합친 값이다. 가용 수량은 총 수량 − 예약 수량이라 품질 상태와 보류를 반영하지 않고,
 * 불량·보류·만료·임박 수량은 해당하는 행의 총 수량이며 서로 겹칠 수 있다.
 */
export const stockSummarySchema = z.object({
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  unit: z.string(),
  warehouseCount: z.number(),
  rowCount: z.number(),
  quantity: z.number(),
  reservedQuantity: z.number(),
  availableQuantity: z.number(),
  defectiveQuantity: z.number(),
  heldQuantity: z.number(),
  expiredQuantity: z.number(),
  expiringSoonQuantity: z.number(),
})
export type StockSummary = z.infer<typeof stockSummarySchema>

export const stockSummaryPageSchema = z.object({ items: z.array(stockSummarySchema), ...pageFields })

export const stockHistorySchema = z.object({
  inventoryHistoryId: z.number(),
  historyType: z.string(),
  quantityChange: z.number(),
  quantityAfter: z.number(),
  referenceType: z.string(),
  referenceId: z.number(),
  idempotencyKey: z.string(),
  requesterService: z.string(),
  createdAt: z.string(),
})
export type StockHistory = z.infer<typeof stockHistorySchema>

export const stockHistoryPageSchema = z.object({ items: z.array(stockHistorySchema), ...pageFields })

/** 재고 현황 조회 조건. 비어 있는 값은 쿼리에서 뺀다. `allocationHold`는 '' = 전체. */
export type StockFilters = {
  warehouseId?: number
  productId?: number
  qualityStatus?: string
  lotStatus?: string
  allocationHold?: boolean
}
export type StockParams = StockFilters & { page: number; size: number }
