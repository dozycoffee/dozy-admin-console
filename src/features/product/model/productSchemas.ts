import { z } from 'zod'

export const productCategorySchema = z.enum(['BEAN', 'SYRUP', 'POWDER', 'DAIRY', 'SUPPLY'])
export const productSchema = z.object({
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  category: productCategorySchema,
  unit: z.string(),
  shelfLifeDays: z.number().nullable(),
  productStatus: z.string(),
})
export type Product = z.infer<typeof productSchema>
export const productListSchema = z.array(productSchema)
