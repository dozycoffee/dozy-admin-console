import { z } from 'zod'

export const productCategorySchema = z.enum(['BEAN', 'SYRUP', 'POWDER', 'DAIRY', 'SUPPLY'])
export type ProductCategory = z.infer<typeof productCategorySchema>

export const productStatusSchema = z.enum(['ACTIVE', 'INACTIVE'])
export type ProductStatus = z.infer<typeof productStatusSchema>

export const productSchema = z.object({
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  category: productCategorySchema,
  unit: z.string(),
  shelfLifeDays: z.number().nullable(),
  productStatus: productStatusSchema,
})
export type Product = z.infer<typeof productSchema>

export const productListSchema = z.array(productSchema)
