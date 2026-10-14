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

export type SelectionType = OptionGroup['selectionType']
export const selectionTypeLabels: Record<SelectionType, string> = { SINGLE: '단일 선택', MULTI: '복수 선택' }

/** 옵션 그룹 안의 옵션. `optionKey`는 옵션 정보를 교체해도 유지되는 논리 식별자이고 상품의 예외가 이 키로 옵션을 가리킨다. */
export type OptionInput = { optionKey: string; name: string; price: number }
export type CreateOptionGroupRequest = { name: string; selectionType: SelectionType; required: boolean; options: OptionInput[] }
/** 이름·선택 방식·필수 여부. 옵션 목록은 별도 요청으로 바꾼다. */
export type UpdateOptionGroupRequest = { name: string; selectionType: SelectionType; required: boolean }

/** 상품에서 옵션 하나에 지정하는 예외: 이 상품에서만 가격을 다르게 하거나(0 이상) 선택할 수 없게 제외한다. */
export type OptionOverrideInput = { type: 'PRICE'; price: number } | { type: 'EXCLUDE' }

/**
 * 연결된 옵션 그룹에 이 상품의 예외를 반영한 결과와 표시용 시작가. 업무 규칙이 들어간 계산이라 서버가 제공하며 콘솔은 그대로 보여준다.
 * 제외된 옵션은 빠지고, 필수 그룹에 유효 옵션이 1개면 `autoSelectedOptionKey`가 그 키다.
 */
export const effectiveOptionsSchema = z.object({
  productId: z.number(),
  basePrice: z.number(),
  displayStartingPrice: z.number(),
  groups: z.array(z.object({
    optionGroupId: z.number(),
    name: z.string(),
    selectionType: z.enum(['SINGLE', 'MULTI']),
    required: z.boolean(),
    autoSelectedOptionKey: z.string().nullable(),
    options: z.array(z.object({ optionKey: z.string(), name: z.string(), price: z.number(), priceOverridden: z.boolean() })),
  })),
})
export type EffectiveOptions = z.infer<typeof effectiveOptionsSchema>
