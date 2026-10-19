import { describe, expect, it } from 'vitest'
import { emptyReceiptDraft, toInspectRequest, todayIso, validateReceiptDrafts, type ReceiptDraft } from './receiptRules'

const context = { expectedQuantity: 50, requiresExpiration: true, today: '2026-10-19' }
const line = (patch: Partial<ReceiptDraft> = {}): ReceiptDraft => ({ ...emptyReceiptDraft('10'), lotNumber: 'LOT-1', expirationDate: '2027-01-01', ...patch })

describe('todayIso', () => {
  it('로컬 날짜를 YYYY-MM-DD로 돌려준다', () => {
    expect(todayIso(new Date(2026, 9, 5))).toBe('2026-10-05')
  })
})

describe('validateReceiptDrafts', () => {
  it('규칙을 지킨 수령 라인은 유효하다', () => {
    expect(validateReceiptDrafts([line(), line({ quantity: '5', inspectionResult: 'DEFECTIVE', defectReason: 'DAMAGED' })], context)).toEqual({ lineErrors: [[], []], formErrors: [], valid: true })
  })

  it('수령 라인이 없으면(미도착) 유효하다', () => {
    expect(validateReceiptDrafts([], context).valid).toBe(true)
  })

  it('Lot 번호와 수량은 필수이고 수량은 1 이상의 정수다', () => {
    expect(validateReceiptDrafts([line({ lotNumber: ' ' })], context).lineErrors[0]).toContain('Lot 번호를 입력하세요.')
    expect(validateReceiptDrafts([line({ lotNumber: 'L'.repeat(51) })], context).lineErrors[0]).toContain('Lot 번호는 50자 이하여야 합니다.')
    for (const quantity of ['', '0', '-1', '1.5']) expect(validateReceiptDrafts([line({ quantity })], context).lineErrors[0]).toContain('수량은 1 이상의 정수여야 합니다.')
  })

  it('수량 합이 예정 수량을 넘으면 거부한다', () => {
    const result = validateReceiptDrafts([line({ quantity: '30' }), line({ quantity: '21' })], context)
    expect(result.formErrors).toEqual(['수령 수량의 합(51)이 예정 수량(50)을 넘을 수 없습니다.'])
    expect(result.valid).toBe(false)
    expect(validateReceiptDrafts([line({ quantity: '30' }), line({ quantity: '20' })], context).valid).toBe(true)
  })

  it('유통기한은 상품에 따라 필수이거나 입력할 수 없다', () => {
    expect(validateReceiptDrafts([line({ expirationDate: '' })], context).lineErrors[0]).toContain('이 상품은 유통기한이 필수입니다.')
    expect(validateReceiptDrafts([line()], { ...context, requiresExpiration: false }).lineErrors[0]).toContain('이 상품은 유통기한을 입력할 수 없습니다.')
    expect(validateReceiptDrafts([line({ expirationDate: '' })], { ...context, requiresExpiration: false }).valid).toBe(true)
    expect(validateReceiptDrafts([line({ expirationDate: '' }), line({ quantity: '5', lotNumber: 'LOT-2' })], { ...context, requiresExpiration: null }).valid).toBe(true)
  })

  it('제조일은 오늘 이후일 수 없고 유통기한보다 늦을 수 없다', () => {
    expect(validateReceiptDrafts([line({ manufactureDate: '2026-10-20' })], context).lineErrors[0]).toContain('제조일은 오늘 이후일 수 없습니다.')
    expect(validateReceiptDrafts([line({ manufactureDate: '2026-10-19', expirationDate: '2026-10-19' })], context).valid).toBe(true)
    expect(validateReceiptDrafts([line({ manufactureDate: '2027-02-01' })], context).lineErrors[0]).toContain('제조일은 유통기한보다 늦을 수 없습니다.')
  })

  it('유통기한이 지난 라인은 정상으로 둘 수 없지만 오늘까지는 허용한다', () => {
    expect(validateReceiptDrafts([line({ expirationDate: '2026-10-18' })], context).lineErrors[0]).toContain('유통기한이 지난 라인은 불량으로만 입력할 수 있습니다.')
    expect(validateReceiptDrafts([line({ expirationDate: '2026-10-18', inspectionResult: 'DEFECTIVE', defectReason: 'EXPIRED' })], context).valid).toBe(true)
    expect(validateReceiptDrafts([line({ expirationDate: '2026-10-19' })], context).valid).toBe(true)
  })

  it('불량은 사유가 필수이고 정상은 사유를 가질 수 없다', () => {
    expect(validateReceiptDrafts([line({ inspectionResult: 'DEFECTIVE' })], context).lineErrors[0]).toContain('불량 사유를 선택하세요.')
    expect(validateReceiptDrafts([line({ defectReason: 'OTHER' })], context).lineErrors[0]).toContain('정상 라인에는 불량 사유를 입력할 수 없습니다.')
  })

  it('같은 Lot의 수령 라인은 유통기한이 같아야 한다', () => {
    const result = validateReceiptDrafts([line({ quantity: '5' }), line({ quantity: '5', expirationDate: '2027-02-01' })], context)
    expect(result.formErrors).toEqual(['같은 Lot(LOT-1)의 수령 라인은 유통기한이 같아야 합니다.'])
    expect(validateReceiptDrafts([line({ quantity: '5' }), line({ quantity: '5', lotNumber: 'LOT-2', expirationDate: '2027-02-01' })], context).valid).toBe(true)
  })
})

describe('toInspectRequest', () => {
  it('비어 있는 날짜와 정상 라인의 사유는 보내지 않고 Lot·수량을 정리한다', () => {
    expect(toInspectRequest([line({ lotNumber: ' LOT-1 ', quantity: '12' })])).toEqual({ receipts: [{ lotNumber: 'LOT-1', quantity: 12, inspectionResult: 'NORMAL', expirationDate: '2027-01-01' }] })
  })

  it('불량 라인은 사유와 제조일을 함께 보낸다', () => {
    expect(toInspectRequest([line({ inspectionResult: 'DEFECTIVE', defectReason: 'DAMAGED', manufactureDate: '2026-09-01' })]).receipts[0]).toMatchObject({ inspectionResult: 'DEFECTIVE', defectReason: 'DAMAGED', manufactureDate: '2026-09-01' })
  })

  it('수령 라인이 없으면 빈 목록을 보낸다', () => {
    expect(toInspectRequest([])).toEqual({ receipts: [] })
  })
})
