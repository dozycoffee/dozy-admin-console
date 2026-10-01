import type { OutboundItemView } from '../model/useOutbounds'

// 피킹 전에는 요청 수량만, 피킹 후에는 피킹 수량과 부족 수량을 함께 보여준다.
export function OutboundItemsSummary({ items }: { items: OutboundItemView[] }) {
  return <div className="inbound-items">{items.map((item) => <article key={item.outboundItemId}><header><div><strong>{item.productName}</strong><small>{item.productCode}</small></div><b>{item.pickedQuantity ?? '-'} <small>/ {item.requestedQuantity} ea</small></b></header>{item.shortageQuantity ? <span className="quality-status quality-defective">재고 부족 {item.shortageQuantity} ea</span> : item.pickedQuantity !== null ? <span className="quality-status quality-normal">전량 피킹</span> : null}</article>)}</div>
}
