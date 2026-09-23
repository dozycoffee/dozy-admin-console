import type { ZoneInventorySummary } from '../../features/inventory/model/inventorySchemas'

export const mockZoneSummaries: ZoneInventorySummary[] = [
  { zoneId: 1, zoneCode: 'A', warehouseId: 1481, maxCapacity: 180, usedCapacity: 128, usageRate: 128 / 180, quantityByQualityStatus: { NORMAL: 116, DEFECTIVE: 4, DISPOSAL_SCHEDULED: 8 } },
  { zoneId: 2, zoneCode: 'B', warehouseId: 1481, maxCapacity: 120, usedCapacity: 72, usageRate: 72 / 120, quantityByQualityStatus: { NORMAL: 70, DEFECTIVE: 2 } },
  { zoneId: 3, zoneCode: 'C', warehouseId: 1481, maxCapacity: 100, usedCapacity: 91, usageRate: 91 / 100, quantityByQualityStatus: { NORMAL: 86, DEFECTIVE: 5 } },
  { zoneId: 4, zoneCode: 'D', warehouseId: 1481, maxCapacity: 80, usedCapacity: 30, usageRate: 30 / 80, quantityByQualityStatus: { NORMAL: 30 } },
  { zoneId: 5, zoneCode: 'E', warehouseId: 1481, maxCapacity: 370, usedCapacity: 244, usageRate: 244 / 370, quantityByQualityStatus: { NORMAL: 244 } },
]

export const mockWarehouseName = '서울 중앙 창고'
