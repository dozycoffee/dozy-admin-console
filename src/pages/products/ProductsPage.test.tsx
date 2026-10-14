import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { Product } from '../../features/catalog/model/catalogSchemas'
import { useCategories, useOptionGroups, useProductGroups, useProducts, useTags } from '../../features/catalog/model/useCatalog'
import { useClearOptionOverride, useLinkOptionGroup, useReorderOptionGroups, useSetOptionOverride, useUnlinkOptionGroup } from '../../features/catalog/model/useProductOptionMutations'
import { useActivateProduct, useCreateProduct, useDeleteProduct, useDiscontinueProduct, useUpdateProduct } from '../../features/catalog/model/useProductMutations'
import { ProductsPage } from './ProductsPage'

vi.mock('../../features/catalog/model/useCatalog')
vi.mock('../../features/catalog/model/useProductMutations')
vi.mock('../../features/catalog/model/useProductOptionMutations')

const activate = vi.fn()
const discontinue = vi.fn()
const remove = vi.fn()
const create = vi.fn()
const idle = { isPending: false, isError: false, error: null, reset: vi.fn() }

function renderPage(granted: Permission[] = [permissions.catalogRead, permissions.catalogWrite]) {
  return render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastProvider><ProductsPage /></ToastProvider>
    </AuthContext.Provider>,
  )
}

const americano: Product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'ACTIVE', categoryId: 5, description: '산미가 적은 원두', imageUrl: null, basePrice: 4500, tracksInventory: false,
  tagIds: [3], groupIds: [2], storeScope: { kind: 'LIMITED', targetStoreIds: [101, 102] },
  optionGroups: [{ optionGroupId: 7, overrides: [{ optionKey: 'LARGE', type: 'PRICE', price: 700 }, { optionKey: 'XLARGE', type: 'EXCLUDE', price: null }] }], version: 4,
}
const tumbler: Product = { ...americano, id: 13, sku: null, name: '텀블러', status: 'DRAFT', categoryId: 6, tagIds: [], groupIds: [], tracksInventory: true, storeScope: { kind: 'ALL', targetStoreIds: [] }, optionGroups: [], description: null, version: 1 }

function setup(content: Product[] = [americano, tumbler], totalPages = 1) {
  vi.mocked(useProducts).mockReturnValue({ isLoading: false, isError: false, data: { content, page: 0, size: 10, totalElements: content.length, totalPages } } as never)
  vi.mocked(useCategories).mockReturnValue({ data: [{ id: 1, name: '음료', parentId: null }, { id: 5, name: '커피', parentId: 1 }, { id: 2, name: 'MD', parentId: null }, { id: 6, name: '굿즈', parentId: 2 }] } as never)
  vi.mocked(useTags).mockReturnValue({ data: [{ id: 3, name: '베스트' }] } as never)
  vi.mocked(useProductGroups).mockReturnValue({ data: [{ id: 2, name: '여름 시즌' }] } as never)
  vi.mocked(useOptionGroups).mockReturnValue({ data: [{ id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 500 }, { optionKey: 'XLARGE', name: '엑스라지', price: 1000 }], version: 2 }] } as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useActivateProduct).mockReturnValue({ ...idle, mutate: activate } as never)
  vi.mocked(useDiscontinueProduct).mockReturnValue({ ...idle, mutate: discontinue } as never)
  vi.mocked(useDeleteProduct).mockReturnValue({ ...idle, mutate: remove } as never)
  vi.mocked(useCreateProduct).mockReturnValue({ ...idle, mutate: create } as never)
  vi.mocked(useUpdateProduct).mockReturnValue({ ...idle, mutate: vi.fn() } as never)
  for (const hook of [useLinkOptionGroup, useUnlinkOptionGroup, useReorderOptionGroups, useSetOptionOverride, useClearOptionOverride]) vi.mocked(hook).mockReturnValue({ ...idle, mutate: vi.fn() } as never)
})

