import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useDisposalItems, useDisposals } from '../../features/disposal/model/useDisposals'
import { DisposalStatusBadge } from '../../features/disposal/ui/DisposalStatusBadge'
import { DisposalItemsSummary } from '../../features/disposal/ui/DisposalItemsSummary'
import type { Disposal } from '../../features/disposal/model/disposalSchemas'

const HISTORY_PAGE_SIZE = 20
const emptyDisposals: Disposal[] = []

// 폐기 관리 화면의 '완료' 탭은 최근 건만 미리보기로 보여주고, 전체 기록은 이 페이지에서 조회한다.
// 조회 전용 이력이라 피킹·검수 같은 액션 버튼은 없다.
export function DisposalHistoryPage() {
  const user = useCurrentUser()
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const historyQuery = useDisposals(user.scope.warehouseIds, ['COMPLETED'], page, HISTORY_PAGE_SIZE)
  const historyPage = historyQuery.data
  const disposals = historyPage?.items ?? emptyDisposals
  const selected = disposals.find((disposal) => disposal.disposalId === selectedId) ?? disposals[0]
  const itemsQuery = useDisposalItems(selected?.disposalId, user.scope.warehouseIds)
  const totalPages = Math.max(1, Math.ceil((historyPage?.total ?? 0) / (historyPage?.size ?? HISTORY_PAGE_SIZE)))
  if (historyQuery.isLoading) return <section className="panel"><p>폐기 이력을 불러오는 중입니다...</p></section>
  if (historyQuery.isError) return <section className="panel"><h1>폐기 이력을 불러오지 못했습니다</h1><p>{historyQuery.error.message}</p></section>
  return <>
    <header className="page-header inbound-page-header"><div><p>DISPOSAL OPERATIONS</p><h1>폐기 히스토리</h1></div><Link className="inbound-history-back" to="/disposals">작업 목록으로</Link></header>
    <section className="inbound-workspace">
      <aside className="panel inbound-list-panel"><div className="panel-heading"><div><p className="eyebrow">DISPOSAL HISTORY</p><h2>완료 이력</h2></div><small>{historyPage?.total ?? 0}건</small></div>
        <div className="inbound-list">{disposals.map((disposal) => <button type="button" key={disposal.disposalId} className={`inbound-list-item ${selected?.disposalId === disposal.disposalId ? 'selected' : ''}`} onClick={() => setSelectedId(disposal.disposalId)}><span><DisposalStatusBadge status={disposal.status} /></span><strong>폐기 #{disposal.disposalId}</strong></button>)}{disposals.length === 0 && <p className="inbound-empty">완료된 폐기 이력이 없습니다.</p>}</div>
        {totalPages > 1 && <div className="inbound-pagination"><button type="button" disabled={page === 1} onClick={() => { setPage((current) => current - 1); setSelectedId(null) }}>이전</button><span>{page} / {totalPages}</span><button type="button" disabled={page === totalPages} onClick={() => { setPage((current) => current + 1); setSelectedId(null) }}>다음</button></div>}
      </aside>
      {selected ? <section className="panel inbound-detail-panel"><div className="panel-heading inbound-detail-heading"><div><p className="eyebrow">DISPOSAL #{selected.disposalId}</p><h2>폐기 #{selected.disposalId}</h2><div className="inbound-detail-meta"><span><b>품목</b>{itemsQuery.data ? `${itemsQuery.data.length}개` : '-'}</span></div></div><DisposalStatusBadge status={selected.status} /></div>
        <section className="inbound-stage">{itemsQuery.data ? <DisposalItemsSummary items={itemsQuery.data} /> : <p>품목을 불러오는 중입니다...</p>}</section>
      </section> : <section className="panel inbound-detail-panel inbound-empty-detail"><div><p className="eyebrow">DISPOSAL HISTORY</p><h2>표시할 이력이 없습니다</h2></div></section>}
    </section>
  </>
}
