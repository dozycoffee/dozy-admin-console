import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { Category, OptionGroup, Product, ProductGroup, Tag } from '../../features/catalog/model/catalogSchemas'
import { useCreateOptionGroup, useReplaceOptions, useUpdateOptionGroup } from '../../features/catalog/model/useOptionGroupMutations'
import { useCreateProduct, useUpdateProduct } from '../../features/catalog/model/useProductMutations'
import { Modal } from '../../shared/ui/Modal'
import { ProductForm } from './ProductForm'

vi.mock('../../features/catalog/model/useProductMutations')
vi.mock('../../features/catalog/model/useOptionGroupMutations')

const categories: Category[] = [
  { id: 1, name: '음료', parentId: null }, { id: 2, name: '비어 있는 대분류', parentId: null }, { id: 5, name: '커피', parentId: 1 }, { id: 6, name: '티', parentId: 1 },
]
const tags: Tag[] = [{ id: 1, name: '신메뉴' }, { id: 2, name: '베스트' }, { id: 3, name: '시즌한정' }]
const groups: ProductGroup[] = [{ id: 1, name: '여름 시즌' }, { id: 2, name: '겨울 시즌' }]
const optionGroups: OptionGroup[] = [
  { id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, options: [], version: 1 },
  { id: 8, name: '샷 추가', selectionType: 'MULTI', required: false, options: [], version: 1 },
]
const existing: Product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'ACTIVE', categoryId: 5, description: '산미가 적은 원두', imageUrl: null, basePrice: 4500, tracksInventory: true,
  tagIds: [3], groupIds: [2], storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [{ optionGroupId: 7, overrides: [] }], version: 4,
}

const createMutate = vi.fn()
const updateMutate = vi.fn()
const onDone = vi.fn()
const onCancel = vi.fn()
const onConflict = vi.fn()
const idle = { isPending: false, isError: false, error: null }
const createGroup = vi.fn()

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useCreateProduct).mockReturnValue({ ...idle, mutate: createMutate } as never)
  vi.mocked(useUpdateProduct).mockReturnValue({ ...idle, mutate: updateMutate } as never)
  createGroup.mockResolvedValue({ id: 9, name: '시럽', selectionType: 'SINGLE', required: true, version: 1, options: [{ optionKey: 'VANILLA', name: '바닐라', price: 300 }] })
  vi.mocked(useCreateOptionGroup).mockReturnValue({ mutateAsync: createGroup } as never)
  vi.mocked(useReplaceOptions).mockReturnValue({ mutateAsync: vi.fn() } as never)
  vi.mocked(useUpdateOptionGroup).mockReturnValue({ mutateAsync: vi.fn() } as never)
})

const renderCreate = () => render(<ProductForm categories={categories} tags={tags} groups={groups} optionGroups={optionGroups} onDone={onDone} onCancel={onCancel} onConflict={onConflict} />)
const renderEdit = () => render(<ProductForm product={existing} initialTagNames={['베스트']} categories={categories} tags={tags} groups={groups} optionGroups={optionGroups} onDone={onDone} onCancel={onCancel} onConflict={onConflict} />)

