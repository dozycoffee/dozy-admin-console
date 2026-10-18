import { z } from 'zod'

export const warehouseStatusSchema = z.enum(['AVAILABLE', 'UNAVAILABLE'])
export type WarehouseStatus = z.infer<typeof warehouseStatusSchema>

export const warehouseSchema = z.object({
  warehouseId: z.number(),
  warehouseName: z.string(),
  address: z.string(),
  latitude: z.number(),
  longitude: z.number(),
  warehouseStatus: warehouseStatusSchema,
})
export type Warehouse = z.infer<typeof warehouseSchema>

/** `GET /api/warehouses`의 응답. 호출자가 접근할 수 있는 창고를 창고 id 오름차순으로 준다. */
export const warehouseListSchema = z.object({ items: z.array(warehouseSchema) })

/** `GET /api/zones/{zoneId}/locations`의 한 건. 용량만 주고 어떤 재고가 있는지는 `GET /api/location-stocks`가 준다. */
export const locationSchema = z.object({
  locationId: z.number(),
  zoneId: z.number(),
  locationCode: z.string(),
  maxCapacity: z.number(),
  usedCapacity: z.number(),
  locationStatus: warehouseStatusSchema,
})
export type Location = z.infer<typeof locationSchema>
export const locationListSchema = z.array(locationSchema)

export const areaCodeSchema = z.enum(['INBOUND', 'OUTBOUND', 'RETURN', 'DISPOSAL'])
export type AreaCode = z.infer<typeof areaCodeSchema>

/** `GET /api/warehouses/{warehouseId}/work-areas/{areaCode}`. 입고·출고·반품·폐기 처리장의 용량이다. */
export const workAreaSchema = z.object({
  workAreaId: z.number(),
  warehouseId: z.number(),
  areaCode: areaCodeSchema,
  areaName: z.string(),
  maxCapacity: z.number(),
  usedCapacity: z.number(),
  workAreaStatus: warehouseStatusSchema,
})
export type WorkArea = z.infer<typeof workAreaSchema>
