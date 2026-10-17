import { useMemo } from 'react'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import { useZoneInventorySummary } from '../../features/inventory/model/useZoneInventorySummary'
import { useWarehouses } from '../../features/warehouse/model/useWarehouses'
import { useWorkAreas } from '../../features/warehouse/model/useWorkAreas'
import { useZoneLocations } from '../../features/warehouse/model/useZoneLocations'
import { WarehouseFloorPlan, type Occupancy } from './WarehouseFloorPlan'

// 평면도의 칸 이름(work area)과 서버의 작업 처리장 코드 대응
const workAreaIds = { INBOUND: '입고처리장', RETURN: '반품처리장', OUTBOUND: '출고장', DISPOSAL: '폐기처리장' } as const

export function WarehouseMapPage() {
  const user = useCurrentUser()
  const warehouseIds = user.scope.warehouseIds
  const warehouse = useWarehouses(warehouseIds).data[0]
  const zones = useZoneInventorySummary(warehouseIds)
  const locations = useZoneLocations((zones.data ?? []).map((zone) => zone.zoneId))
  const workAreas = useWorkAreas(warehouse?.warehouseId)
  const occupancy = useMemo<Occupancy>(() => {
    const result: Occupancy = {}
    locations.data.forEach((location) => { result[location.locationCode] = { capacity: location.maxCapacity, used: location.usedCapacity } })
    workAreas.data.forEach((area) => { result[workAreaIds[area.areaCode]] = { capacity: area.maxCapacity, used: area.usedCapacity } })
    return result
  }, [locations.data, workAreas.data])
  const loading = zones.isLoading || locations.isLoading || workAreas.isLoading
  const failed = zones.isError || locations.isError || workAreas.isError

  return <>
    <header className="page-header map-page-header">
      <div><p>WAREHOUSE MAP</p><h1>{warehouse?.warehouseName ?? '담당 창고'} 평면도</h1><span>영역을 클릭하거나 마우스를 올리면 Capacity 상세를 확인할 수 있습니다.</span></div>
    </header>
    {warehouseIds.length === 0 ? <section className="panel"><h2>접근 가능한 창고가 없습니다</h2><p>계정에 연결된 창고가 없어 평면도를 표시할 수 없습니다.</p></section>
      : loading ? <section className="panel"><p>평면도를 불러오는 중입니다...</p></section>
        : failed ? <section className="panel"><h2>평면도를 불러오지 못했습니다</h2><p>Zone과 Location 용량을 읽지 못했습니다. 잠시 후 다시 시도하세요.</p></section>
          : <section className="panel dashboard-panel map-page-panel"><WarehouseFloorPlan occupancy={occupancy} /></section>}
  </>
}
