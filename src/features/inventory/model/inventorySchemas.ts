import { z } from 'zod'

export const zoneCodeSchema = z.enum(['A', 'B', 'C', 'D', 'E', 'F'])
export type ZoneCode = z.infer<typeof zoneCodeSchema>

export const zoneCodeLabels: Record<ZoneCode, string> = {
  A: '원두',
  B: '시럽',
  C: '분말/파우더',
  D: '유제품',
  E: '컵/소모품/포장재',
  F: 'MD 상품',
}

export const qualityStatusSchema = z.enum(['NORMAL', 'DEFECTIVE', 'DISPOSAL_SCHEDULED'])
export type QualityStatus = z.infer<typeof qualityStatusSchema>

export const qualityStatusLabels: Record<QualityStatus, string> = {
  NORMAL: '정상',
  DEFECTIVE: '불량',
  DISPOSAL_SCHEDULED: '폐기 예정',
}

// 서버는 quantityByQualityStatus를 QualityStatus별 개수가 있는 항목만 내려준다(0인 상태는 키 자체가
// 없을 수 있음) — z.record(enum, ...)는 모든 키를 필수로 요구해 파싱에 실패하므로, 키는 string으로
// 느슨하게 받고 값 조회는 QualityStatus로 안전하게 lookup하도록 한다.
export const zoneInventorySummarySchema = z.object({
  zoneId: z.number(),
  zoneCode: zoneCodeSchema,
  warehouseId: z.number(),
  maxCapacity: z.number(),
  usedCapacity: z.number(),
  usageRate: z.number(),
  quantityByQualityStatus: z.record(z.string(), z.number()),
})
export type ZoneInventorySummary = z.infer<typeof zoneInventorySummarySchema>

export function quantityOf(summary: ZoneInventorySummary, status: QualityStatus): number {
  return summary.quantityByQualityStatus[status] ?? 0
}

export const zoneInventorySummaryListSchema = z.array(zoneInventorySummarySchema)
