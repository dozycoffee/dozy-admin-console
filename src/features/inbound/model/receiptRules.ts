import type { DefectReason, InspectInboundItemRequest, InspectionResult } from './inboundSchemas'

/** 검수 화면에서 입력 중인 수령 라인 한 줄. 입력칸 값이라 모두 문자열이다. */
export type ReceiptDraft = {
  lotNumber: string
  manufactureDate: string
  expirationDate: string
  quantity: string
  inspectionResult: InspectionResult
  defectReason: DefectReason | ''
}

export const emptyReceiptDraft = (quantity = ''): ReceiptDraft => ({ lotNumber: '', manufactureDate: '', expirationDate: '', quantity, inspectionResult: 'NORMAL', defectReason: '' })

export type ReceiptRuleContext = {
  expectedQuantity: number
  /** 상품에 유통기한 일수가 있으면 유통기한이 필수이고, 없으면 입력할 수 없다(dozy-wms-api ADR-0016). 상품 정보를 모르면 null이고 서버가 판정한다. */
  requiresExpiration: boolean | null
  /** 오늘 날짜(YYYY-MM-DD). 날짜 비교는 문자열 비교로 한다. */
  today: string
}

export type ReceiptValidation = {
  /** 줄마다의 오류(입력 순서와 같다) */
  lineErrors: string[][]
  /** 줄 하나로 묶이지 않는 오류(수량 합계 등) */
  formErrors: string[]
  valid: boolean
}

export function todayIso(now = new Date()): string {
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/**
 * 검수 요청을 보내기 전에 서버가 거부할 규칙을 먼저 확인한다. 서버도 같은 규칙으로 다시 검증하며(최종 판단은 서버),
 * 여기서는 보내기 전에 어디가 틀렸는지 보여주는 용도다. 수령 라인이 없으면(미도착) 항상 유효하다.
 */
export function validateReceiptDrafts(drafts: ReceiptDraft[], context: ReceiptRuleContext): ReceiptValidation {
  const lineErrors = drafts.map((draft) => lineErrorsOf(draft, context))
  const formErrors: string[] = []
  const total = drafts.reduce((sum, draft) => sum + (Number.isInteger(Number(draft.quantity)) ? Number(draft.quantity) : 0), 0)
  if (total > context.expectedQuantity) formErrors.push(`수령 수량의 합(${total})이 예정 수량(${context.expectedQuantity})을 넘을 수 없습니다.`)
  const expirationsByLot = new Map<string, Set<string>>()
  drafts.forEach((draft) => {
    const lot = draft.lotNumber.trim()
    if (lot) expirationsByLot.set(lot, (expirationsByLot.get(lot) ?? new Set()).add(draft.expirationDate))
  })
  expirationsByLot.forEach((expirations, lot) => {
    if (expirations.size > 1) formErrors.push(`같은 Lot(${lot})의 수령 라인은 유통기한이 같아야 합니다.`)
  })
  return { lineErrors, formErrors, valid: lineErrors.every((errors) => errors.length === 0) && formErrors.length === 0 }
}

function lineErrorsOf(draft: ReceiptDraft, { requiresExpiration, today }: ReceiptRuleContext): string[] {
  const errors: string[] = []
  const quantity = Number(draft.quantity)
  if (draft.lotNumber.trim() === '') errors.push('Lot 번호를 입력하세요.')
  else if (draft.lotNumber.trim().length > 50) errors.push('Lot 번호는 50자 이하여야 합니다.')
  if (draft.quantity === '' || !Number.isInteger(quantity) || quantity < 1) errors.push('수량은 1 이상의 정수여야 합니다.')
  if (requiresExpiration === true && draft.expirationDate === '') errors.push('이 상품은 유통기한이 필수입니다.')
  if (requiresExpiration === false && draft.expirationDate !== '') errors.push('이 상품은 유통기한을 입력할 수 없습니다.')
  if (draft.manufactureDate !== '' && draft.manufactureDate > today) errors.push('제조일은 오늘 이후일 수 없습니다.')
  if (draft.manufactureDate !== '' && draft.expirationDate !== '' && draft.manufactureDate > draft.expirationDate) errors.push('제조일은 유통기한보다 늦을 수 없습니다.')
  if (draft.inspectionResult === 'NORMAL' && draft.expirationDate !== '' && draft.expirationDate < today) errors.push('유통기한이 지난 라인은 불량으로만 입력할 수 있습니다.')
  if (draft.inspectionResult === 'DEFECTIVE' && draft.defectReason === '') errors.push('불량 사유를 선택하세요.')
  if (draft.inspectionResult === 'NORMAL' && draft.defectReason !== '') errors.push('정상 라인에는 불량 사유를 입력할 수 없습니다.')
  return errors
}

/** 입력 중인 수령 라인을 검수 요청 본문으로 바꾼다. 비어 있는 날짜·사유는 보내지 않는다. */
export function toInspectRequest(drafts: ReceiptDraft[]): InspectInboundItemRequest {
  return {
    receipts: drafts.map((draft) => ({
      lotNumber: draft.lotNumber.trim(),
      quantity: Number(draft.quantity),
      inspectionResult: draft.inspectionResult,
      ...(draft.manufactureDate && { manufactureDate: draft.manufactureDate }),
      ...(draft.expirationDate && { expirationDate: draft.expirationDate }),
      ...(draft.inspectionResult === 'DEFECTIVE' && draft.defectReason && { defectReason: draft.defectReason }),
    })),
  }
}
