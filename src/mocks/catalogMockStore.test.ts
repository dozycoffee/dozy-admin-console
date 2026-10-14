import { beforeEach, describe, expect, it } from 'vitest'
import { createMockCatalogStore } from './catalogMockStore'
import { mockCategories, mockOptionGroups, mockProductGroups, mockProducts, mockTags } from './catalogMockData'

const body = { name: '새 상품', categoryId: 5, basePrice: 4000, description: null, imageUrl: null, tagNames: [], groupIds: [] }
let store: ReturnType<typeof createMockCatalogStore>

beforeEach(() => {
  store = createMockCatalogStore({ products: mockProducts, categories: mockCategories, tags: mockTags, groups: mockProductGroups, optionGroups: mockOptionGroups })
})

const failure = (result: { ok: boolean }) => result as { ok: false; status: number; code: string; currentVersion?: number }

describe('create', () => {
  it('DRAFT로 만들고 SKU를 부여하며 목록 맨 앞에 둔다', () => {
    const result = store.create({ ...body, tracksInventory: true, optionGroupIds: [2, 1] })

    expect(result.ok && result.product).toMatchObject({ status: 'DRAFT', version: 1, sku: 'DZ-00000015', tracksInventory: true })
    expect(result.ok && result.product.optionGroups.map((link) => link.optionGroupId)).toEqual([2, 1])
    expect(store.products()[0].name).toBe('새 상품')
  })

  it('이름이 같은 태그는 재사용하고 없는 태그는 새로 만든다', () => {
    const result = store.create({ ...body, tracksInventory: false, optionGroupIds: [], tagNames: ['베스트', '새태그'] })

    expect(result.ok && result.product.tagIds).toEqual([2, 4])
    expect(store.tags().map((tag) => tag.name)).toContain('새태그')
  })

  it.each([
    [{ categoryId: 1 }, 400, 'CATEGORY_NOT_ASSIGNABLE'],
    [{ categoryId: 99 }, 404, 'CATEGORY_NOT_FOUND'],
    [{ basePrice: -1 }, 400, 'INVALID_MONEY_AMOUNT'],
    [{ groupIds: [99] }, 404, 'PRODUCT_GROUP_NOT_FOUND'],
    [{ optionGroupIds: [1, 1] }, 409, 'DUPLICATE_OPTION_GROUP_LINK'],
    [{ optionGroupIds: [99] }, 404, 'OPTION_GROUP_NOT_FOUND'],
  ])('입력 %j는 %i %s로 거부한다', (override, status, code) => {
    expect(failure(store.create({ ...body, tracksInventory: false, optionGroupIds: [], ...override }))).toMatchObject({ ok: false, status, code })
  })
})

