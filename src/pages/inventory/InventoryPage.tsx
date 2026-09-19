import { useAuth } from '../../features/auth/model/useAuth'
import { qualityStatusLabels, zoneCodeLabels, type ZoneInventorySummary } from '../../features/inventory/model/inventorySchemas'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'

function groupByWarehouseId(summaries: ZoneInventorySummary[]) {
  const grouped = new Map<number, ZoneInventorySummary[]>()
  for (const summary of summaries) {
    const zones = grouped.get(summary.warehouseId) ?? []
    zones.push(summary)
    grouped.set(summary.warehouseId, zones)
  }
  return grouped
}

export function InventoryPage() {
  const { user } = useAuth()
  const warehouseIds = user.scope.warehouseIds
  const zoneSummaryQuery = useZoneInventorySummary(warehouseIds)
  const warehousesQuery = useWarehouses(warehouseIds)

  return (
    <>
      <header className="page-header">
        <div>
          <p>INVENTORY</p>
          <h1>재고·창고</h1>
          <span>접근 가능한 창고의 재고 현황을 조회합니다.</span>
        </div>
      </header>

      {warehouseIds.length === 0 ? (
        <section className="panel">
          <h2>접근 가능한 창고가 없습니다</h2>
          <p>계정에 연결된 창고가 없어 재고 현황을 표시할 수 없습니다.</p>
        </section>
      ) : zoneSummaryQuery.isLoading || warehousesQuery.isLoading ? (
        <section className="panel">
          <p>재고 현황을 불러오는 중입니다...</p>
        </section>
      ) : zoneSummaryQuery.isError ? (
        <section className="panel">
          <h2>재고 현황을 불러오지 못했습니다</h2>
          <p>{zoneSummaryQuery.error instanceof Error ? zoneSummaryQuery.error.message : '알 수 없는 오류가 발생했습니다.'}</p>
        </section>
      ) : (
        Array.from(groupByWarehouseId(zoneSummaryQuery.data ?? [])).map(([warehouseId, zones]) => {
          const warehouse = warehousesQuery.data.find((item) => item.warehouseId === warehouseId)
          return (
            <section className="panel" key={warehouseId}>
              <h2>{warehouse?.warehouseName ?? `창고 #${warehouseId}`}</h2>
              <div className="zone-grid">
                {zones.map((zone) => (
                  <article className="zone-card" key={zone.zoneId}>
                    <header>
                      <strong>{zoneCodeLabels[zone.zoneCode]}</strong>
                      <span>{Math.round(zone.usageRate * 100)}%</span>
                    </header>
                    <div className="usage-bar">
                      <div className="usage-bar-fill" style={{ width: `${Math.min(zone.usageRate * 100, 100)}%` }} />
                    </div>
                    <p>
                      {zone.usedCapacity} / {zone.maxCapacity}
                    </p>
                    <ul className="quality-breakdown">
                      {Object.entries(zone.quantityByQualityStatus).map(([status, quantity]) => (
                        <li key={status}>
                          {qualityStatusLabels[status as keyof typeof qualityStatusLabels] ?? status} {quantity}
                        </li>
                      ))}
                    </ul>
                  </article>
                ))}
              </div>
            </section>
          )
        })
      )}
    </>
  )
}
