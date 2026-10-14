import { useState } from 'react'
import { formatDateTime } from '../../features/employee/model/formatDateTime'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import { historyTypeLabels, labelOf, lotStatusLabels, qualityStatusLabels, referenceTypeLabels, type StockItem } from '../../features/stock/model/stockSchemas'
import { useStockHistories } from '../../features/stock/model/useStocks'
import { Modal } from '../../shared/ui/Modal'

const HISTORY_PAGE_SIZE = 10

type Props = {
  /** 마지막으로 선택한 재고 행. 닫힌 뒤에도 사라지는 애니메이션 동안 내용을 유지하려고 `open`과 따로 받는다. */
  item: StockItem | null
  productLabel: string
  /** 창고 이름. 못 읽었으면 null이고 id만 보여준다. */
  warehouseLabel: string | null
  open: boolean
  onClose: () => void
}

function signed(value: number): string {
  return value > 0 ? `+${value}` : String(value)
}

function HistoryList({ inventoryId }: { inventoryId: number }) {
  const [page, setPage] = useState(1)
  const query = useStockHistories(inventoryId, page - 1, HISTORY_PAGE_SIZE)
  const histories = query.data?.items ?? []
  const totalPages = Math.max(1, query.data?.totalPages ?? 1)
  return <section className="stock-history" aria-label="수량 변동 이력">
    <h3>수량 변동 이력{query.data && <small>{query.data.totalElements}건</small>}</h3>
    {query.isLoading && <p className="employee-hint">이력을 불러오는 중입니다...</p>}
    {query.isError && <p className="inbound-error" role="alert">{toStockErrorMessage(query.error)}</p>}
    {query.data && histories.length === 0 && <p className="inbound-empty">변동 이력이 없습니다.</p>}
    {histories.length > 0 && <div className="audit-table-wrap">
      <table className="audit-table stock-history-table">
        <thead><tr><th>시각</th><th>유형</th><th>변동량</th><th>변경 후</th><th>원인 문서</th></tr></thead>
        <tbody>
          {histories.map((history) => <tr key={history.inventoryHistoryId}>
            <td>{formatDateTime(history.createdAt)}</td>
            <td><strong>{labelOf(historyTypeLabels, history.historyType)}</strong></td>
            <td className={history.quantityChange < 0 ? 'stock-minus' : 'stock-plus'}>{signed(history.quantityChange)}</td>
            <td>{history.quantityAfter}</td>
            <td>{labelOf(referenceTypeLabels, history.referenceType)} <small>#{history.referenceId}</small></td>
          </tr>)}
        </tbody>
      </table>
    </div>}
    {totalPages > 1 && <div className="inbound-pagination">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>이전</button>
      <span>{page} / {totalPages}</span>
      <button type="button" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>다음</button>
    </div>}
  </section>
}

/** 재고 행 하나의 전체 내용과 수량 변동 이력. */
export function StockDetailModal({ item, productLabel, warehouseLabel, open, onClose }: Props) {
  if (!item) return null
  return (
    <Modal open={open} title="재고 상세" className="stock-modal" onClose={onClose} closeOnBackdrop>
      <dl className="audit-rows">
        <div><dt>상품</dt><dd><strong>{productLabel}</strong> <small>상품 id {item.productId}</small></dd></div>
        <div><dt>창고</dt><dd>{warehouseLabel ? <><strong>{warehouseLabel}</strong> <small>id {item.warehouseId}</small></> : item.warehouseId}</dd></div>
        <div><dt>Lot</dt><dd>{item.lotNumber} <small>Lot id {item.lotId}</small></dd></div>
        <div><dt>제조일자</dt><dd>{item.manufactureDate ?? '-'}</dd></div>
        <div><dt>유통기한</dt><dd>{item.expirationDate ?? '없음'} <small>{labelOf(lotStatusLabels, item.lotStatus)}</small></dd></div>
        <div><dt>품질 상태</dt><dd>{labelOf(qualityStatusLabels, item.qualityStatus)}</dd></div>
        <div><dt>수량</dt><dd>총 {item.quantity} · 예약 {item.reservedQuantity} · 가용 {item.availableQuantity}</dd></div>
        <div><dt>할당 보류</dt><dd>{item.allocationHold ? <>보류 중{item.holdReason && <> — {item.holdReason}</>}{item.heldAt && <small> {formatDateTime(item.heldAt)}부터</small>}</> : '아님'}</dd></div>
        <div><dt>등록</dt><dd>{formatDateTime(item.createdAt)}</dd></div>
        <div><dt>마지막 변경</dt><dd>{formatDateTime(item.updatedAt)}</dd></div>
      </dl>
      <HistoryList key={item.inventoryId} inventoryId={item.inventoryId} />
    </Modal>
  )
}
