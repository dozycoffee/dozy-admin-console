import { defectReasonLabels, inspectionResultLabels } from '../model/inboundSchemas'
import type { InboundItemView } from '../model/useInbounds'
import { zoneCodeLabels } from '../../inventory/model/inventorySchemas'

// 작업 큐 상세와 완료 이력 상세가 함께 쓰는 품목 목록이다. 검수가 끝난 품목은 수령 라인(Lot·수량·판정)을 함께 보여준다.
export function InboundItemsSummary({ items }: { items: InboundItemView[] }) {
  return <div className="inbound-items">{items.map((item) => <article key={item.inboundItemId}>
    <header>
      <div><strong>{item.productName}</strong><small>{item.productCode} · {item.zoneCode ? `${item.zoneCode} Zone · ${zoneCodeLabels[item.zoneCode]}` : `Zone #${item.zoneId}`}</small>{item.expectedLotNumber && <small>예정 Lot {item.expectedLotNumber}{item.expectedExpirationDate ? ` · 유통기한 ${item.expectedExpirationDate}` : ''}</small>}</div>
      <b>{item.actualQuantity ?? item.expectedQuantity} <small>/ {item.expectedQuantity} ea</small></b>
    </header>
    {item.inspectionStatus === 'INSPECTED' && item.receipts.length === 0 && <span className="quality-status quality-defective">미도착 (수령 0)</span>}
    {item.receipts.length > 0 && <ul className="receipt-list">{item.receipts.map((receipt) => <li key={receipt.inboundReceiptId}>
      <span className="receipt-lot">Lot {receipt.lotNumber}{receipt.expirationDate ? <small> 유통기한 {receipt.expirationDate}</small> : null}</span>
      <b>{receipt.quantity} ea</b>
      <span className={`quality-status quality-${receipt.inspectionResult.toLowerCase()}`}>{inspectionResultLabels[receipt.inspectionResult]}{receipt.defectReason ? ` · ${defectReasonLabels[receipt.defectReason]}` : ''}</span>
    </li>)}</ul>}
    {item.quantityDiscrepancy !== null && item.quantityDiscrepancy !== 0 && <span className="quality-status quality-disposal_scheduled">예정 대비 {item.quantityDiscrepancy > 0 ? '+' : ''}{item.quantityDiscrepancy} ea</span>}
  </article>)}</div>
}
