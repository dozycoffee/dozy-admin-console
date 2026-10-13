import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { Product } from '../../features/catalog/model/catalogSchemas'
import { useCategories, useOptionGroups, useProductGroups, useProducts, useTags } from '../../features/catalog/model/useCatalog'
import { ProductsPage } from './ProductsPage'

vi.mock('../../features/catalog/model/useCatalog')

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
  vi.mocked(useOptionGroups).mockReturnValue({ data: [{ id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, options: [], version: 2 }] } as never)
}

beforeEach(() => vi.clearAllMocks())

describe('ProductsPage', () => {
  it('상품 목록과 첫 상품의 상세를 이름을 붙여 보여준다', () => {
    setup()
    render(<ProductsPage />)

    expect(screen.getByRole('heading', { name: '상품 관리' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /아이스 아메리카노/ })).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' })).toBeInTheDocument()
    const detail = screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' }).closest('section')!
    expect(within(detail).getByText('DZ-00000012')).toBeInTheDocument()
    expect(within(detail).getByText('음료 > 커피')).toBeInTheDocument()
    expect(within(detail).getByText('4,500원')).toBeInTheDocument()
    expect(within(detail).getByText('베스트')).toBeInTheDocument()
    expect(within(detail).getByText('여름 시즌')).toBeInTheDocument()
    expect(within(detail).getByText('사이즈')).toBeInTheDocument()
    expect(within(detail).getByText(/LARGE 700원, XLARGE 제외/)).toBeInTheDocument()
    expect(within(detail).getByText(/지정한 2개 매장에서만 판매합니다/)).toBeInTheDocument()
    expect(within(detail).getByText('버전 4')).toBeInTheDocument()
  })

  it('다른 상품을 선택하면 상세가 바뀌고 SKU·분류가 없는 상품도 보여준다', async () => {
    setup()
    render(<ProductsPage />)

    await userEvent.setup().click(screen.getByRole('button', { name: /텀블러/ }))

    const detail = screen.getByRole('heading', { level: 2, name: '텀블러' }).closest('section')!
    expect(within(detail).getByText('MD > 굿즈')).toBeInTheDocument()
    expect(within(detail).getByText('모든 매장에서 판매합니다.')).toBeInTheDocument()
    expect(within(detail).getByText('연결된 옵션 그룹이 없습니다.')).toBeInTheDocument()
    expect(within(detail).getByText('재고형')).toBeInTheDocument()
  })

  it('필터를 바꾸면 1페이지로 돌아가 조건을 조회에 넘긴다', async () => {
    setup([americano], 3)
    render(<ProductsPage />)
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
    render(<ProductsPage />)

    expect(screen.getByText('조건에 맞는 상품이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('선택한 상품이 없습니다')).toBeInTheDocument()
  })

  it('목록 조회가 실패하면 code별 안내를 보여준다', () => {
    vi.mocked(useProducts).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined } as never)
    vi.mocked(useCategories).mockReturnValue({} as never)
    vi.mocked(useTags).mockReturnValue({} as never)
    vi.mocked(useProductGroups).mockReturnValue({} as never)
    vi.mocked(useOptionGroups).mockReturnValue({} as never)
    render(<ProductsPage />)

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('분류를 아직 못 불러왔거나 삭제된 id는 #id로 보여준다', () => {
    setup([{ ...americano, tagIds: [99], groupIds: [98] }])
    render(<ProductsPage />)

    const detail = screen.getByRole('heading', { level: 2, name: '아이스 아메리카노' }).closest('section')!
    expect(within(detail).getByText('#99')).toBeInTheDocument()
    expect(within(detail).getByText('#98')).toBeInTheDocument()
  })
})
