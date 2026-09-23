import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'

function averageUsageRate(usageRates: number[]) {
  if (usageRates.length === 0) return null
  return usageRates.reduce((sum, rate) => sum + rate, 0) / usageRates.length
}

export function DashboardPage() {
  const user = useCurrentUser()
  const warehouseIds = user.scope.warehouseIds
  const warehousesQuery = useWarehouses(warehouseIds)
  const zoneSummaryQuery = useZoneInventorySummary(warehouseIds)

  const availableWarehouseCount = warehousesQuery.data.filter((warehouse) => warehouse.warehouseStatus === 'AVAILABLE').length
  const usageRate = averageUsageRate((zoneSummaryQuery.data ?? []).map((zone) => zone.usageRate))

  return (
    <>
      <header className="page-header">
        <div>
          <p>{new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
          <h1>운영 대시보드</h1>
          <span>권한 범위 내 운영 현황을 확인하세요.</span>
        </div>
      </header>
      <section className="stat-grid">
        <article>
          <span>정상 가동 창고</span>
          <strong>
            {warehousesQuery.isLoading ? '-' : `${availableWarehouseCount} / ${warehouseIds.length}`}
          </strong>
          <small>{warehousesQuery.isError ? '조회 실패' : '접근 가능한 창고 기준'}</small>
        </article>
        <article>
          <span>평균 창고 가동률</span>
          <strong>{usageRate === null ? '-' : `${Math.round(usageRate * 100)}%`}</strong>
          <small>{zoneSummaryQuery.isError ? '조회 실패' : 'Zone 사용률 평균'}</small>
        </article>
      </section>
      <section className="panel">
        <h2>프로젝트 기본 구조</h2>
        <p>창고 재고 도메인을 권한 기반으로 관리하는 콘솔입니다.</p>
      </section>
    </>
  )
}
