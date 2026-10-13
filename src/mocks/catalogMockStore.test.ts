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
