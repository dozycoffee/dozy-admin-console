import { WarehouseFloorPlan } from '../dashboard/WarehouseFloorPlan'
import { mockWarehouseName, mockZoneSummaries } from '../dashboard/warehouseMockData'

export function WarehouseMapPage() {
  return <>
    <header className="page-header map-page-header">
      <div><p>WAREHOUSE MAP</p><h1>{mockWarehouseName} 평면도</h1><span>영역을 클릭하거나 마우스를 올리면 Capacity 상세를 확인할 수 있습니다.</span></div>
    </header>
    <section className="panel dashboard-panel map-page-panel"><WarehouseFloorPlan summaries={mockZoneSummaries} /></section>
  </>
}
