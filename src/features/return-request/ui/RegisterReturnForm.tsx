import { useState } from 'react'
import { useProducts } from '../../product/model/useProducts'
import { useRegisterReturn } from '../model/useReturns'

type Line = { productId: string; quantity: string }
const emptyLine: Line = { productId: '', quantity: '' }

export function RegisterReturnForm({ warehouseId, writable, onRegistered }: { warehouseId: number; writable: boolean; onRegistered: (returnRequestId: number) => void }) {
  const products = useProducts()
  const register = useRegisterReturn()
  const [lines, setLines] = useState<Line[]>([emptyLine])
  const valid = lines.every((line) => line.productId !== '' && Number(line.quantity) > 0)
  function changeLine(index: number, patch: Partial<Line>) { setLines((current) => current.map((line, i) => (i === index ? { ...line, ...patch } : line))) }
  function submit() {
    register.mutate(
      { warehouseId, items: lines.map((line) => ({ productId: Number(line.productId), expectedQuantity: Number(line.quantity) })) },
      { onSuccess: (created) => { setLines([emptyLine]); onRegistered((created as { returnRequestId: number }).returnRequestId) } },
    )
  }
  return <section className="panel inbound-register">
    <div className="panel-heading"><div><p className="eyebrow">NEW RETURN</p><h2>반품 접수 등록</h2></div></div>
    {lines.map((line, index) => <div className="inbound-form-row" key={index}>
      <label>상품<select value={line.productId} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { productId: event.target.value })}><option value="">선택</option>{products.data?.map((product) => <option key={product.productId} value={product.productId}>{product.productName} ({product.productCode})</option>)}</select></label>
      <label>반품 수량<input type="number" min="1" value={line.quantity} disabled={!writable || register.isPending} onChange={(event) => changeLine(index, { quantity: event.target.value })} /></label>
      <button type="button" disabled={lines.length === 1 || register.isPending} onClick={() => setLines((current) => current.filter((_, i) => i !== index))}>삭제</button>
    </div>)}
    <div className="inbound-form-actions"><button type="button" disabled={!writable || register.isPending} onClick={() => setLines((current) => [...current, emptyLine])}>품목 추가</button><button type="button" className="inbound-action-button" disabled={!writable || !valid || register.isPending} onClick={submit}>반품 접수</button></div>
    {register.isError && <p className="inbound-error" role="alert">{register.error.message}</p>}
  </section>
}
