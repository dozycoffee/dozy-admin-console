import type { Category, CreateOptionGroupRequest, CreateProductRequest, OptionGroup, OptionInput, Product, ProductGroup, Tag, UpdateOptionGroupRequest, UpdateProductRequest } from '../features/catalog/model/catalogSchemas'

/** 실패는 HTTP 상태와 Problem Details의 `code`로 돌려준다(dozy-catalog-api 명세와 같다). */
export type MockFailure = { ok: false; status: number; code: string; currentVersion?: number }
export type MockResult = { ok: true; product: Product } | MockFailure
/** 분류(카테고리·태그·상품 그룹) 쓰기 결과. 삭제는 `value`가 null이다. */
export type MockValueResult<T> = { ok: true; value: T | null } | MockFailure

type Seed = { products: readonly Product[]; categories: readonly Category[]; tags: readonly Tag[]; groups: readonly ProductGroup[]; optionGroups: readonly OptionGroup[] }

const fail = (status: number, code: string, currentVersion?: number): MockFailure => ({ ok: false, status, code, currentVersion })

/**
 * dozy-catalog-api 상품 쓰기 동작을 메모리에서 흉내 낸다. 화면(개발 서버)을 새로고침하면 처음 상태로 돌아간다.
 * 상품은 바뀔 때마다 version이 오르고, 수정은 화면이 보던 version과 같을 때만 받아들인다(낙관적 잠금).
 */
