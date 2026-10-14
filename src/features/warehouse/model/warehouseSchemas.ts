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
