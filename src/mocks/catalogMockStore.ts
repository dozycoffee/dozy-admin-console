import type { Category, CreateProductRequest, OptionGroup, Product, ProductGroup, Tag, UpdateProductRequest } from '../features/catalog/model/catalogSchemas'

/** 실패는 HTTP 상태와 Problem Details의 `code`로 돌려준다(dozy-catalog-api 명세와 같다). */
export type MockResult = { ok: true; product: Product } | { ok: false; status: number; code: string; currentVersion?: number }

type Seed = { products: readonly Product[]; categories: readonly Category[]; tags: readonly Tag[]; groups: readonly ProductGroup[]; optionGroups: readonly OptionGroup[] }

const fail = (status: number, code: string, currentVersion?: number): MockResult => ({ ok: false, status, code, currentVersion })

/**
 * dozy-catalog-api 상품 쓰기 동작을 메모리에서 흉내 낸다. 화면(개발 서버)을 새로고침하면 처음 상태로 돌아간다.
 * 상품은 바뀔 때마다 version이 오르고, 수정은 화면이 보던 version과 같을 때만 받아들인다(낙관적 잠금).
 */
export function createMockCatalogStore(seed: Seed) {
  let products = [...seed.products]
  let tags = [...seed.tags]
  let nextProductId = Math.max(0, ...products.map((product) => product.id)) + 1
  let nextTagId = Math.max(0, ...tags.map((tag) => tag.id)) + 1

  const find = (id: number) => products.find((product) => product.id === id)
  const replace = (product: Product) => { products = products.map((item) => (item.id === product.id ? product : item)) }

  /** 이름이 같은 태그는 재사용하고 없으면 만든다(요구사항 1.7). */
  function resolveTagIds(names: readonly string[]): number[] {
    return names.map((name) => {
      const existing = tags.find((tag) => tag.name === name)
      if (existing) return existing.id
      const created = { id: nextTagId++, name }
      tags = [...tags, created]
      return created.id
    })
  }

  function validate(input: UpdateProductRequest): MockResult | null {
    const category = seed.categories.find((item) => item.id === input.categoryId)
    if (!category) return fail(404, 'CATEGORY_NOT_FOUND')
    if (category.parentId === null) return fail(400, 'CATEGORY_NOT_ASSIGNABLE')
    if (input.basePrice < 0) return fail(400, 'INVALID_MONEY_AMOUNT')
    if (input.groupIds.some((id) => !seed.groups.some((group) => group.id === id))) return fail(404, 'PRODUCT_GROUP_NOT_FOUND')
    return null
  }

  return {
    products: () => products,
    tags: () => tags,

    create(body: CreateProductRequest): MockResult {
      const invalid = validate(body)
      if (invalid) return invalid
      if (new Set(body.optionGroupIds).size !== body.optionGroupIds.length) return fail(409, 'DUPLICATE_OPTION_GROUP_LINK')
      if (body.optionGroupIds.some((id) => !seed.optionGroups.some((group) => group.id === id))) return fail(404, 'OPTION_GROUP_NOT_FOUND')
      const id = nextProductId++
      const product: Product = {
        id, sku: `DZ-${String(id).padStart(8, '0')}`, name: body.name, status: 'DRAFT', categoryId: body.categoryId, description: body.description, imageUrl: body.imageUrl,
        basePrice: body.basePrice, tracksInventory: body.tracksInventory, tagIds: resolveTagIds(body.tagNames), groupIds: body.groupIds,
        storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: body.optionGroupIds.map((optionGroupId) => ({ optionGroupId, overrides: [] })), version: 1,
      }
      products = [product, ...products]
      return { ok: true, product }
    },

    /** `version`이 없으면 428, 화면이 보던 버전과 다르면 409(`currentVersion` 포함)다. */
    update(id: number, version: number | null, body: UpdateProductRequest): MockResult {
      const current = find(id)
      if (!current) return fail(404, 'PRODUCT_NOT_FOUND')
      if (version === null) return fail(428, 'VERSION_REQUIRED')
      if (version !== current.version) return fail(409, 'VERSION_CONFLICT', current.version)
      const invalid = validate(body)
      if (invalid) return invalid
      const product: Product = { ...current, name: body.name, categoryId: body.categoryId, basePrice: body.basePrice, description: body.description, imageUrl: body.imageUrl, tagIds: resolveTagIds(body.tagNames), groupIds: body.groupIds, version: current.version + 1 }
      replace(product)
      return { ok: true, product }
    },

    /** 활성화는 `ACTIVE`가 아니면, 단종은 `ACTIVE`일 때만 된다. */
    transition(id: number, to: 'ACTIVE' | 'DISCONTINUED'): MockResult {
      const current = find(id)
      if (!current) return fail(404, 'PRODUCT_NOT_FOUND')
      const allowed = to === 'ACTIVE' ? current.status !== 'ACTIVE' : current.status === 'ACTIVE'
      if (!allowed) return fail(409, 'INVALID_PRODUCT_STATUS_TRANSITION')
      const product = { ...current, status: to, version: current.version + 1 }
      replace(product)
      return { ok: true, product }
    },

    remove(id: number): MockResult | { ok: true; product: null } {
      const current = find(id)
      if (!current) return fail(404, 'PRODUCT_NOT_FOUND')
      if (current.status !== 'DRAFT') return fail(409, 'PRODUCT_NOT_DELETABLE')
      products = products.filter((product) => product.id !== id)
      return { ok: true, product: null }
    },
  }
}
