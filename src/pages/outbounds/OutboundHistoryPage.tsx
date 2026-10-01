import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useOutboundItems, useOutbounds } from '../../features/outbound/model/useOutbounds'
import { OutboundStatusBadge } from '../../features/outbound/ui/OutboundStatusBadge'
import { OutboundItemsSummary } from '../../features/outbound/ui/OutboundItemsSummary'
import type { Outbound } from '../../features/outbound/model/outboundSchemas'

const HISTORY_PAGE_SIZE = 20
const emptyOutbounds: Outbound[] = []

// 출고 관리 화면의 '완료' 탭은 최근 건만 미리보기로 보여주고, 전체 기록은 이 페이지에서 조회한다.
// 조회 전용 이력이라 피킹·검수 같은 액션 버튼은 없다.
export function OutboundHistoryPage() {
  const user = useCurrentUser()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const historyQuery = useOutbounds(user.scope.warehouseIds, ['COMPLETED'], page, HISTORY_PAGE_SIZE)
  const historyPage = historyQuery.data
  const outbounds = historyPage?.items ?? emptyOutbounds
  const selected = outbounds.find((outbound) => outbound.outboundId === selectedId) ?? outbounds[0]
  const itemsQuery = useOutboundItems(selected?.outboundId)
  const totalPages = Math.max(1, Math.ceil((historyPage?.total ?? 0) / (historyPage?.size ?? HISTORY_PAGE_SIZE)))
  if (historyQuery.isLoading) return <section className="panel"><p>출고 이력을 불러오는 중입니다...</p></section>
  if (historyQuery.isError) return <section className="panel"><h1>출고 이력을 불러오지 못했습니다</h1><p>{historyQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>OUTBOUND OPERATIONS</p><h1>출고 히스토리</h1></div><Link className="inbound-history-back" to="/outbounds">작업 목록으로</Link></header>
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel"><div className="panel-heading"><div><p className="eyebrow">OUTBOUND HISTORY</p><h2>완료 이력</h2></div><small>{historyPage?.total ?? 0}건</small></div>
        <div className="inbound-list">{outbounds.map((outbound) => <button type="button" key={outbound.outboundId} className={`inbound-list-item ${selected?.outboundId === outbound.outboundId ? 'selected' : ''}`} onClick={() => setSelectedId(outbound.outboundId)}><span><OutboundStatusBadge status={outbound.status} /></span><strong>출고 #{outbound.outboundId}</strong></button>)}{outbounds.length === 0 && <p className="inbound-empty">완료된 출고 이력이 없습니다.</p>}</div>
        {totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage((current) => current - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage((current) => current + 1); setSelectedId(null) }}>다음</button></div>}
      </aside>
      {selected ? <section className="panel inbound-detail-panel"><div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">OUTBOUND #{selected.outboundId}</p><h2>출고 #{selected.outboundId}</h2><div className="inbound-detail-meta"><span><b>품목</b>{itemsQuery.data ? `${itemsQuery.data.length}개` : '-'}</span></div></div><OutboundStatusBadge status={selected.status} /></div>
        <section className="inbound-stage">{itemsQuery.data ? <OutboundItemsSummary items={itemsQuery.data} /> : <p>품목을 불러오는 중입니다...</p>}</section>
      </section> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">OUTBOUND HISTORY</p><h2>표시할 이력이 없습니다</h2></div></section>}
    </section>
  </>
}
