import { inspectionResultLabels } from '../model/inboundSchemas'
import type { InboundItemView } from '../model/useInbounds'
import { zoneCodeLabels } from '../../inventory/model/inventorySchemas'

// 작업 큐 상세와 완료 이력 상세가 함께 쓰는 품목 목록이다.
export function InboundItemsSummary({ items }: { items: InboundItemView[] }) {
  return <div className="inbound-items">{items.map((item) => <article key={item.inboundItemId}><header><div><strong>{item.productName}</strong><small>{item.productCode} · {item.zoneCode ? `${item.zoneCode} Zone · ${zoneCodeLabels[item.zoneCode]}` : `Zone #${item.zoneId}`}</small></div><b>{item.actualQuantity ?? item.expectedQuantity} <small>/ {item.expectedQuantity} ea</small></b></header>{item.inspectionResult !== 'PENDING' && <span className={`quality-status quality-${item.inspectionResult.toLowerCase()}`}>{inspectionResultLabels[item.inspectionResult]}</span>}{item.quantityDiscrepancy ? <small>예정 대비 {item.quantityDiscrepancy > 0 ? '+' : ''}{item.quantityDiscrepancy} ea</small> : null}</article>)}</div>
}
