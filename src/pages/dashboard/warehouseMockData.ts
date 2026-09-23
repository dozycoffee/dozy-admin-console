import type { ZoneInventorySummary } from '../../features/inventory/model/inventorySchemas'

export const mockZoneSummaries: ZoneInventorySummary[] = [
  { zoneId: 1, zoneCode: 'A', warehouseId: 1481, maxCapacity: 820, usedCapacity: 583, usageRate: 583 / 820, quantityByQualityStatus: { NORMAL: 530, DEFECTIVE: 20, DISPOSAL_SCHEDULED: 33 } },
  { zoneId: 2, zoneCode: 'B', warehouseId: 1481, maxCapacity: 550, usedCapacity: 330, usageRate: 330 / 550, quantityByQualityStatus: { NORMAL: 321, DEFECTIVE: 9 } },
  { zoneId: 3, zoneCode: 'C', warehouseId: 1481, maxCapacity: 460, usedCapacity: 419, usageRate: 419 / 460, quantityByQualityStatus: { NORMAL: 396, DEFECTIVE: 23 } },
  { zoneId: 4, zoneCode: 'D', warehouseId: 1481, maxCapacity: 360, usedCapacity: 135, usageRate: 135 / 360, quantityByQualityStatus: { NORMAL: 135 } },
  { zoneId: 5, zoneCode: 'E', warehouseId: 1481, maxCapacity: 1710, usedCapacity: 1129, usageRate: 1129 / 1710, quantityByQualityStatus: { NORMAL: 1129 } },
  { zoneId: 6, zoneCode: 'F', warehouseId: 1481, maxCapacity: 420, usedCapacity: 147, usageRate: 147 / 420, quantityByQualityStatus: { NORMAL: 147 } },
]

export const mockWarehouseName = '서울 중앙 창고'
