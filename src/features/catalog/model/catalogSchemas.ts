import { z } from 'zod'

export const productStatuses = ['DRAFT', 'ACTIVE', 'DISCONTINUED'] as const
export type ProductStatus = (typeof productStatuses)[number]
export const productStatusLabels: Record<ProductStatus, string> = {
  DRAFT: '판매 대기',
  ACTIVE: '판매중',
  DISCONTINUED: '단종',
}

const optionOverrideSchema = z.object({
  optionKey: z.string(),
  type: z.enum(['PRICE', 'EXCLUDE']),
  price: z.number().nullable(),
})

// 상품은 카테고리·태그·그룹을 id로만 가리킨다. 이름은 분류 API로 받아 화면에서 붙인다.
export const productSchema = z.object({
  id: z.number(),
  // 과거 데이터는 SKU가 없을 수 있다.
  sku: z.string().nullable(),
  name: z.string(),
  status: z.enum(productStatuses),
  categoryId: z.number(),
  description: z.string().nullable(),
  imageUrl: z.string().nullable(),
  basePrice: z.number(),
  tracksInventory: z.boolean(),
  tagIds: z.array(z.number()),
  groupIds: z.array(z.number()),
  storeScope: z.object({ kind: z.enum(['ALL', 'LIMITED']), targetStoreIds: z.array(z.number()) }),
  optionGroups: z.array(z.object({ optionGroupId: z.number(), overrides: z.array(optionOverrideSchema) })),
  version: z.number(),
})
export type Product = z.infer<typeof productSchema>

export const productPageSchema = z.object({
  content: z.array(productSchema),
  page: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

/** `parentId`가 null이면 대분류, 값이 있으면 그 대분류의 소분류다. */
export const categorySchema = z.object({ id: z.number(), name: z.string(), parentId: z.number().nullable() })
export type Category = z.infer<typeof categorySchema>
export const categoryListSchema = z.array(categorySchema)

export const tagSchema = z.object({ id: z.number(), name: z.string() })
export type Tag = z.infer<typeof tagSchema>
export const tagListSchema = z.array(tagSchema)

export const productGroupSchema = z.object({ id: z.number(), name: z.string() })
export type ProductGroup = z.infer<typeof productGroupSchema>
export const productGroupListSchema = z.array(productGroupSchema)

export const optionGroupSchema = z.object({
  id: z.number(),
  name: z.string(),
  selectionType: z.enum(['SINGLE', 'MULTI']),
  required: z.boolean(),
  options: z.array(z.object({ optionKey: z.string(), name: z.string(), price: z.number() })),
  version: z.number(),
})
export type OptionGroup = z.infer<typeof optionGroupSchema>
export const optionGroupListSchema = z.array(optionGroupSchema)

export type ProductListParams = {
  keyword?: string
  status?: ProductStatus
  categoryId?: number
  tagId?: number
  groupId?: number
  page: number
  size: number
}

/** 상품 등록·수정이 함께 받는 필드. 태그는 이름으로 보내며 없는 태그는 서버가 만든다. */
export type ProductInput = {
  name: string
  categoryId: number
  basePrice: number
  description: string | null
  imageUrl: string | null
  tagNames: string[]
  groupIds: number[]
}
/** 재고 관리 여부와 옵션 그룹 연결은 등록할 때만 정한다(수정 요청으로는 바꿀 수 없다). 옵션 그룹은 배열 순서가 노출 순서다. */
export type CreateProductRequest = ProductInput & { tracksInventory: boolean; optionGroupIds: number[] }
export type UpdateProductRequest = ProductInput
