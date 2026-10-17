import { z } from 'zod'

// 원자재는 dozy-inventory-api의 상품 마스터(`/api/v1/products`)다. 화면에서는 "원자재"라 부르고,
// WMS 상품(`features/product`)·판매 상품(catalog)과 구분하려고 코드에서는 material이라 부른다.

export const materialCategories = ['BEAN', 'SYRUP', 'POWDER', 'DAIRY', 'SUPPLY', 'MD'] as const
export const materialCategoryLabels: Record<string, string> = {
  BEAN: '원두',
  SYRUP: '시럽',
  POWDER: '파우더',
  DAIRY: '유제품',
  SUPPLY: '소모품',
  MD: 'MD 상품',
}

export const materialStatuses = ['ACTIVE', 'INACTIVE'] as const
export const materialStatusLabels: Record<string, string> = {
  ACTIVE: '사용 중',
  INACTIVE: '사용 중지',
}

/** 서버가 모르는 값을 보내면 코드를 그대로 보여준다. */
export function labelOf(labels: Record<string, string>, code: string): string {
  return labels[code] ?? code
}

export const MATERIAL_CODE_MAX_LENGTH = 50
export const MATERIAL_NAME_MAX_LENGTH = 100
export const MATERIAL_UNIT_MAX_LENGTH = 20

export const materialSchema = z.object({
  productId: z.number(),
  productCode: z.string(),
  productName: z.string(),
  category: z.string(),
  unit: z.string(),
  productStatus: z.string(),
  shelfLifeDays: z.number().nullish(),
})
export type Material = z.infer<typeof materialSchema>

// 상품 목록 응답에는 totalPages가 없다.
export const materialPageSchema = z.object({ items: z.array(materialSchema), page: z.number(), size: z.number(), totalElements: z.number() })

/** 원자재 목록 조회 조건. 비어 있는 값은 쿼리에서 뺀다. */
export type MaterialFilters = {
  /** 코드나 이름에 들어 있는 글자(부분 일치, 대소문자 무시). 서버가 거른다. */
  keyword?: string
  category?: string
  status?: string
}
export type MaterialParams = MaterialFilters & { page: number; size: number }

export type RegisterMaterialRequest = {
  productCode: string
  productName: string
  category: string
  unit: string
  shelfLifeDays: number | null
}
