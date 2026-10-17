import { disposalReasonLabels } from '../model/disposalSchemas'
import type { DisposalItemView } from '../model/useDisposals'

export function DisposalItemsSummary({ items }: { items: DisposalItemView[] }) {
  return <div className="inbound-items">{items.map((item) => <article key={item.disposalItemId}><header><div><strong>{item.productName ?? `재고 #${item.locationStockId}`}</strong><small>재고 #{item.locationStockId}</small></div><b>{item.quantity} <small>ea</small></b></header><span className="quality-status quality-defective">{disposalReasonLabels[item.reason]}</span></article>)}</div>
}
