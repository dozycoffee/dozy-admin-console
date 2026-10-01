import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useInboundItems, useInbounds } from '../../features/inbound/model/useInbounds'
import { InboundStatusBadge } from '../../features/inbound/ui/InboundStatusBadge'
import { InboundItemsSummary } from '../../features/inbound/ui/InboundItemsSummary'
import type { Inbound } from '../../features/inbound/model/inboundSchemas'

const HISTORY_PAGE_SIZE = 20
const emptyInbounds: Inbound[] = []

// 입고 관리 화면의 '완료' 탭은 최근 건만 미리보기로 보여주고, 전체 기록은 이 페이지에서 조회한다.
// 작업 큐가 아니라 조회 전용 이력이라 검수·완료 같은 액션 버튼은 없다.
export function InboundHistoryPage() {
  const user = useCurrentUser()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const historyQuery = useInbounds(user.scope.warehouseIds, ['COMPLETED'], page, HISTORY_PAGE_SIZE)
  const historyPage = historyQuery.data
  const inbounds = historyPage?.items ?? emptyInbounds
  const selected = inbounds.find((inbound) => inbound.inboundId === selectedId) ?? inbounds[0]
  const itemsQuery = useInboundItems(selected?.inboundId, user.scope.warehouseIds)
  const totalPages = Math.max(1, Math.ceil((historyPage?.total ?? 0) / (historyPage?.size ?? HISTORY_PAGE_SIZE)))
  if (historyQuery.isLoading) return <section className="panel"><p>입고 이력을 불러오는 중입니다...</p></section>
  if (historyQuery.isError) return <section className="panel"><h1>입고 이력을 불러오지 못했습니다</h1><p>{historyQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>INBOUND OPERATIONS</p><h1>입고 히스토리</h1></div><Link className="inbound-history-back" to="/inbounds">작업 목록으로</Link></header>
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel"><div className="panel-heading"><div><p className="eyebrow">INBOUND HISTORY</p><h2>완료 이력</h2></div><small>{historyPage?.total ?? 0}건</small></div>
        <div className="inbound-list">{inbounds.map((inbound) => <button type="button" key={inbound.inboundId} className={`inbound-list-item ${selected?.inboundId === inbound.inboundId ? 'selected' : ''}`} onClick={() => setSelectedId(inbound.inboundId)}><span><InboundStatusBadge status={inbound.status} /><time>{inbound.expectedArrivalDate}</time></span><strong>입고 #{inbound.inboundId}</strong></button>)}{inbounds.length === 0 && <p className="inbound-empty">완료된 입고 이력이 없습니다.</p>}</div>
        {totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage((current) => current - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage((current) => current + 1); setSelectedId(null) }}>다음</button></div>}
      </aside>
      {selected ? <section className="panel inbound-detail-panel"><div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">INBOUND #{selected.inboundId}</p><h2>입고 #{selected.inboundId}</h2><div className="inbound-detail-meta"><span><b>도착 예정일</b>{selected.expectedArrivalDate}</span><span><b>품목</b>{itemsQuery.data ? `${itemsQuery.data.length}개` : '-'}</span></div></div><InboundStatusBadge status={selected.status} /></div>
        <section className="inbound-stage">{itemsQuery.data ? <InboundItemsSummary items={itemsQuery.data} /> : <p>품목을 불러오는 중입니다...</p>}</section>
      </section> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">INBOUND HISTORY</p><h2>표시할 이력이 없습니다</h2></div></section>}
    </section>
  </>
}
