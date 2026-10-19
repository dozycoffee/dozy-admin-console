import { useState } from 'react'
import { defectReasonLabels, defectReasonSchema, inspectionResultLabels, type InspectInboundItemRequest } from '../model/inboundSchemas'
import { emptyReceiptDraft, toInspectRequest, todayIso, validateReceiptDrafts, type ReceiptDraft } from '../model/receiptRules'
import type { InboundItemView } from '../model/useInbounds'

type Props = {
  item: InboundItemView
  writable: boolean
  pending: boolean
  onSubmit: (body: InspectInboundItemRequest) => void
}

/**
 * 한 품목의 검수 입력. 수령 라인(Lot·제조일·유통기한·수량·판정·불량 사유)을 한 줄씩 추가해 한 번에 저장한다.
 * 검수는 품목당 한 번만 저장할 수 있고, 아무것도 도착하지 않았으면 수령 라인 없이 미도착으로 저장한다.
 */
export function InboundReceiptsForm({ item, writable, pending, onSubmit }: Props) {
  const [lines, setLines] = useState<ReceiptDraft[]>(() => [{ ...emptyReceiptDraft(String(item.expectedQuantity)), lotNumber: item.expectedLotNumber ?? '', expirationDate: item.expectedExpirationDate ?? '' }])
  const validation = validateReceiptDrafts(lines, { expectedQuantity: item.expectedQuantity, requiresExpiration: item.shelfLifeDays === undefined ? null : item.shelfLifeDays !== null, today: todayIso() })
  const total = lines.reduce((sum, line) => sum + (Number.isInteger(Number(line.quantity)) ? Number(line.quantity) : 0), 0)
  const disabled = !writable || pending
  const change = (index: number, patch: Partial<ReceiptDraft>) => setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  return <div className="receipt-form">
    <div className="receipt-form-head"><strong>{item.productName}</strong><small>{item.productCode} · 예정 {item.expectedQuantity} ea{item.shelfLifeDays != null ? ` · 유통기한 ${item.shelfLifeDays}일 상품` : item.shelfLifeDays === null ? ' · 유통기한 없는 상품' : ''}</small>
      {item.expectedLotNumber && <small>예정 Lot {item.expectedLotNumber}{item.expectedExpirationDate ? ` · 유통기한 ${item.expectedExpirationDate}` : ''}</small>}</div>
    {lines.map((line, index) => <div className="receipt-line" key={index}>
      <label>Lot 번호<input value={line.lotNumber} disabled={disabled} onChange={(event) => change(index, { lotNumber: event.target.value })} /></label>
      <label>제조일<input type="date" value={line.manufactureDate} disabled={disabled} onChange={(event) => change(index, { manufactureDate: event.target.value })} /></label>
      <label>유통기한<input type="date" value={line.expirationDate} disabled={disabled} onChange={(event) => change(index, { expirationDate: event.target.value })} /></label>
      <label>수량<input type="number" min="1" value={line.quantity} disabled={disabled} onChange={(event) => change(index, { quantity: event.target.value })} /></label>
      <label>판정<select value={line.inspectionResult} disabled={disabled} onChange={(event) => change(index, { inspectionResult: event.target.value as ReceiptDraft['inspectionResult'], defectReason: event.target.value === 'NORMAL' ? '' : line.defectReason })}>{(['NORMAL', 'DEFECTIVE'] as const).map((result) => <option key={result} value={result}>{inspectionResultLabels[result]}</option>)}</select></label>
      <label>불량 사유<select value={line.defectReason} disabled={disabled || line.inspectionResult === 'NORMAL'} onChange={(event) => change(index, { defectReason: event.target.value as ReceiptDraft['defectReason'] })}><option value="">선택</option>{defectReasonSchema.options.map((reason) => <option key={reason} value={reason}>{defectReasonLabels[reason]}</option>)}</select></label>
      <button type="button" className="receipt-remove" disabled={disabled} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>삭제</button>
      {validation.lineErrors[index].length > 0 && <ul className="receipt-errors" role="alert">{validation.lineErrors[index].map((error) => <li key={error}>{error}</li>)}</ul>}
    </div>)}
    {validation.formErrors.length > 0 && <ul className="receipt-errors" role="alert">{validation.formErrors.map((error) => <li key={error}>{error}</li>)}</ul>}
    <div className="receipt-form-actions">
      <span className="receipt-total">수령 {total} / 예정 {item.expectedQuantity} ea{lines.length > 0 && total < item.expectedQuantity ? ` · 부족 ${item.expectedQuantity - total} ea` : ''}</span>
      <button type="button" disabled={disabled} onClick={() => setLines((current) => [...current, emptyReceiptDraft()])}>수령 라인 추가</button>
      <button type="button" disabled={disabled || lines.length > 0} title={lines.length > 0 ? '수령 라인을 모두 삭제하면 미도착으로 저장할 수 있습니다.' : undefined} onClick={() => onSubmit(toInspectRequest([]))}>미도착으로 저장</button>
      <button type="button" className="inbound-action-button" disabled={disabled || lines.length === 0 || !validation.valid} onClick={() => onSubmit(toInspectRequest(lines))}>검수 저장</button>
    </div>
  </div>
}
