import { Link } from 'react-router-dom'
import { toOutboxErrorMessage } from '../../features/outbox/model/outboxErrors'
import { useOutboxEvents } from '../../features/outbox/model/useOutboxEvents'
import { toReconciliationErrorMessage } from '../../features/reconciliation/model/reconciliationErrors'
import { useReconciliationProposals } from '../../features/reconciliation/model/useReconciliations'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import type { StockFilters } from '../../features/stock/model/stockSchemas'
import { useStocks } from '../../features/stock/model/useStocks'

type CardViewProps = { title: string; description: string; to: string; emptyText: string; count: number | null; isLoading: boolean; errorMessage: string | null }

function CountCard({ title, description, to, emptyText, count, isLoading, errorMessage }: CardViewProps) {
  const hasWork = count !== null && count > 0
  return (
    <section className="panel task-card" aria-label={title}>
      <header className="task-card-header">
        <h2>{title}</h2>
        <span className={`task-count ${hasWork ? 'has-work' : ''}`} aria-label={count === null ? undefined : `${count}건`}>{count ?? '-'}</span>
      </header>
      <p className="task-description">{description}</p>
      {isLoading && <p className="task-status">불러오는 중입니다...</p>}
      {errorMessage && <p className="task-status" role="alert">{errorMessage}</p>}
      {count === 0 && <p className="task-empty">{emptyText}</p>}
      <Link to={to} className="text-link task-link">전체 보기 ›</Link>
    </section>
  )
}

type CardProps = { title: string; description: string; filters: StockFilters; to: string }

/** 조건에 맞는 재고 행 수만 센다(`size=1`로 요청하고 총 건수를 쓴다). */
function StockCountCard({ title, description, filters, to }: CardProps) {
  const query = useStocks({ ...filters, page: 0, size: 1 })
  return <CountCard title={title} description={description} to={to} emptyText="해당하는 재고가 없습니다." count={query.data?.totalElements ?? null} isLoading={query.isLoading} errorMessage={query.isError ? toStockErrorMessage(query.error) : null} />
}

/** 승인 대기 중인 대사 보정안 수를 센다. */
function PendingReconciliationCard() {
  const query = useReconciliationProposals({ status: 'PENDING', page: 0, size: 1 })
  return <CountCard title="대사 보정 대기" description="inventory와 WMS의 수량이 어긋나 승인을 기다리는 보정안입니다. 원인을 확인하고 승인하거나 거절하세요." to="/reconciliations?status=PENDING" emptyText="승인을 기다리는 보정안이 없습니다." count={query.data?.totalElements ?? null} isLoading={query.isLoading} errorMessage={query.isError ? toReconciliationErrorMessage(query.error) : null} />
}

/** 발행에 영구 실패해 격리된 Outbox 이벤트 수를 센다. */
function DeadOutboxCard() {
  const query = useOutboxEvents(0, 1)
  return <CountCard title="발행 실패 이벤트" description="이벤트 발행에 영구히 실패해 격리된 이벤트입니다. 원인을 확인하고 재발행하세요." to="/outbox-events" emptyText="격리된 이벤트가 없습니다." count={query.data?.totalElements ?? null} isLoading={query.isLoading} errorMessage={query.isError ? toOutboxErrorMessage(query.error) : null} />
}

/** 원자재·재고 관리 모드 홈. 승인 대기 보정안, 격리된 발행 실패 이벤트, 주의가 필요한 재고 행 수를 보여주고 해당 화면의 조건으로 연결한다. */
export function StockDashboard() {
  return <>
    <header className="page-header">
      <div>
        <p>INVENTORY MANAGEMENT</p>
        <h1>대시보드</h1>
        <div className="dashboard-header-meta"><span>처리가 필요한 보정안·발행 실패 이벤트와 주의가 필요한 재고를 확인하세요.</span></div>
      </div>
    </header>
    <section className="task-grid stock-task-grid" aria-label="처리가 필요한 항목">
      <PendingReconciliationCard />
      <DeadOutboxCard />
      <StockCountCard title="유통기한이 지난 재고" description="유통기한이 만료된 Lot의 재고 행입니다. 폐기 대상인지 확인하세요." filters={{ lotStatus: 'EXPIRED' }} to="/stock?lotStatus=EXPIRED&view=rows" />
      <StockCountCard title="유통기한 임박 재고" description="유통기한이 곧 만료되는 Lot의 재고 행입니다." filters={{ lotStatus: 'EXPIRING_SOON' }} to="/stock?lotStatus=EXPIRING_SOON&view=rows" />
      <StockCountCard title="할당 보류 재고" description="신규 예약에 할당되지 않도록 보류된 재고 행입니다. 보류 사유를 확인하세요." filters={{ allocationHold: true }} to="/stock?allocationHold=true&view=rows" />
      <StockCountCard title="불량 재고" description="품질 상태가 불량으로 분류된 재고 행입니다." filters={{ qualityStatus: 'DEFECTIVE' }} to="/stock?qualityStatus=DEFECTIVE&view=rows" />
    </section>
  </>
}
