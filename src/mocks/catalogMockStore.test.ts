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

describe('옵션 그룹', () => {
  const sizes = [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 500 }]
  const newGroup = { name: '시럽', selectionType: 'MULTI' as const, required: false, options: [{ optionKey: 'VANILLA', name: '바닐라', price: 300 }] }

  it('이름으로 검색한다(대소문자 무시)', () => {
    expect(store.optionGroups('사이').map((group) => group.name)).toEqual(['사이즈'])
    expect(store.optionGroups().length).toBe(3)
  })

  it('등록하면 version 1로 만들어 맨 뒤에 둔다', () => {
    expect(store.createOptionGroup(newGroup)).toMatchObject({ ok: true, value: { id: 4, version: 1, name: '시럽' } })
    expect(store.optionGroups().at(-1)?.name).toBe('시럽')
  })

  it.each([
    [{ options: [] }, 422, 'EMPTY_OPTION_GROUP'],
    [{ options: [{ optionKey: 'A', name: 'a', price: 0 }, { optionKey: 'A', name: 'b', price: 0 }] }, 400, 'DUPLICATE_OPTION_KEY'],
    [{ options: [{ optionKey: 'A', name: 'a', price: -1 }] }, 400, 'INVALID_MONEY_AMOUNT'],
  ])('등록 입력 %j는 %i %s로 거부한다', (override, status, code) => {
    expect(failure(store.createOptionGroup({ ...newGroup, ...override }))).toMatchObject({ status, code })
  })

  it('이름·선택 방식·필수 여부를 바꾸면 버전이 오르고 옵션은 그대로다', () => {
    const result = store.updateOptionGroup(1, 2, { name: '크기', selectionType: 'MULTI', required: false })

    expect(result).toMatchObject({ ok: true, value: { name: '크기', selectionType: 'MULTI', required: false, version: 3 } })
    expect(store.optionGroups().find((group) => group.id === 1)?.options).toHaveLength(3)
  })

  it('버전이 다르면 409 VERSION_CONFLICT와 현재 버전을, 없으면 428을 돌려주고 바꾸지 않는다', () => {
    expect(failure(store.updateOptionGroup(1, 1, { name: 'x', selectionType: 'SINGLE', required: true }))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', currentVersion: 2 })
    expect(failure(store.updateOptionGroup(1, null, { name: 'x', selectionType: 'SINGLE', required: true }))).toMatchObject({ status: 428, code: 'VERSION_REQUIRED' })
    expect(failure(store.updateOptionGroup(99, 1, { name: 'x', selectionType: 'SINGLE', required: true }))).toMatchObject({ status: 404, code: 'OPTION_GROUP_NOT_FOUND' })
    expect(store.optionGroups().find((group) => group.id === 1)?.name).toBe('사이즈')
  })

  it('옵션 목록을 교체하고 버전을 올린다', () => {
    expect(store.replaceOptions(1, 2, sizes)).toMatchObject({ ok: true, value: { version: 3, options: sizes } })
  })

  it('옵션 목록 교체도 버전 충돌과 규칙을 검사한다', () => {
    expect(failure(store.replaceOptions(1, 1, sizes))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
    expect(failure(store.replaceOptions(1, 2, []))).toMatchObject({ status: 422, code: 'EMPTY_OPTION_GROUP' })
    expect(failure(store.replaceOptions(1, 2, [sizes[0], sizes[0]]))).toMatchObject({ status: 400, code: 'DUPLICATE_OPTION_KEY' })
  })

  it('사라진 옵션 키의 상품별 예외를 모든 연결 상품에서 지우고 남은 키의 예외는 둔다', () => {
    // 상품 12·11·10은 사이즈를 연결했고 12·11에 LARGE 가격·XLARGE 제외 예외가 있다
    store.replaceOptions(1, 2, [sizes[0], { optionKey: 'LARGE', name: '라지', price: 500 }])

    const overrides = store.products().find((product) => product.id === 12)?.optionGroups.find((link) => link.optionGroupId === 1)?.overrides
    expect(overrides).toEqual([{ optionKey: 'LARGE', type: 'PRICE', price: 700 }])
  })

  it('제외 예외 때문에 어떤 연결 상품의 선택 가능한 옵션이 0개가 되면 거부한다', () => {
    // 상품 12는 XLARGE를 제외했다. 옵션을 XLARGE 하나로 줄이면 그 상품이 고를 옵션이 없다.
    expect(failure(store.replaceOptions(1, 2, [{ optionKey: 'XLARGE', name: '엑스라지', price: 1000 }]))).toMatchObject({ status: 422, code: 'NO_SELECTABLE_OPTION' })
    expect(store.optionGroups().find((group) => group.id === 1)?.version).toBe(2)
  })

  it('연결한 상품이 있으면 삭제할 수 없고 없으면 삭제한다', () => {
    expect(failure(store.deleteOptionGroup(1))).toMatchObject({ status: 409, code: 'OPTION_GROUP_STILL_REFERENCED' })
    expect(store.deleteOptionGroup(3)).toMatchObject({ ok: true, value: null })
    expect(store.optionGroups().some((group) => group.id === 3)).toBe(false)
    expect(failure(store.deleteOptionGroup(99))).toMatchObject({ status: 404, code: 'OPTION_GROUP_NOT_FOUND' })
  })

  it('만든 옵션 그룹은 상품 등록에서 연결할 수 있다', () => {
    store.createOptionGroup(newGroup)
    expect(store.create({ ...body, tracksInventory: false, optionGroupIds: [4] })).toMatchObject({ ok: true })
  })
})

describe('상품의 옵션 그룹 연결', () => {
  // 상품 12(버전 4)는 사이즈(1: LARGE 가격 700·XLARGE 제외 예외)와 샷 추가(2)를 연결했고, 상품 14는 연결이 없다.
  const links = (productId: number) => store.products().find((product) => product.id === productId)?.optionGroups ?? []

  it('연결은 기존 연결 뒤에 붙고 버전이 오른다', () => {
    expect(store.linkOptionGroup(14, 1, 3)).toMatchObject({ ok: true, product: { version: 2, optionGroups: [{ optionGroupId: 3, overrides: [] }] } })
    expect(store.linkOptionGroup(12, 4, 3)).toMatchObject({ ok: true })
    expect(links(12).map((link) => link.optionGroupId)).toEqual([1, 2, 3])
  })

  it('같은 그룹을 두 번 연결하거나 없는 그룹·상품을 지정하면 거부한다', () => {
    expect(failure(store.linkOptionGroup(12, 4, 1))).toMatchObject({ status: 409, code: 'DUPLICATE_OPTION_GROUP_LINK' })
    expect(failure(store.linkOptionGroup(12, 4, 99))).toMatchObject({ status: 404, code: 'OPTION_GROUP_NOT_FOUND' })
    expect(failure(store.linkOptionGroup(99, 1, 3))).toMatchObject({ status: 404, code: 'PRODUCT_NOT_FOUND' })
  })

  it('모든 변경은 상품 버전을 검사한다(없으면 428, 다르면 409와 현재 버전)하고 거부되면 바꾸지 않는다', () => {
    expect(failure(store.linkOptionGroup(12, 3, 3))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT', currentVersion: 4 })
    expect(failure(store.unlinkOptionGroup(12, null, 1))).toMatchObject({ status: 428, code: 'VERSION_REQUIRED' })
    expect(failure(store.reorderOptionGroups(12, 1, [2, 1]))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
    expect(failure(store.setOptionOverride(12, 1, 1, 'REGULAR', { type: 'EXCLUDE' }))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
    expect(failure(store.clearOptionOverride(12, 1, 1, 'LARGE'))).toMatchObject({ status: 409, code: 'VERSION_CONFLICT' })
    expect(links(12).map((link) => link.optionGroupId)).toEqual([1, 2])
    expect(store.products().find((product) => product.id === 12)?.version).toBe(4)
  })

  it('해제하면 그 연결의 예외도 함께 사라지고 다시 연결해도 복원되지 않는다', () => {
    expect(store.unlinkOptionGroup(12, 4, 1)).toMatchObject({ ok: true, product: { version: 5 } })
    expect(links(12).map((link) => link.optionGroupId)).toEqual([2])
    store.linkOptionGroup(12, 5, 1)
    expect(links(12).find((link) => link.optionGroupId === 1)?.overrides).toEqual([])
    expect(failure(store.unlinkOptionGroup(12, 6, 3))).toMatchObject({ status: 404, code: 'PRODUCT_OPTION_GROUP_NOT_LINKED' })
  })

  it('노출 순서는 연결된 전체를 한 번씩 담아야 바꿀 수 있다', () => {
    expect(store.reorderOptionGroups(12, 4, [2, 1])).toMatchObject({ ok: true })
    expect(links(12).map((link) => link.optionGroupId)).toEqual([2, 1])
    expect(links(12)[1].overrides).toHaveLength(2)
    expect(failure(store.reorderOptionGroups(12, 5, [2]))).toMatchObject({ status: 400, code: 'INVALID_OPTION_GROUP_ORDER' })
    expect(failure(store.reorderOptionGroups(12, 5, [2, 2]))).toMatchObject({ status: 400, code: 'INVALID_OPTION_GROUP_ORDER' })
    expect(failure(store.reorderOptionGroups(12, 5, [2, 3]))).toMatchObject({ status: 404, code: 'PRODUCT_OPTION_GROUP_NOT_LINKED' })
  })
})

describe('상품의 옵션 예외', () => {
  const overridesOf = (productId: number, groupId: number) => store.products().find((product) => product.id === productId)?.optionGroups.find((link) => link.optionGroupId === groupId)?.overrides

  it('가격 예외를 추가하고 같은 키의 기존 예외는 대체한다', () => {
    expect(store.setOptionOverride(12, 4, 1, 'REGULAR', { type: 'PRICE', price: 100 })).toMatchObject({ ok: true })
    expect(store.setOptionOverride(12, 5, 1, 'LARGE', { type: 'PRICE', price: 900 })).toMatchObject({ ok: true })

    expect(overridesOf(12, 1)).toEqual(expect.arrayContaining([{ optionKey: 'REGULAR', type: 'PRICE', price: 100 }, { optionKey: 'LARGE', type: 'PRICE', price: 900 }]))
    expect(overridesOf(12, 1)?.filter((override) => override.optionKey === 'LARGE')).toHaveLength(1)
  })

  it('다른 옵션 그룹의 옵션에도 가격 예외를 지정할 수 있다', () => {
    store.setOptionOverride(12, 4, 2, 'SHOT', { type: 'PRICE', price: 100 })
    expect(overridesOf(12, 2)).toEqual([{ optionKey: 'SHOT', type: 'PRICE', price: 100 }])
  })

  it('음수 가격·없는 옵션 키·연결되지 않은 그룹을 거부한다', () => {
    expect(failure(store.setOptionOverride(12, 4, 1, 'REGULAR', { type: 'PRICE', price: -1 }))).toMatchObject({ status: 400, code: 'INVALID_MONEY_AMOUNT' })
    expect(failure(store.setOptionOverride(12, 4, 1, 'NOPE', { type: 'EXCLUDE' }))).toMatchObject({ status: 404, code: 'OPTION_KEY_NOT_FOUND' })
    expect(failure(store.setOptionOverride(12, 4, 3, 'HOT', { type: 'EXCLUDE' }))).toMatchObject({ status: 404, code: 'PRODUCT_OPTION_GROUP_NOT_LINKED' })
    expect(failure(store.setOptionOverride(12, 4, 99, 'HOT', { type: 'EXCLUDE' }))).toMatchObject({ status: 404, code: 'OPTION_GROUP_NOT_FOUND' })
  })

  it('제외로 선택 가능한 옵션이 0개가 되면 거부한다', () => {
    // 상품 12는 이미 XLARGE를 제외했다. REGULAR를 제외하면 LARGE가 남고, LARGE까지 제외하면 0개다.
    expect(store.setOptionOverride(12, 4, 1, 'REGULAR', { type: 'EXCLUDE' })).toMatchObject({ ok: true })
    expect(failure(store.setOptionOverride(12, 5, 1, 'LARGE', { type: 'EXCLUDE' }))).toMatchObject({ status: 422, code: 'NO_SELECTABLE_OPTION' })
    expect(store.products().find((product) => product.id === 12)?.version).toBe(5)
  })

  it('옵션이 하나뿐인 그룹은 그 옵션을 제외할 수 없다', () => {
    expect(failure(store.setOptionOverride(12, 4, 2, 'SHOT', { type: 'EXCLUDE' }))).toMatchObject({ status: 422, code: 'NO_SELECTABLE_OPTION' })
  })

  it('예외를 해제하면 그 옵션만 지워진다', () => {
    expect(store.clearOptionOverride(12, 4, 1, 'LARGE')).toMatchObject({ ok: true, product: { version: 5 } })
    expect(overridesOf(12, 1)).toEqual([{ optionKey: 'XLARGE', type: 'EXCLUDE', price: null }])
    expect(failure(store.clearOptionOverride(12, 5, 3, 'HOT'))).toMatchObject({ status: 404, code: 'PRODUCT_OPTION_GROUP_NOT_LINKED' })
  })
})

describe('유효 옵션 구성', () => {
  const effective = (productId: number) => (store.effectiveOptions(productId) as { ok: true; value: import('../features/catalog/model/catalogSchemas').EffectiveOptions }).value

  it('제외한 옵션은 빠지고 가격 예외는 반영하며 선택 그룹은 시작가에 더하지 않는다', () => {
    const result = effective(12)

    expect(result.groups.map((group) => group.name)).toEqual(['사이즈', '샷 추가'])
    expect(result.groups[0].options).toEqual([
      { optionKey: 'REGULAR', name: '레귤러', price: 0, priceOverridden: false },
      { optionKey: 'LARGE', name: '라지', price: 700, priceOverridden: true },
    ])
    expect(result.displayStartingPrice).toBe(4500)
  })

  it('필수 그룹의 시작가는 유효 옵션 중 최저가를 기준가에 더한다', () => {
    store.setOptionOverride(12, 4, 1, 'REGULAR', { type: 'PRICE', price: 300 })

    expect(effective(12).displayStartingPrice).toBe(4800)
  })

  it('필수 그룹에 유효 옵션이 1개 남으면 자동 선택으로 표시한다', () => {
    store.setOptionOverride(12, 4, 1, 'REGULAR', { type: 'EXCLUDE' })

    const size = effective(12).groups[0]
    expect(size.options.map((option) => option.optionKey)).toEqual(['LARGE'])
    expect(size.autoSelectedOptionKey).toBe('LARGE')
    expect(effective(12).displayStartingPrice).toBe(5200)
  })

  it('옵션 그룹이 없는 상품은 기준가가 시작가다', () => {
    expect(effective(14)).toMatchObject({ groups: [], displayStartingPrice: 24000 })
    expect(failure(store.effectiveOptions(99))).toMatchObject({ status: 404, code: 'PRODUCT_NOT_FOUND' })
  })
})