describe('update', () => {
  it('화면이 보던 버전과 같으면 반영하고 버전을 올린다', () => {
    const result = store.update(12, 4, { ...body, name: '수정한 이름' })

    expect(result.ok && result.product).toMatchObject({ name: '수정한 이름', version: 5, status: 'ACTIVE', tracksInventory: false })
  })

  it('버전이 다르면 409 VERSION_CONFLICT와 현재 버전을 돌려주고 바꾸지 않는다', () => {
    expect(failure(store.update(12, 3, { ...body, name: '수정한 이름' }))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', currentVersion: 4 })
    expect(store.products().find((product) => product.id === 12)?.name).toBe('아이스 아메리카노')
  })

  it('버전을 보내지 않으면 428 VERSION_REQUIRED다', () => {
    expect(failure(store.update(12, null, body))).toMatchObject({ status: 428, code: 'VERSION_REQUIRED' })
  })

  it('없는 상품은 404다', () => {
    expect(failure(store.update(999, 1, body))).toMatchObject({ status: 404, code: 'PRODUCT_NOT_FOUND' })
  })
})

describe('transition', () => {
  it('DRAFT는 활성화하고 ACTIVE는 단종한다', () => {
    expect(store.transition(14, 'ACTIVE')).toMatchObject({ ok: true, product: { status: 'ACTIVE' } })
    expect(store.transition(14, 'DISCONTINUED')).toMatchObject({ ok: true, product: { status: 'DISCONTINUED' } })
    expect(store.transition(14, 'ACTIVE')).toMatchObject({ ok: true, product: { status: 'ACTIVE' } })
  })

  it('이미 ACTIVE인 상품의 활성화와 ACTIVE가 아닌 상품의 단종은 409다', () => {
    expect(failure(store.transition(12, 'ACTIVE'))).toMatchObject({ status: 409, code: 'INVALID_PRODUCT_STATUS_TRANSITION' })
    expect(failure(store.transition(14, 'DISCONTINUED'))).toMatchObject({ status: 409, code: 'INVALID_PRODUCT_STATUS_TRANSITION' })
  })
})

describe('remove', () => {
  it('DRAFT만 삭제한다', () => {
    expect(store.remove(14).ok).toBe(true)
    expect(store.products().some((product) => product.id === 14)).toBe(false)
    expect(failure(store.remove(12))).toMatchObject({ status: 409, code: 'PRODUCT_NOT_DELETABLE' })
  })
})

describe('카테고리', () => {
  it('대분류와 소분류를 만들고 부모는 대분류여야 한다', () => {
    expect(store.createCategory('베이커리', null)).toMatchObject({ ok: true, value: { id: 10, parentId: null } })
    expect(store.createCategory('빵', 10)).toMatchObject({ ok: true, value: { parentId: 10 } })
    expect(failure(store.createCategory('x', 5))).toMatchObject({ status: 404, code: 'TOP_LEVEL_CATEGORY_NOT_FOUND' })
    expect(failure(store.createCategory('x', 99))).toMatchObject({ status: 404, code: 'TOP_LEVEL_CATEGORY_NOT_FOUND' })
  })

  it('이름을 바꾼다', () => {
    expect(store.renameCategory(5, '에스프레소')).toMatchObject({ ok: true, value: { id: 5, name: '에스프레소', parentId: 1 } })
    expect(failure(store.renameCategory(99, 'x'))).toMatchObject({ status: 404, code: 'CATEGORY_NOT_FOUND' })
  })

  it('소분류를 다른 대분류로 옮겨도 상품은 그대로다', () => {
    expect(store.moveCategory(5, 2)).toMatchObject({ ok: true, value: { id: 5, parentId: 2 } })
    expect(store.products().find((product) => product.id === 12)?.categoryId).toBe(5)
  })

  it('상품이 쓰지 않는 소분류는 대분류로 승격할 수 있다', () => {
    expect(store.moveCategory(9, null)).toMatchObject({ ok: true, value: { id: 9, parentId: null } })
  })

  it('상품이 참조 중인 소분류는 승격할 수 없다', () => {
    expect(failure(store.moveCategory(5, null))).toMatchObject({ status: 409, code: 'REFERENCED_CATEGORY_NOT_PROMOTABLE' })
  })

  it('소분류가 있는 대분류는 강등할 수 없고 없는 대분류는 강등할 수 있다', () => {
    expect(failure(store.moveCategory(1, 2))).toMatchObject({ status: 409, code: 'CATEGORY_WITH_CHILDREN_NOT_DEMOTABLE' })
    store.createCategory('빈 대분류', null)
    expect(store.moveCategory(10, 2)).toMatchObject({ ok: true, value: { id: 10, parentId: 2 } })
  })

  it('자기 자신이나 소분류를 부모로 지정할 수 없다', () => {
    expect(failure(store.moveCategory(5, 5))).toMatchObject({ status: 400, code: 'INVALID_PARENT_CATEGORY' })
    expect(failure(store.moveCategory(9, 5))).toMatchObject({ status: 404, code: 'TOP_LEVEL_CATEGORY_NOT_FOUND' })
  })

  it('대분류를 null로 바꾸면 변화가 없다', () => {
    expect(store.moveCategory(2, null)).toMatchObject({ ok: true, value: { id: 2, parentId: null } })
  })

  it('소분류가 있거나 상품이 참조 중이면 삭제할 수 없다', () => {
    expect(failure(store.deleteCategory(1))).toMatchObject({ status: 409, code: 'CATEGORY_HAS_CHILDREN' })
    expect(failure(store.deleteCategory(5))).toMatchObject({ status: 409, code: 'CATEGORY_STILL_REFERENCED' })
    expect(store.deleteCategory(9)).toMatchObject({ ok: true, value: null })
    expect(store.categories().some((category) => category.id === 9)).toBe(false)
  })

  it('삭제한 카테고리로는 상품을 등록할 수 없다', () => {
    store.deleteCategory(9)
    expect(failure(store.create({ ...body, categoryId: 9, tracksInventory: false, optionGroupIds: [] }))).toMatchObject({ code: 'CATEGORY_NOT_FOUND' })
  })
})

describe('태그', () => {
  it('이름을 바꾸고 다른 태그와 같은 이름은 거부한다', () => {
    expect(store.renameTag(1, '신상')).toMatchObject({ ok: true, value: { id: 1, name: '신상' } })
    expect(failure(store.renameTag(1, '베스트'))).toMatchObject({ status: 409, code: 'TAG_NAME_DUPLICATED' })
    expect(store.renameTag(2, '베스트')).toMatchObject({ ok: true })
    expect(failure(store.renameTag(99, 'x'))).toMatchObject({ status: 404, code: 'TAG_NOT_FOUND' })
  })

  it('삭제하면 참조하던 모든 상품에서 빠진다', () => {
    expect(store.deleteTag(2)).toMatchObject({ ok: true, value: null })
    expect(store.tags().some((tag) => tag.id === 2)).toBe(false)
    expect(store.products().filter((product) => product.tagIds.includes(2))).toEqual([])
    expect(store.products().find((product) => product.id === 11)?.tagIds).toEqual([1])
  })
})

describe('상품 그룹', () => {
  it('등록·이름 변경·삭제하고 삭제하면 참조하던 상품에서 빠진다', () => {
    expect(store.createGroup('봄 시즌')).toMatchObject({ ok: true, value: { id: 3, name: '봄 시즌' } })
    expect(store.renameGroup(3, '봄 한정')).toMatchObject({ ok: true, value: { name: '봄 한정' } })
    expect(store.deleteGroup(1)).toMatchObject({ ok: true, value: null })
    expect(store.products().filter((product) => product.groupIds.includes(1))).toEqual([])
    expect(failure(store.renameGroup(99, 'x'))).toMatchObject({ status: 404, code: 'PRODUCT_GROUP_NOT_FOUND' })
    expect(failure(store.deleteGroup(99))).toMatchObject({ status: 404, code: 'PRODUCT_GROUP_NOT_FOUND' })
  })
})
