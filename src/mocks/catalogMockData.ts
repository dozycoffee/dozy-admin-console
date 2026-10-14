import type { Category, OptionGroup, Product, ProductGroup, ProductListParams, Tag } from '../features/catalog/model/catalogSchemas'

export const mockCategories: Category[] = [
  { id: 1, name: '음료', parentId: null },
  { id: 2, name: '푸드', parentId: null },
  { id: 3, name: 'MD', parentId: null },
  // 소분류가 없는 대분류(삭제·소분류로 변경 시연용)
  { id: 4, name: '시즌 기획', parentId: null },
  { id: 5, name: '커피', parentId: 1 },
  { id: 6, name: '티', parentId: 1 },
  { id: 7, name: '디저트', parentId: 2 },
  { id: 8, name: '굿즈', parentId: 3 },
  // 아직 쓰는 상품이 없는 소분류(삭제·승격 시연용)
  { id: 9, name: '샌드위치', parentId: 2 },
]

export const mockTags: Tag[] = [
  { id: 1, name: '신메뉴' },
  { id: 2, name: '베스트' },
  { id: 3, name: '시즌한정' },
]

export const mockProductGroups: ProductGroup[] = [
  { id: 1, name: '여름 시즌' },
  { id: 2, name: '겨울 시즌' },
]

export const mockOptionGroups: OptionGroup[] = [
  { id: 1, name: '사이즈', selectionType: 'SINGLE', required: true, version: 2, options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 500 }, { optionKey: 'XLARGE', name: '엑스라지', price: 1000 }] },
  { id: 2, name: '샷 추가', selectionType: 'MULTI', required: false, version: 1, options: [{ optionKey: 'SHOT', name: '샷 추가', price: 500 }] },
]

const sizeOptions: Product['optionGroups'] = [{ optionGroupId: 1, overrides: [{ optionKey: 'LARGE', type: 'PRICE', price: 700 }, { optionKey: 'XLARGE', type: 'EXCLUDE', price: null }] }, { optionGroupId: 2, overrides: [] }]

function product(id: number, name: string, status: Product['status'], categoryId: number, basePrice: number, extra: Partial<Product> = {}): Product {
  return {
    id, sku: `DZ-${String(id).padStart(8, '0')}`, name, status, categoryId, description: null, imageUrl: null, basePrice, tracksInventory: false,
    tagIds: [], groupIds: [], storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [], version: 1, ...extra,
  }
}

// 최근 등록한 상품이 먼저 오도록 id 내림차순이다(실제 API와 같다).
export const mockProducts: Product[] = [
  product(14, '텀블러 블랙', 'DRAFT', 8, 24000, { tracksInventory: true, description: '스테인리스 텀블러 473ml' }),
  product(13, '머그컵 세트', 'ACTIVE', 8, 18000, { tracksInventory: true, tagIds: [3], storeScope: { kind: 'LIMITED', targetStoreIds: [101, 102, 103] } }),
  product(12, '아이스 아메리카노', 'ACTIVE', 5, 4500, { description: '산미가 적은 원두', tagIds: [2], groupIds: [1], optionGroups: sizeOptions, version: 4 }),
  product(11, '콜드브루', 'ACTIVE', 5, 5000, { tagIds: [1, 2], groupIds: [1], optionGroups: sizeOptions }),
  product(10, '카페라떼', 'ACTIVE', 5, 5000, { tagIds: [2], optionGroups: sizeOptions }),
  product(9, '캐모마일 티', 'ACTIVE', 6, 4800, { storeScope: { kind: 'LIMITED', targetStoreIds: [] } }),
  product(8, '유자차', 'DISCONTINUED', 6, 5200, { groupIds: [2] }),
  product(7, '핫초코', 'DISCONTINUED', 6, 5200, { groupIds: [2] }),
  product(6, '치즈케이크', 'ACTIVE', 7, 6500, { sku: null, tracksInventory: true }),
  product(5, '티라미수', 'ACTIVE', 7, 6800, { tracksInventory: true }),
  product(4, '크로플', 'DRAFT', 7, 5900),
  product(3, '딸기 라떼', 'DRAFT', 5, 5800, { tagIds: [1, 3], groupIds: [1] }),
  product(2, '에스프레소', 'ACTIVE', 5, 3800),
  product(1, '드립 커피', 'ACTIVE', 5, 4200, { optionGroups: [{ optionGroupId: 1, overrides: [] }] }),
]

/** 실제 API(요구사항 1.12)와 같은 조건으로 거른다. 대분류를 고르면 그 아래 소분류의 상품도 포함한다. */
export function filterProducts(products: readonly Product[], categories: readonly Category[], { keyword, status, categoryId, tagId, groupId }: Partial<ProductListParams>): Product[] {
  const categoryIds = categoryId === undefined ? null : new Set([categoryId, ...categories.filter((category) => category.parentId === categoryId).map((category) => category.id)])
  const needle = keyword?.trim().toLowerCase()
  return products.filter((item) =>
    (!needle || item.name.toLowerCase().includes(needle) || item.sku?.toLowerCase() === needle) &&
    (!status || item.status === status) &&
    (!categoryIds || categoryIds.has(item.categoryId)) &&
    (tagId === undefined || item.tagIds.includes(tagId)) &&
    (groupId === undefined || item.groupIds.includes(groupId)))
}