describe('ProductForm 등록', () => {
  it('입력을 정리해 등록 요청으로 보낸다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('상품명'), '  콜드브루 ')
    await user.selectOptions(screen.getByLabelText('카테고리'), '커피')
    await user.type(screen.getByLabelText('기준가 (원)'), '5000')
    await user.click(screen.getByLabelText(/^재고형/))
    await user.click(screen.getByRole('button', { name: '신메뉴' }))
    await user.type(screen.getByLabelText('태그 이름 입력'), '  말차 {Enter}')
    await user.click(screen.getByLabelText('겨울 시즌'))
    await user.click(screen.getByLabelText(/샷 추가/))
    await user.click(screen.getByLabelText(/사이즈/))
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }))

    expect(createMutate).toHaveBeenCalledWith({
      name: '콜드브루', categoryId: 5, basePrice: 5000, description: null, imageUrl: null, tagNames: ['신메뉴', '말차'], groupIds: [2], tracksInventory: true, optionGroupIds: [8, 7],
    }, expect.any(Object))
  })

  it('옵션 그룹은 선택한 순서가 노출 순서이며 몇 번째인지 보여준다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.click(screen.getByLabelText(/샷 추가/))
    await user.click(screen.getByLabelText(/사이즈/))

    expect(screen.getByText('1번째')).toBeInTheDocument()
    expect(screen.getByText('2번째')).toBeInTheDocument()
  })

  it('소분류만 고를 수 있고 소분류가 없는 대분류는 선택지에 없다', () => {
    renderCreate()

    expect(screen.getByRole('option', { name: '커피' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '음료' })).not.toBeInTheDocument()
    expect(screen.queryByText('비어 있는 대분류')).not.toBeInTheDocument()
  })

  it('필수 입력이 비면 요청하지 않고 필드 아래에 안내하며 첫 오류 필드로 포커스를 옮긴다', async () => {
    renderCreate()

    await userEvent.setup().click(screen.getByRole('button', { name: '상품 등록하기' }))

    expect(createMutate).not.toHaveBeenCalled()
    expect(screen.getByText('상품명을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('카테고리를 선택하세요.')).toBeInTheDocument()
    expect(screen.getByText('기준가를 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('상품명')).toHaveFocus()
    expect(screen.getByLabelText('상품명')).toHaveAttribute('aria-invalid', 'true')
  })

  it('입력 중에는 오류를 띄우지 않고 필드를 벗어나면 보여준다', async () => {
    renderCreate()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('기준가 (원)'), '45a')
    expect(screen.queryByText(/0 이상의 정수/)).not.toBeInTheDocument()

    await user.tab()
    expect(screen.getByText(/0 이상의 정수/)).toBeInTheDocument()
  })

  it('소분류가 하나도 없으면 안내하고 등록하지 못하게 한다', () => {
    render(<ProductForm categories={[{ id: 1, name: '음료', parentId: null }]} tags={tags} groups={groups} optionGroups={optionGroups} onDone={onDone} onCancel={onCancel} onConflict={onConflict} />)

    expect(screen.getByRole('alert')).toHaveTextContent('지정할 수 있는 소분류가 없어')
    expect(screen.getByRole('button', { name: '상품 등록하기' })).toBeDisabled()
  })

  it('재고 관리 여부를 등록 후 바꿀 수 없다고 안내한다', () => {
    renderCreate()

    expect(screen.getByText('재고 관리 여부는 등록한 뒤에는 바꿀 수 없습니다.')).toBeInTheDocument()
  })

  it('서버 오류는 code별 안내로 폼 안에 보여준다', () => {
    vi.mocked(useCreateProduct).mockReturnValue({ ...idle, mutate: createMutate, isError: true, error: new ApiError('x', { status: 400, code: 'CATEGORY_NOT_ASSIGNABLE' }) } as never)
    renderCreate()

    expect(screen.getByRole('alert')).toHaveTextContent('소분류만 선택할 수 있습니다.')
  })

  it('저장하는 동안에는 입력과 버튼을 막는다', () => {
    vi.mocked(useCreateProduct).mockReturnValue({ ...idle, mutate: createMutate, isPending: true } as never)
    renderCreate()

    expect(screen.getByRole('button', { name: '저장 중...' })).toBeDisabled()
    expect(screen.getByLabelText('상품명')).toBeDisabled()
  })

  it('취소하면 닫는다', async () => {
    renderCreate()

    await userEvent.setup().click(screen.getByRole('button', { name: '취소' }))

    expect(onCancel).toHaveBeenCalled()
  })
})

describe('ProductForm 수정', () => {
  it('현재 값을 채우고 재고 관리·옵션 그룹 입력은 보이지 않는다', () => {
    renderEdit()

    expect(screen.getByLabelText('상품명')).toHaveValue('아이스 아메리카노')
    expect(screen.getByLabelText('카테고리')).toHaveValue('5')
    expect(screen.getByLabelText('기준가 (원)')).toHaveValue('4500')
    expect(screen.getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: '신메뉴' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByLabelText('겨울 시즌')).toBeChecked()
    expect(screen.queryByText('재고 관리')).not.toBeInTheDocument()
    expect(screen.queryByText('옵션 그룹 (선택)')).not.toBeInTheDocument()
  })

  it('보던 버전과 함께 값 전체를 보낸다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('기준가 (원)'))
    await user.type(screen.getByLabelText('기준가 (원)'), '4800')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMutate).toHaveBeenCalledWith({
      productId: 12, version: 4,
      body: { name: '아이스 아메리카노', categoryId: 5, basePrice: 4800, description: '산미가 적은 원두', imageUrl: null, tagNames: ['베스트'], groupIds: [2] },
    }, expect.any(Object))
    expect(createMutate).not.toHaveBeenCalled()
  })

  it('설명을 비우면 null로 보내 값을 지운다', async () => {
    renderEdit()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('설명 (선택)'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(updateMutate).toHaveBeenCalledWith(expect.objectContaining({ body: expect.objectContaining({ description: null }) }), expect.any(Object))
  })

  it('성공하면 저장된 상품을 넘긴다', async () => {
    updateMutate.mockImplementation((_variables, handlers) => handlers.onSuccess({ ...existing, version: 5 }))
    renderEdit()

    await userEvent.setup().click(screen.getByRole('button', { name: '저장' }))

    expect(onDone).toHaveBeenCalledWith(expect.objectContaining({ version: 5 }))
  })

  it('버전 충돌(409 VERSION_CONFLICT)이면 폼에 오류를 쓰지 않고 충돌을 알려 화면이 처리하게 한다', async () => {
    const conflict = new ApiError('x', { status: 409, code: 'VERSION_CONFLICT' })
    updateMutate.mockImplementation((_variables, handlers) => handlers.onError(conflict))
    vi.mocked(useUpdateProduct).mockReturnValue({ ...idle, mutate: updateMutate, isError: true, error: conflict } as never)
    renderEdit()

    await userEvent.setup().click(screen.getByRole('button', { name: '저장' }))

    expect(onConflict).toHaveBeenCalled()
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('버전 충돌이 아닌 오류는 충돌로 처리하지 않는다', async () => {
    updateMutate.mockImplementation((_variables, handlers) => handlers.onError(new ApiError('x', { status: 404, code: 'PRODUCT_NOT_FOUND' })))
    renderEdit()

    await userEvent.setup().click(screen.getByRole('button', { name: '저장' }))

    expect(onConflict).not.toHaveBeenCalled()
  })
})

describe('ProductForm 새 옵션 그룹 만들기', () => {
  async function fillNewGroup(user: ReturnType<typeof userEvent.setup>) {
    await user.click(screen.getByRole('button', { name: '새 옵션 그룹 만들기' }))
    const dialog = screen.getByRole('dialog', { name: '새 옵션 그룹' })
    await user.type(within(dialog).getByLabelText('이름'), '시럽')
    await user.type(within(dialog).getByLabelText('옵션 1 키'), 'VANILLA')
    await user.type(within(dialog).getByLabelText('옵션 1 이름'), '바닐라')
    return dialog
  }

  it('등록 폼에만 있고 수정 폼에는 없다', () => {
    const { unmount } = renderCreate()
    expect(screen.getByRole('button', { name: '새 옵션 그룹 만들기' })).toBeInTheDocument()
    unmount()

    renderEdit()
    expect(screen.queryByRole('button', { name: '새 옵션 그룹 만들기' })).not.toBeInTheDocument()
  })

  it('만든 옵션 그룹을 상품에 연결할 그룹으로 바로 고르고, 이 일로 상품이 같이 등록되지는 않는다', async () => {
    renderCreate()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('상품명'), '바닐라 라떼')
    await user.selectOptions(screen.getByLabelText('카테고리'), '커피')
    await user.type(screen.getByLabelText('기준가 (원)'), '5500')

    const dialog = await fillNewGroup(user)
    await user.click(within(dialog).getByRole('button', { name: '옵션 그룹 등록하기' }))

    expect(createGroup).toHaveBeenCalledWith({ name: '시럽', selectionType: 'SINGLE', required: true, options: [{ optionKey: 'VANILLA', name: '바닐라', price: 0 }] })
    expect(screen.queryByRole('dialog', { name: '새 옵션 그룹' })).not.toBeInTheDocument()
    expect(createMutate).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: '상품 등록하기' }))
    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ name: '바닐라 라떼', optionGroupIds: [9] }), expect.any(Object))
  })

  it('이미 고른 옵션 그룹 뒤에 붙는다', async () => {
    renderCreate()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('상품명'), '바닐라 라떼')
    await user.selectOptions(screen.getByLabelText('카테고리'), '커피')
    await user.type(screen.getByLabelText('기준가 (원)'), '5500')
    await user.click(screen.getByLabelText(/샷 추가/))

    const dialog = await fillNewGroup(user)
    await user.click(within(dialog).getByRole('button', { name: '옵션 그룹 등록하기' }))
    await user.click(screen.getByRole('button', { name: '상품 등록하기' }))

    expect(createMutate).toHaveBeenCalledWith(expect.objectContaining({ optionGroupIds: [8, 9] }), expect.any(Object))
  })

  it('취소하면 옵션 그룹 모달만 닫고 입력 중이던 상품 폼은 그대로다', async () => {
    renderCreate()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('상품명'), '바닐라 라떼')

    await user.click(screen.getByRole('button', { name: '새 옵션 그룹 만들기' }))
    await user.click(within(screen.getByRole('dialog', { name: '새 옵션 그룹' })).getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog', { name: '새 옵션 그룹' })).not.toBeInTheDocument()
    expect(screen.getByLabelText('상품명')).toHaveValue('바닐라 라떼')
  })

  it('Esc는 맨 위의 옵션 그룹 모달만 닫고 상품 등록 모달은 닫지 않는다', async () => {
    const onOuterClose = vi.fn()
    render(<Modal open title="상품 등록" onClose={onOuterClose}><ProductForm categories={categories} tags={tags} groups={groups} optionGroups={optionGroups} onDone={onDone} onCancel={onCancel} onConflict={onConflict} /></Modal>)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '새 옵션 그룹 만들기' }))
    await user.keyboard('{Escape}')

    expect(screen.queryByRole('dialog', { name: '새 옵션 그룹' })).not.toBeInTheDocument()
    expect(onOuterClose).not.toHaveBeenCalled()
    expect(screen.getByRole('dialog', { name: '상품 등록' })).toBeInTheDocument()
  })
})
