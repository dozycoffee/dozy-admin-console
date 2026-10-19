import { z } from 'zod'

// dozy-wms-api 입고 상태 모델: EXPECTED → WAITING → PROCESSING → COMPLETED.
// 등록 시 Zone 용량 사전 점검을 통과하면 서버가 곧바로 WAITING까지 전환하므로 EXPECTED는 사실상 일시 상태다.
export const inboundStatusSchema = z.enum(['EXPECTED', 'WAITING', 'PROCESSING', 'COMPLETED'])
export type InboundStatus = z.infer<typeof inboundStatusSchema>
export const inboundStatusLabels: Record<InboundStatus, string> = { EXPECTED: '입고 예정', WAITING: '입고 대기', PROCESSING: '입고 처리중', COMPLETED: '입고 완료' }

// 수령 라인(Receipt) 한 줄의 판정. 검수 전 품목은 수령 라인이 없다(품목은 inspectionStatus로 검수 전/후를 구분한다).
export const inspectionResultSchema = z.enum(['NORMAL', 'DEFECTIVE'])
export type InspectionResult = z.infer<typeof inspectionResultSchema>
export const inspectionResultLabels: Record<InspectionResult, string> = { NORMAL: '정상', DEFECTIVE: '불량' }

export const inspectionStatusSchema = z.enum(['PENDING', 'INSPECTED'])
export type InspectionStatus = z.infer<typeof inspectionStatusSchema>
export const inspectionStatusLabels: Record<InspectionStatus, string> = { PENDING: '검수 대기', INSPECTED: '검수 완료' }

// 불량 수령 라인의 사유. 폐기 요청 사유는 서버가 EXPIRED는 유통기한 경과로, 나머지는 검수 불량으로 연계한다.
export const defectReasonSchema = z.enum(['DAMAGED', 'EXPIRED', 'QUALITY', 'OTHER'])
export type DefectReason = z.infer<typeof defectReasonSchema>
export const defectReasonLabels: Record<DefectReason, string> = { DAMAGED: '파손', EXPIRED: '유통기한 경과', QUALITY: '품질 불량', OTHER: '기타' }

export const inboundSchema = z.object({
  inboundId: z.number(),
  warehouseId: z.number(),
  expectedArrivalDate: z.string(),
  status: inboundStatusSchema,
})
export type Inbound = z.infer<typeof inboundSchema>
export const inboundListSchema = z.array(inboundSchema)

// 검수에서 확정한 수령 라인: 같은 품목이 Lot 여러 개로, 일부만 파손된 채로 도착할 수 있어 품목 1 : 수령 라인 N이다.
export const inboundReceiptSchema = z.object({
  inboundReceiptId: z.number(),
  lotNumber: z.string(),
  manufactureDate: z.string().nullable(),
  expirationDate: z.string().nullable(),
  quantity: z.number(),
  inspectionResult: inspectionResultSchema,
  defectReason: defectReasonSchema.nullable(),
})
export type InboundReceipt = z.infer<typeof inboundReceiptSchema>

// 예정 Lot·유통기한은 공급사가 미리 알려 준 참고값이고(선택), 검수에서 실물 값이 확정된다.
// actualQuantity는 수령 라인 수량의 합이며 검수 전에는 null, quantityDiscrepancy는 예정 대비 차이다.
export const inboundItemSchema = z.object({
  inboundItemId: z.number(),
  inboundId: z.number(),
  productId: z.number(),
  zoneId: z.number(),
  expectedQuantity: z.number(),
  expectedLotNumber: z.string().nullish(),
  expectedExpirationDate: z.string().nullish(),
  actualQuantity: z.number().nullable(),
  inspectionStatus: inspectionStatusSchema,
  quantityDiscrepancy: z.number().nullable(),
  receipts: z.array(inboundReceiptSchema),
})
export type InboundItem = z.infer<typeof inboundItemSchema>
export const inboundItemListSchema = z.array(inboundItemSchema)

export const registerInboundRequestSchema = z.object({
  warehouseId: z.number(),
  expectedArrivalDate: z.string().min(1),
  items: z.array(z.object({ productId: z.number(), expectedQuantity: z.number().int().positive() })).min(1),
})
export type RegisterInboundRequest = z.infer<typeof registerInboundRequestSchema>

// 검수는 품목당 한 번이고 수령 라인 전체를 한 번에 보낸다. 미도착은 수령 라인 0건이다.
// 서버 규칙: Lot 필수, 수량 1 이상(합계는 예정 수량 이하), 불량은 사유 필수·정상은 사유 불가,
// 유통기한은 상품에 유통기한 일수가 있으면 필수·없으면 불가, 유통기한이 지난 라인은 정상 불가.
export const inspectInboundItemRequestSchema = z.object({
  receipts: z.array(z.object({
    lotNumber: z.string().trim().min(1),
    manufactureDate: z.string().min(1).optional(),
    expirationDate: z.string().min(1).optional(),
    quantity: z.number().int().positive(),
    inspectionResult: inspectionResultSchema,
    defectReason: defectReasonSchema.optional(),
  })),
})
export type InspectInboundItemRequest = z.infer<typeof inspectInboundItemRequestSchema>

export type InboundStatusCounts = Record<InboundStatus, number>
export type PaginatedInbound = { items: Inbound[]; total: number; page: number; size: number; statusCounts: InboundStatusCounts }