describe('ProductsPage', () => {
  it('상품 목록과 첫 상품의 상세를 이름을 붙여 보여준다', () => {
    setup()
    renderPage()

    expect(screen.getByRole('heading', { name: '상품 관리' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /아이스 아메리카노/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' })).toBeInTheDocument()
    const detail = screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' }).closest('section')!
    expect(within(detail).getByText('DZ-00000012')).toBeInTheDocument()
    expect(within(detail).getByText('음료 > 커피')).toBeInTheDocument()
    expect(within(detail).getByText('4,500원')).toBeInTheDocument()
    expect(within(detail).getByText('베스트')).toBeInTheDocument()
    expect(within(detail).getByText('여름 시즌')).toBeInTheDocument()
    expect(within(detail).getByText('1. 사이즈')).toBeInTheDocument()
    expect(within(detail).getByText('가격 변경 700원')).toBeInTheDocument()
    expect(within(detail).getByText('제외')).toBeInTheDocument()
    expect(within(detail).getByText(/지정한 2개 매장에서만 판매합니다/)).toBeInTheDocument()
    expect(within(detail).getByText('버전 4')).toBeInTheDocument()
  })

  it('다른 상품을 선택하면 상세가 바뀌고 SKU·분류가 없는 상품도 보여준다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(screen.getByRole('button', { name: /텀블러/ }))

    const detail = screen.getByRole('heading', { level: 2, name: '텀블러' }).closest('section')!
    expect(within(detail).getByText('MD > 굿즈')).toBeInTheDocument()
    expect(within(detail).getByText('모든 매장에서 판매합니다.')).toBeInTheDocument()
    expect(within(detail).getByText('연결된 옵션 그룹이 없습니다.')).toBeInTheDocument()
    expect(within(detail).getByText('재고형')).toBeInTheDocument()
  })

  it('필터를 바꾸면 1페이지로 돌아가 조건을 조회에 넘긴다', async () => {
    setup([americano], 3)
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(vi.mocked(useProducts)).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))

    await user.selectOptions(screen.getByLabelText('상태'), 'DRAFT')
    await user.selectOptions(screen.getByLabelText('카테고리'), '5')
    await user.selectOptions(screen.getByLabelText('태그'), '3')
    await user.selectOptions(screen.getByLabelText('상품 그룹'), '2')
    await user.type(screen.getByLabelText('상품명·SKU'), '아메')
    await user.click(screen.getByRole('button', { name: '검색' }))

    expect(vi.mocked(useProducts)).toHaveBeenLastCalledWith({ keyword: '아메', status: 'DRAFT', categoryId: 5, tagId: 3, groupId: 2, page: 0, size: 10 })
  })

  it('조건에 맞는 상품이 없으면 안내한다', () => {
    setup([])
    renderPage()

    expect(screen.getByText('조건에 맞는 상품이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('선택한 상품이 없습니다')).toBeInTheDocument()
  })

  it('목록 조회가 실패하면 code별 안내를 보여준다', () => {
    vi.mocked(useProducts).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined } as never)
    vi.mocked(useCategories).mockReturnValue({} as never)
    vi.mocked(useTags).mockReturnValue({} as never)
    vi.mocked(useProductGroups).mockReturnValue({} as never)
    vi.mocked(useOptionGroups).mockReturnValue({} as never)
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('분류를 아직 못 불러왔거나 삭제된 id는 #id로 보여준다', () => {
    setup([{ ...americano, tagIds: [99], groupIds: [98] }])
    renderPage()

    const detail = screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' }).closest('section')!
    expect(within(detail).getByText('#99')).toBeInTheDocument()
    expect(within(detail).getByText('#98')).toBeInTheDocument()
  })
})

const detailOf = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!

describe('ProductsPage 쓰기', () => {
  it('catalog.write가 있으면 상품 등록 버튼이 있고 없으면 없다', () => {
    setup()
    const { unmount } = renderPage()
    expect(screen.getByRole('button', { name: '상품 등록' })).toBeInTheDocument()
    unmount()

    renderPage([permissions.catalogRead])
    expect(screen.queryByRole('button', { name: '상품 등록' })).not.toBeInTheDocument()
  })

  it('조회 권한만 있으면 작업 버튼이 모두 비활성이고 권한 사유를 알려 준다', async () => {
    setup()
    renderPage([permissions.catalogRead])
    const detail = within(detailOf('아이스 아메리카노'))

    for (const label of ['정보 수정', '활성화', '단종', '삭제']) expect(detail.getByRole('button', { name: label })).toBeDisabled()
    // 비활성 버튼마다 같은 사유를 툴팁으로 단다(상품 작업 4개 + 옵션 그룹 구역의 버튼들)
    expect((await screen.findAllByText('상품을 변경할 권한이 없습니다.')).length).toBeGreaterThanOrEqual(4)
  })

  it('판매중 상품은 단종만 할 수 있고 활성화와 삭제는 사유와 함께 막힌다', async () => {
    setup()
    renderPage()
    const detail = within(detailOf('아이스 아메리카노'))

    expect(detail.getByRole('button', { name: '정보 수정' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '단종' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '활성화' })).toBeDisabled()
    expect(detail.getByRole('button', { name: '삭제' })).toBeDisabled()
    await userEvent.setup().hover(detail.getByRole('button', { name: '삭제' }).parentElement!)
    expect(await screen.findByText('판매 대기 상태의 상품만 삭제할 수 있습니다.')).toBeInTheDocument()
  })

  it('판매 대기 상품은 활성화·삭제할 수 있고 단종은 막힌다', () => {
    setup([tumbler])
    renderPage()
    const detail = within(detailOf('텀블러'))

    expect(detail.getByRole('button', { name: '활성화' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '삭제' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '단종' })).toBeDisabled()
  })

  it('단종된 상품은 다시 활성화할 수 있고 정보 수정도 할 수 있다', () => {
    setup([{ ...tumbler, status: 'DISCONTINUED' }])
    renderPage()
    const detail = within(detailOf('텀블러'))

    expect(detail.getByRole('button', { name: '활성화' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '정보 수정' })).toBeEnabled()
    expect(detail.getByRole('button', { name: '단종' })).toBeDisabled()
  })

  it('단종은 확인 모달을 거친 뒤에만 요청한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('아이스 아메리카노')).getByRole('button', { name: '단종' }))
    expect(discontinue).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: '상품을 단종할까요?' })
    await user.click(within(dialog).getByRole('button', { name: '단종' }))

    expect(discontinue).toHaveBeenCalledWith(12, expect.any(Object))
  })

  it('확인 모달에서 취소하면 요청하지 않는다', async () => {
    setup([tumbler])
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('텀블러')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(remove).not.toHaveBeenCalled()
  })

  it('활성화·삭제도 확인 후 요청하고 성공하면 토스트로 알린다', async () => {
    activate.mockImplementation((_id, handlers) => handlers.onSuccess())
    remove.mockImplementation((_id, handlers) => handlers.onSuccess())
    setup([tumbler])
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('텀블러')).getByRole('button', { name: '활성화' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '활성화' }))
    expect(activate).toHaveBeenCalledWith(13, expect.any(Object))
    expect(await screen.findByText('상품을 활성화했습니다.')).toBeInTheDocument()

    await user.click(within(detailOf('텀블러')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '삭제' }))
    expect(remove).toHaveBeenCalledWith(13, expect.any(Object))
    expect(await screen.findByText('상품을 삭제했습니다.')).toBeInTheDocument()
  })

  it('작업이 실패하면 code별 안내를 상세 안에 보여준다', () => {
    vi.mocked(useDiscontinueProduct).mockReturnValue({ ...idle, mutate: discontinue, isError: true, error: new ApiError('x', { status: 409, code: 'INVALID_PRODUCT_STATUS_TRANSITION' }) } as never)
    setup()
    renderPage()

    expect(within(detailOf('아이스 아메리카노')).getByRole('alert')).toHaveTextContent('현재 상태에서는 할 수 없는 작업입니다.')
  })

  it('태그를 아직 못 받았으면 수정을 막는다', async () => {
    setup()
    vi.mocked(useTags).mockReturnValue({} as never)
    renderPage()
    const edit = within(detailOf('아이스 아메리카노')).getByRole('button', { name: '정보 수정' })

    expect(edit).toBeDisabled()
    await userEvent.setup().hover(edit.parentElement!)
    expect(await screen.findByText('태그 정보를 불러오는 중입니다.')).toBeInTheDocument()
  })

  it('정보 수정은 모달에서 현재 값(태그 이름 포함)을 채워 연다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(within(detailOf('아이스 아메리카노')).getByRole('button', { name: '정보 수정' }))

    const dialog = screen.getByRole('dialog', { name: '상품 수정 · 아이스 아메리카노' })
    expect(within(dialog).getByLabelText('상품명')).toHaveValue('아이스 아메리카노')
    expect(within(dialog).getByRole('button', { name: '베스트' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('등록에 성공하면 필터를 풀고 1페이지에서 새 상품을 선택해 안내한다', async () => {
    const created = { ...americano, id: 99, sku: 'DZ-00000099', name: '새 상품', status: 'DRAFT' as const }
    create.mockImplementation((_body, handlers) => handlers.onSuccess(created))
    setup([created, americano])
    renderPage()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('상태'), 'DRAFT')
    await user.click(screen.getByRole('button', { name: '상품 등록' }))
    const dialog = screen.getByRole('dialog', { name: '상품 등록' })
    await user.type(within(dialog).getByLabelText('상품명'), '새 상품')
    await user.selectOptions(within(dialog).getByLabelText('카테고리'), '커피')
    await user.type(within(dialog).getByLabelText('기준가 (원)'), '4000')
    await user.click(within(dialog).getByRole('button', { name: '상품 등록하기' }))

    expect(await screen.findByText(/상품을 등록했습니다.*DZ-00000099/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '상품 등록' })).not.toBeInTheDocument()
    expect(vi.mocked(useProducts)).toHaveBeenLastCalledWith({ keyword: '', status: undefined, categoryId: undefined, tagId: undefined, groupId: undefined, page: 0, size: 10 })
    expect(screen.getByLabelText('상태')).toHaveValue('')
    expect(screen.getByRole('heading', { level: 2, name: '새 상품' })).toBeInTheDocument()
  })
})
