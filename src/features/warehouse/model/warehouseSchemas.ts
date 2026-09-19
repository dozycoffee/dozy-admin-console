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
