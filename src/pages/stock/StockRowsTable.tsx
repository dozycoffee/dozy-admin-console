import { labelOf, lotStatusLabels, qualityStatusLabels, type StockItem } from '../../features/stock/model/stockSchemas'

type Props = {
  items: readonly StockItem[]
  /** 창고 이름. 못 읽었으면 null이고 id만 보여준다. */
  warehouseName: (warehouseId: number) => string | null
  onOpen: (item: StockItem) => void
  /** 상품 열을 보여줄지. 상품별 보기에서 한 상품의 행만 펼쳐 보일 때는 상품이 이미 정해져 있어 숨긴다. */
  showProduct?: boolean
}

/** 재고 행(창고 × Lot × 품질 상태) 표. 재고 현황의 행 보기와 상품별 보기의 펼친 행이 함께 쓴다. */
export function StockRowsTable({ items, warehouseName, onOpen, showProduct = true }: Props) {
  return <div className="audit-table-wrap">
    <table className={`audit-table stock-table${showProduct ? '' : ' stock-table-nested'}`}>
      <thead><tr>{showProduct && <th>상품</th>}<th>창고</th><th>Lot</th><th>상태</th><th className="stock-num">총</th><th className="stock-num">예약</th><th className="stock-num">가용</th><th>상세</th></tr></thead>
      <tbody>
        {items.map((item) => {
          const warehouse = warehouseName(item.warehouseId)
          return <tr key={item.inventoryId}>
            {showProduct && <td><strong>{item.productName}</strong><small>{item.productCode}</small></td>}
            <td>{warehouse ?? item.warehouseId}{warehouse && <small>id {item.warehouseId}</small>}</td>
            <td>{item.lotNumber}<small>{item.expirationDate ? `유통기한 ${item.expirationDate}` : '유통기한 없음'}</small></td>
            <td><div className="stock-badges">
              <span className={`stock-badge stock-quality-${item.qualityStatus.toLowerCase()}`}>{labelOf(qualityStatusLabels, item.qualityStatus)}</span>
              {item.lotStatus !== 'NORMAL' && <span className={`stock-badge stock-lot-${item.lotStatus.toLowerCase()}`}>{labelOf(lotStatusLabels, item.lotStatus)}</span>}
              {item.allocationHold && <span className="stock-badge stock-hold" title={item.holdReason ?? undefined}>할당 보류</span>}
            </div></td>
            <td className="stock-num">{item.quantity}</td>
            <td className="stock-num">{item.reservedQuantity}</td>
            <td className="stock-num"><b>{item.availableQuantity}</b></td>
            <td><button type="button" className="audit-view" aria-label={`${item.productName} ${item.lotNumber} 상세 보기`} onClick={() => onOpen(item)}>보기</button></td>
          </tr>
        })}
      </tbody>
    </table>
  </div>
}
