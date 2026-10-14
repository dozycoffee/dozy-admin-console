import { Link } from 'react-router-dom'
import { toStockErrorMessage } from '../../features/stock/model/stockErrors'
import type { StockFilters } from '../../features/stock/model/stockSchemas'
import { useStocks } from '../../features/stock/model/useStocks'

type CardProps = { title: string; description: string; filters: StockFilters; to: string }

/** 조건에 맞는 재고 행 수만 센다(`size=1`로 요청하고 총 건수를 쓴다). */
function StockCountCard({ title, description, filters, to }: CardProps) {
  const query = useStocks({ ...filters, page: 0, size: 1 })
  const count = query.data?.totalElements ?? null
  const hasWork = count !== null && count > 0
  return (
    <section className="panel task-card" aria-label={title}>
      <header className="task-card-header">
        <h2>{title}</h2>
        <span className={`task-count ${hasWork ? 'has-work' : ''}`} aria-label={count === null ? undefined : `${count}건`}>{count ?? '-'}</span>
      </header>
      <p className="task-description">{description}</p>
      {query.isLoading && <p className="task-status">불러오는 중입니다...</p>}
      {query.isError && <p className="task-status" role="alert">{toStockErrorMessage(query.error)}</p>}
      {count === 0 && <p className="task-empty">해당하는 재고가 없습니다.</p>}
      <Link to={to} className="text-link task-link">전체 보기 ›</Link>
    </section>
  )
}

/** 재고 관리 모드 홈. 주의가 필요한 재고 행 수를 보여주고 재고 현황의 해당 조건으로 연결한다. */
export function StockDashboard() {
  return <>
    <header className="page-header">
      <div>
        <p>INVENTORY MANAGEMENT</p>
        <h1>대시보드</h1>
        <div className="dashboard-header-meta"><span>주의가 필요한 재고를 확인하세요.</span></div>
      </div>
    </header>
    <section className="task-grid stock-task-grid" aria-label="주의가 필요한 재고">
      <StockCountCard title="유통기한이 지난 재고" description="유통기한이 만료된 Lot의 재고 행입니다. 폐기 대상인지 확인하세요." filters={{ lotStatus: 'EXPIRED' }} to="/stock?lotStatus=EXPIRED" />
      <StockCountCard title="유통기한 임박 재고" description="유통기한이 곧 만료되는 Lot의 재고 행입니다." filters={{ lotStatus: 'EXPIRING_SOON' }} to="/stock?lotStatus=EXPIRING_SOON" />
      <StockCountCard title="할당 보류 재고" description="신규 예약에 할당되지 않도록 보류된 재고 행입니다. 보류 사유를 확인하세요." filters={{ allocationHold: true }} to="/stock?allocationHold=true" />
      <StockCountCard title="불량 재고" description="품질 상태가 불량으로 분류된 재고 행입니다." filters={{ qualityStatus: 'DEFECTIVE' }} to="/stock?qualityStatus=DEFECTIVE" />
    </section>
  </>
}
