import { returnInspectionResultLabels } from '../model/returnSchemas'
import type { ReturnItemView } from '../model/useReturns'

export function ReturnItemsSummary({ items }: { items: ReturnItemView[] }) {
  return <div className="inbound-items">{items.map((item) => <article key={item.returnItemId}><header><div><strong>{item.productName}</strong><small>{item.productCode}</small></div><b>{item.actualQuantity ?? item.expectedQuantity} <small>/ {item.expectedQuantity} ea</small></b></header>{item.inspectionResult !== 'PENDING' && <span className={`quality-status quality-${item.inspectionResult.toLowerCase()}`}>{returnInspectionResultLabels[item.inspectionResult]}</span>}{item.quantityDiscrepancy ? <small>예정 대비 {item.quantityDiscrepancy > 0 ? '+' : ''}{item.quantityDiscrepancy} ea</small> : null}</article>)}</div>
}