export function createMockCatalogStore(seed: Seed) {
  let products = [...seed.products]
  let tags = [...seed.tags]
  let categories = [...seed.categories]
  let groups = [...seed.groups]
  let optionGroups = [...seed.optionGroups]
  let nextProductId = Math.max(0, ...products.map((product) => product.id)) + 1
  let nextTagId = Math.max(0, ...tags.map((tag) => tag.id)) + 1
  let nextCategoryId = Math.max(0, ...categories.map((category) => category.id)) + 1
  let nextGroupId = Math.max(0, ...groups.map((group) => group.id)) + 1
  let nextOptionGroupId = Math.max(0, ...optionGroups.map((group) => group.id)) + 1

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

  /** 옵션 목록의 규칙(옵션 1개 이상, 키 유일, 가격 0 이상). */
  function validateOptions(options: readonly OptionInput[]): MockFailure | null {
    if (options.length === 0) return fail(422, 'EMPTY_OPTION_GROUP')
    if (new Set(options.map((option) => option.optionKey)).size !== options.length) return fail(400, 'DUPLICATE_OPTION_KEY')
    if (options.some((option) => option.price < 0)) return fail(400, 'INVALID_MONEY_AMOUNT')
    return null
  }

  /** 낙관적 잠금 검사. 버전이 없으면 428, 화면이 보던 버전과 다르면 409(`currentVersion` 포함)다. */
  function checkVersion(current: OptionGroup, version: number | null): MockFailure | null {
    if (version === null) return fail(428, 'VERSION_REQUIRED')
    if (version !== current.version) return fail(409, 'VERSION_CONFLICT', current.version)
    return null
  }

  function validate(input: UpdateProductRequest): MockResult | null {
    const category = categories.find((item) => item.id === input.categoryId)
    if (!category) return fail(404, 'CATEGORY_NOT_FOUND')
    if (category.parentId === null) return fail(400, 'CATEGORY_NOT_ASSIGNABLE')
    if (input.basePrice < 0) return fail(400, 'INVALID_MONEY_AMOUNT')
    if (input.groupIds.some((id) => !groups.some((group) => group.id === id))) return fail(404, 'PRODUCT_GROUP_NOT_FOUND')
    return null
  }

  return {
    products: () => products,
    tags: () => tags,
    categories: () => categories,
    groups: () => groups,

    create(body: CreateProductRequest): MockResult {
      const invalid = validate(body)
      if (invalid) return invalid
      if (new Set(body.optionGroupIds).size !== body.optionGroupIds.length) return fail(409, 'DUPLICATE_OPTION_GROUP_LINK')
      if (body.optionGroupIds.some((id) => !optionGroups.some((group) => group.id === id))) return fail(404, 'OPTION_GROUP_NOT_FOUND')
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

    /** 대분류(`parentId` null)나 그 아래 소분류를 만든다. 부모는 대분류여야 한다. */
    createCategory(name: string, parentId: number | null): MockValueResult<Category> {
      if (parentId !== null && !categories.some((category) => category.id === parentId && category.parentId === null)) return fail(404, 'TOP_LEVEL_CATEGORY_NOT_FOUND')
      const created: Category = { id: nextCategoryId++, name, parentId }
      categories = [...categories, created]
      return { ok: true, value: created }
    },

    renameCategory(id: number, name: string): MockValueResult<Category> {
      const current = categories.find((category) => category.id === id)
      if (!current) return fail(404, 'CATEGORY_NOT_FOUND')
      const renamed = { ...current, name }
      categories = categories.map((category) => (category.id === id ? renamed : category))
      return { ok: true, value: renamed }
    },

    /**
     * 소분류 이동, 대분류 강등, 소분류 승격(`parentId` null). 소분류가 있는 대분류는 강등할 수 없고,
     * 상품이 참조 중인 소분류는 승격할 수 없다. 대분류를 null로 바꾸면 변화가 없다.
     */
    moveCategory(id: number, parentId: number | null): MockValueResult<Category> {
      const current = categories.find((category) => category.id === id)
      if (!current) return fail(404, 'CATEGORY_NOT_FOUND')
      if (parentId === id) return fail(400, 'INVALID_PARENT_CATEGORY')
      if (parentId !== null && !categories.some((category) => category.id === parentId && category.parentId === null)) return fail(404, 'TOP_LEVEL_CATEGORY_NOT_FOUND')
      if (current.parentId === null && parentId !== null && categories.some((category) => category.parentId === id)) return fail(409, 'CATEGORY_WITH_CHILDREN_NOT_DEMOTABLE')
      if (current.parentId !== null && parentId === null && products.some((product) => product.categoryId === id)) return fail(409, 'REFERENCED_CATEGORY_NOT_PROMOTABLE')
      const moved = { ...current, parentId }
      categories = categories.map((category) => (category.id === id ? moved : category))
      return { ok: true, value: moved }
    },

    deleteCategory(id: number): MockValueResult<Category> {
      if (!categories.some((category) => category.id === id)) return fail(404, 'CATEGORY_NOT_FOUND')
      if (categories.some((category) => category.parentId === id)) return fail(409, 'CATEGORY_HAS_CHILDREN')
      if (products.some((product) => product.categoryId === id)) return fail(409, 'CATEGORY_STILL_REFERENCED')
      categories = categories.filter((category) => category.id !== id)
      return { ok: true, value: null }
    },

    /** 다른 태그와 같은 이름으로는 바꿀 수 없다(자기 이름 그대로는 허용). */
    renameTag(id: number, name: string): MockValueResult<Tag> {
      const current = tags.find((tag) => tag.id === id)
      if (!current) return fail(404, 'TAG_NOT_FOUND')
      if (tags.some((tag) => tag.id !== id && tag.name === name)) return fail(409, 'TAG_NAME_DUPLICATED')
      const renamed = { ...current, name }
      tags = tags.map((tag) => (tag.id === id ? renamed : tag))
      return { ok: true, value: renamed }
    },

    /** 삭제하면 참조하던 모든 상품에서 태그가 빠진다. */
    deleteTag(id: number): MockValueResult<Tag> {
      if (!tags.some((tag) => tag.id === id)) return fail(404, 'TAG_NOT_FOUND')
      tags = tags.filter((tag) => tag.id !== id)
      products = products.map((product) => (product.tagIds.includes(id) ? { ...product, tagIds: product.tagIds.filter((tagId) => tagId !== id) } : product))
      return { ok: true, value: null }
    },

    createGroup(name: string): MockValueResult<ProductGroup> {
      const created = { id: nextGroupId++, name }
      groups = [...groups, created]
      return { ok: true, value: created }
    },

    renameGroup(id: number, name: string): MockValueResult<ProductGroup> {
      const current = groups.find((group) => group.id === id)
      if (!current) return fail(404, 'PRODUCT_GROUP_NOT_FOUND')
      const renamed = { ...current, name }
      groups = groups.map((group) => (group.id === id ? renamed : group))
      return { ok: true, value: renamed }
    },

    /** 삭제하면 참조하던 모든 상품에서 그룹이 빠진다. */
    deleteGroup(id: number): MockValueResult<ProductGroup> {
      if (!groups.some((group) => group.id === id)) return fail(404, 'PRODUCT_GROUP_NOT_FOUND')
      groups = groups.filter((group) => group.id !== id)
      products = products.map((product) => (product.groupIds.includes(id) ? { ...product, groupIds: product.groupIds.filter((groupId) => groupId !== id) } : product))
      return { ok: true, value: null }
    },

    /** 이름으로 거른 옵션 그룹(등록 순). */
    optionGroups: (keyword?: string) => (keyword ? optionGroups.filter((group) => group.name.toLowerCase().includes(keyword.toLowerCase())) : optionGroups),

    createOptionGroup(body: CreateOptionGroupRequest): MockValueResult<OptionGroup> {
      const invalid = validateOptions(body.options)
      if (invalid) return invalid
      const created: OptionGroup = { id: nextOptionGroupId++, name: body.name, selectionType: body.selectionType, required: body.required, options: body.options, version: 1 }
      optionGroups = [...optionGroups, created]
      return { ok: true, value: created }
    },

    /** 이름·선택 방식·필수 여부를 바꾼다. 옵션 목록은 바꾸지 않는다. */
    updateOptionGroup(id: number, version: number | null, body: UpdateOptionGroupRequest): MockValueResult<OptionGroup> {
      const current = optionGroups.find((group) => group.id === id)
      if (!current) return fail(404, 'OPTION_GROUP_NOT_FOUND')
      const conflict = checkVersion(current, version)
      if (conflict) return conflict
      const updated = { ...current, name: body.name, selectionType: body.selectionType, required: body.required, version: current.version + 1 }
      optionGroups = optionGroups.map((group) => (group.id === id ? updated : group))
      return { ok: true, value: updated }
    },

    /**
     * 옵션 목록을 통째로 교체한다. 연결한 상품 중 어느 한 곳이라도 제외 예외 때문에 선택 가능한 옵션이 0개가 되면 거부하고,
     * 성공하면 사라진 옵션 키의 상품별 예외를 모든 연결 상품에서 지운다.
     */
    replaceOptions(id: number, version: number | null, options: readonly OptionInput[]): MockValueResult<OptionGroup> {
      const current = optionGroups.find((group) => group.id === id)
      if (!current) return fail(404, 'OPTION_GROUP_NOT_FOUND')
      const conflict = checkVersion(current, version)
      if (conflict) return conflict
      const invalid = validateOptions(options)
      if (invalid) return invalid
      const keys = new Set(options.map((option) => option.optionKey))
      const linked = products.filter((product) => product.optionGroups.some((link) => link.optionGroupId === id))
      const noneSelectable = linked.some((product) => {
        const excluded = new Set(product.optionGroups.find((link) => link.optionGroupId === id)?.overrides.filter((override) => override.type === 'EXCLUDE').map((override) => override.optionKey))
        return [...keys].every((key) => excluded.has(key))
      })
      if (noneSelectable) return fail(422, 'NO_SELECTABLE_OPTION')
      products = products.map((product) => ({
        ...product,
        optionGroups: product.optionGroups.map((link) => (link.optionGroupId === id ? { ...link, overrides: link.overrides.filter((override) => keys.has(override.optionKey)) } : link)),
      }))
      const updated = { ...current, options: [...options], version: current.version + 1 }
      optionGroups = optionGroups.map((group) => (group.id === id ? updated : group))
      return { ok: true, value: updated }
    },

    /** 연결한 상품이 있으면 삭제할 수 없다. */
    deleteOptionGroup(id: number): MockValueResult<OptionGroup> {
      if (!optionGroups.some((group) => group.id === id)) return fail(404, 'OPTION_GROUP_NOT_FOUND')
      if (products.some((product) => product.optionGroups.some((link) => link.optionGroupId === id))) return fail(409, 'OPTION_GROUP_STILL_REFERENCED')
      optionGroups = optionGroups.filter((group) => group.id !== id)
      return { ok: true, value: null }
    },
  }
}
