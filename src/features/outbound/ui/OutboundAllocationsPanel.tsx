import { useState } from 'react'
import type { OutboundAllocation } from '../model/outboundSchemas'
import { useOutboundAllocations, useReportPickingShortage, type OutboundItemView } from '../model/useOutbounds'

type Props = {
  outboundId: number
  items: OutboundItemView[]
  /** 부족 보고(재할당)를 할 수 있는 단계인지 — 예약이 있는 피킹 중 출고이고 쓰기 권한이 있을 때 */
  canReportShortage: boolean
  confirm: (pending: { title: string; description: string; confirmLabel: string; run: () => void }) => void
}

function remainingLabel(allocation: OutboundAllocation) {
  return allocation.pickedQuantity === null ? `${allocation.quantity} ea` : `${allocation.pickedQuantity} / ${allocation.quantity} ea`
}

/**
 * 피킹 계획: 예약이 할당한 Lot별 수량이다. 피킹 중에 어떤 Lot을 꺼낼 수 없으면 Lot(할당)별 부족 수량을 보고해
 * inventory가 다른 Lot으로 재할당하도록 한다.
 */
export function OutboundAllocationsPanel({ outboundId, items, canReportShortage, confirm }: Props) {
  const query = useOutboundAllocations(outboundId)
  const report = useReportPickingShortage()
  const [shortages, setShortages] = useState<Record<number, string>>({})
  const allocations = query.data
  if (query.isLoading) return <p>피킹 계획을 불러오는 중입니다...</p>
  if (query.isError) return <p className="inbound-error" role="alert">{query.error instanceof Error ? query.error.message : '피킹 계획을 불러오지 못했습니다.'}</p>
  if (!allocations || allocations.length === 0) return null

  const productName = (itemId: number) => items.find((item) => item.outboundItemId === itemId)?.productName ?? `품목 #${itemId}`
  const entries = allocations.flatMap((allocation) => {
    const quantity = Number(shortages[allocation.outboundAllocationId] ?? '')
    return quantity > 0 ? [{ allocation, quantity }] : []
  })
  const invalid = entries.some(({ allocation, quantity }) => !Number.isInteger(quantity) || quantity > allocation.quantity)

  function submit() {
    report.mutate(
      { outboundId, shortages: entries.map(({ allocation, quantity }) => ({ outboundAllocationId: allocation.outboundAllocationId, shortageQuantity: quantity })) },
      { onSuccess: () => setShortages({}) },
    )
  }

  return <section className="inbound-stage outbound-allocations">
    <h3>피킹 계획</h3>
    <p>예약이 할당한 Lot별 수량입니다.{canReportShortage && ' 꺼낼 수 없는 Lot이 있으면 부족 수량을 입력해 보고하세요. inventory가 다른 Lot으로 재할당합니다.'}</p>
    <div className="inbound-items">{allocations.map((allocation) => <article key={allocation.outboundAllocationId}>
      <header>
        <div><strong>{productName(allocation.outboundItemId)}</strong><small>Lot {allocation.lotNumber}{allocation.expirationDate ? ` · 유통기한 ${allocation.expirationDate}` : ''}</small></div>
        <b>{remainingLabel(allocation)}</b>
      </header>
      {canReportShortage && <label className="outbound-shortage-input">부족 수량<input type="number" min="0" max={allocation.quantity} value={shortages[allocation.outboundAllocationId] ?? ''} disabled={report.isPending} onChange={(event) => setShortages((current) => ({ ...current, [allocation.outboundAllocationId]: event.target.value }))} /></label>}
    </article>)}</div>
    {canReportShortage && <button type="button" className="inbound-action-button" disabled={entries.length === 0 || invalid || report.isPending}
      onClick={() => confirm({ title: '부족 수량을 보고할까요?', description: '보고한 수량은 inventory가 다른 Lot으로 재할당합니다. 대체할 재고가 없으면 거부될 수 있습니다.', confirmLabel: '부족 보고', run: submit })}>부족 보고 · 재할당</button>}
    {invalid && <p className="inbound-error" role="alert">부족 수량은 할당 수량 이하의 정수여야 합니다.</p>}
    {report.isError && <p className="inbound-error" role="alert">{report.error.message}</p>}
  </section>
}
