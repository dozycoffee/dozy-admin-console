import { useState } from 'react'
import { useProducts } from '../../product/model/useProducts'
import { useRegisterInbound } from '../model/useInbounds'

type Line = { productId: string; quantity: string }
const emptyLine: Line = { productId: '', quantity: '' }

// 등록 요청은 Zone 용량 사전 점검을 서버가 수행한다 — 부족하면 반려 메시지를 그대로 보여준다.
export function RegisterInboundForm({ warehouseId, writable, onRegistered }: { warehouseId: number; writable: boolean; onRegistered: (inboundId: number) => void }) {
  const products = useProducts()
  const register = useRegisterInbound()
  const [arrivalDate, setArrivalDate] = useState('')
  const [lines, setLines] = useState<Line[]>([emptyLine])
  const valid = arrivalDate !== '' && lines.every((line) => line.productId !== '' && Number(line.quantity) > 0)
  function changeLine(index: number, patch: Partial<Line>) { setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line))) }
  function submit() {
    register.mutate(
      { warehouseId, expectedArrivalDate: arrivalDate, items: lines.map((line) => ({ productId: Number(line.productId), expectedQuantity: Number(line.quantity) })) },
      { onSuccess: (created) => { setArrivalDate(''); setLines([emptyLine]); onRegistered((created as { inboundId: number }).inboundId) } },
    )
  }
  return <section className="panel inbound-register">
    <div className="panel-heading"><div><p className="eyebrow">NEW INBOUND</p><h2>입고 등록</h2></div></div>
    <label className="inbound-edit-arrival">도착 예정일<input type="date" value={arrivalDate} disabled={!writable || register.isPending} onChange={(event) => setArrivalDate(event.target.value)} /></label>
    {lines.map((line, index) => <div className="inbound-form-row" key={index}>
      <label>상품<select value={line.productId} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { productId: event.target.value })}><option value="">선택</option>{products.data?.map((product) => <option key={product.productId} value={product.productId}>{product.productName} ({product.productCode})</option>)}</select></label>
      <label>수량<input type="number" min="1" value={line.quantity} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { quantity: event.target.value })} /></label>
      <button type="button" disabled={lines.length === 1 || register.isPending} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>삭제</button>
    </div>)}
    <div className="inbound-form-actions"><button type="button" disabled={!writable || register.isPending} onClick={() => setLines((current) => [...current, emptyLine])}>품목 추가</button><button type="button" className="inbound-action-button" disabled={!writable || !valid || register.isPending} onClick={submit}>입고 등록</button></div>
    {products.data?.length === 0 && <p className="inbound-empty">등록된 상품이 없습니다. 상품을 먼저 등록해야 입고를 등록할 수 있습니다.</p>}
    {register.isError && <p className="inbound-error" role="alert">{register.error.message}</p>}
  </section>
}
