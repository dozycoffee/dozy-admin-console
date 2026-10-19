import { useState } from 'react'
import { useProducts } from '../../product/model/useProducts'
import { useDisposableLocationStocks } from '../../inventory/model/useLocationStocks'
import { qualityStatusLabels } from '../../inventory/model/inventorySchemas'
import { disposalReasonLabels, manualDisposalReasons, type DisposalReason } from '../model/disposalSchemas'
import { useRegisterDisposal } from '../model/useDisposals'
import { toDisplayMessage } from '../../../shared/api/displayMessage'

type Line = { locationStockId: string; reason: DisposalReason }
const emptyLine: Line = { locationStockId: '', reason: 'OTHER' }

// 불량·폐기 예정 재고만 대상이다. 폐기 수량은 서버 규칙상 재고 수량 전체여야 하므로 입력받지 않는다.
// 입고 검수·반품 불량은 해당 업무 완료 시 폐기 요청이 자동으로 만들어지므로 여기서는 직접 등록하지 않는다.
export function RegisterDisposalForm({ warehouseId, warehouseIds, writable, onRegistered }: { warehouseId: number; warehouseIds: number[]; writable: boolean; onRegistered: (disposalId: number) => void }) {
  const stocks = useDisposableLocationStocks(warehouseIds)
  const products = useProducts()
  const register = useRegisterDisposal()
  const [lines, setLines] = useState<Line[]>([emptyLine])
  const usedIds = lines.map((line) => line.locationStockId)
  const valid = lines.every((line) => line.locationStockId !== '')
  function changeLine(index: number, patch: Partial<Line>) { setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line))) }
  function submit() {
    const items = lines.map((line) => ({ locationStockId: Number(line.locationStockId), quantity: stocks.data?.find((stock) => stock.locationStockId === Number(line.locationStockId))?.quantity ?? 0, reason: line.reason }))
    register.mutate({ warehouseId, items }, { onSuccess: (created) => { setLines([emptyLine]); onRegistered((created as { disposalId: number }).disposalId) } })
  }
  return <section className="panel inbound-register">
    <div className="panel-heading"><div><p className="eyebrow">NEW DISPOSAL</p><h2>폐기 요청 등록</h2></div></div>
    {lines.map((line, index) => <div className="inbound-form-row" key={index}>
      <label>대상 재고<select value={line.locationStockId} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { locationStockId: event.target.value })}><option value="">선택</option>{stocks.data?.filter((stock) => !usedIds.includes(String(stock.locationStockId)) || String(stock.locationStockId) === line.locationStockId).map((stock) => <option key={stock.locationStockId} value={stock.locationStockId}>{products.data?.find((product) => product.productId === stock.productId)?.productName ?? `상품 #${stock.productId}`} · {stock.locationCode} · {stock.lotNumber} · {stock.quantity} ea · {qualityStatusLabels[stock.qualityStatus]}</option>)}</select></label>
      <label>사유<select value={line.reason} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { reason: event.target.value as DisposalReason })}>{manualDisposalReasons.map((reason) => <option key={reason} value={reason}>{disposalReasonLabels[reason]}</option>)}</select></label>
      <button type="button" disabled={lines.length === 1 || register.isPending} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>삭제</button>
    </div>)}
    {stocks.data?.length === 0 && <p className="inbound-empty">폐기할 수 있는 불량·폐기 예정 재고가 없습니다.</p>}
    <div className="inbound-form-actions"><button type="button" disabled={!writable || register.isPending} onClick={() => setLines((current) => [...current, emptyLine])}>품목 추가</button><button type="button" className="inbound-action-button" disabled={!writable || !valid || register.isPending} onClick={submit}>폐기 요청</button></div>
    {register.isError && <p className="inbound-error" role="alert">{toDisplayMessage(register.error)}</p>}
  </section>
}
