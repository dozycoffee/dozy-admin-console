import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Material } from '../../features/material/model/materialSchemas'
import { useMaterialSearch } from '../../features/material/model/useMaterials'
import type { Warehouse } from '../../features/warehouse/model/warehouseSchemas'
import { StockFilterForm } from './StockFilterForm'

vi.mock('../../features/material/model/useMaterials', () => ({ useMaterialSearch: vi.fn() }))
// 지연은 훅 자체 테스트에서 확인하므로 여기서는 입력한 값을 바로 검색에 넘긴다.
vi.mock('../../shared/lib/useDebouncedValue', () => ({ useDebouncedValue: <T,>(value: T) => value }))

const products: Material[] = [
  { productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE' },
  { productId: 200, productCode: 'SYR-1', productName: '바닐라 시럽', category: 'SYRUP', unit: 'L', productStatus: 'ACTIVE' },
]

const warehouses: Warehouse[] = [
  { warehouseId: 543, warehouseName: '서울 본사 창고', address: '서울', latitude: 37.5, longitude: 127, warehouseStatus: 'AVAILABLE' },
  { warehouseId: 762, warehouseName: '경기 물류센터', address: '경기', latitude: 37.2, longitude: 127.4, warehouseStatus: 'AVAILABLE' },
]

/** 서버 검색처럼 검색어가 이름·코드에 들어 있는 상품만 돌려준다. */
function mockSearch(total?: number) {
  vi.mocked(useMaterialSearch).mockImplementation(((keyword: string) => {
    const items = products.filter((product) => `${product.productName} ${product.productCode}`.toLowerCase().includes(keyword.trim().toLowerCase()))
    return { data: { items, page: 0, size: 20, totalElements: total ?? items.length }, isFetching: false }
  }) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockSearch()
})

describe('StockFilterForm', () => {
  it('입력한 조건만 담아 조회한다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} onApply={onApply} />)

    await user.type(screen.getByLabelText('창고 id'), '10')
    await user.type(screen.getByRole('combobox', { name: '상품' }), '원두')
    await user.click(within(screen.getByRole('listbox')).getByRole('option', { name: '에티오피아 원두 (BEAN-1)' }))
    await user.selectOptions(screen.getByLabelText('Lot 상태'), 'EXPIRED')
    await user.selectOptions(screen.getByLabelText('할당 보류'), 'false')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ warehouseId: 10, productId: 100, lotStatus: 'EXPIRED', allocationHold: false })
  })

  it('아무것도 고르지 않고 조회하면 조건 없이 조회한다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} onApply={onApply} />)

    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({})
  })

  it('창고 id가 양의 정수가 아니면 안내하고 조회하지 않는다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} onApply={onApply} />)

    await user.type(screen.getByLabelText('창고 id'), 'abc')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(screen.getByRole('alert')).toHaveTextContent('창고 id는 양의 정수여야 합니다.')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('처음 조건(예: 대시보드에서 넘어온 값)을 채워 두고, 초기화하면 모두 비운다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{ lotStatus: 'EXPIRING_SOON', allocationHold: true }} onApply={onApply} />)

    expect(screen.getByLabelText('Lot 상태')).toHaveValue('EXPIRING_SOON')
    expect(screen.getByLabelText('할당 보류')).toHaveValue('true')

    await user.click(screen.getByRole('button', { name: '초기화' }))

    expect(onApply).toHaveBeenCalledWith({})
    expect(screen.getByLabelText('Lot 상태')).toHaveValue('')
    expect(screen.getByRole('button', { name: '초기화' })).toBeDisabled()
  })

  it('창고 이름 목록이 있으면 id 입력칸 대신 이름 드롭다운으로 고른다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} warehouses={warehouses} onApply={onApply} />)

    expect(screen.queryByLabelText('창고 id')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('창고'), '762')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ warehouseId: 762 })
  })

  it('창고 이름 목록이 비어 있으면(실패·불러오는 중) 창고 id를 직접 입력한다', () => {
    render(<StockFilterForm initial={{}} warehouses={[]} onApply={vi.fn()} />)

    expect(screen.getByLabelText('창고 id')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '창고' })).not.toBeInTheDocument()
  })

  it('상품은 이름이나 코드의 일부로 찾아 고르고 초기화하면 비운다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} onApply={onApply} />)

    await user.type(screen.getByRole('combobox', { name: '상품' }), 'syr')
    const list = within(screen.getByRole('listbox'))
    expect(useMaterialSearch).toHaveBeenLastCalledWith('syr')
    expect(list.getAllByRole('option').map((option) => option.textContent)).toEqual(['바닐라 시럽 (SYR-1)'])
    await user.click(list.getByRole('option'))
    await user.click(screen.getByRole('button', { name: '조회' }))
    expect(onApply).toHaveBeenLastCalledWith({ productId: 200 })

    await user.click(screen.getByRole('button', { name: '초기화' }))
    expect(onApply).toHaveBeenLastCalledWith({})
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('')
  })

  it('처음 조건에 상품이 있으면 그 이름을 보여준다', () => {
    render(<StockFilterForm initial={{ productId: 100 }} onApply={vi.fn()} />)

    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('에티오피아 원두 (BEAN-1)')
  })

  it('입력한 글자를 서버 검색에 넘기고 처음에는 검색어 없이 처음 항목을 보여준다', async () => {
    const user = userEvent.setup()
    render(<StockFilterForm initial={{}} onApply={vi.fn()} />)

    expect(useMaterialSearch).toHaveBeenLastCalledWith('')
    await user.type(screen.getByRole('combobox', { name: '상품' }), '원두')

    expect(useMaterialSearch).toHaveBeenLastCalledWith('원두')
  })

  it('다른 글자를 검색해 결과에서 사라져도 고른 상품의 이름은 입력칸에 그대로 보인다', async () => {
    const user = userEvent.setup()
    render(<StockFilterForm initial={{}} onApply={vi.fn()} />)

    await user.type(screen.getByRole('combobox', { name: '상품' }), 'syr')
    await user.click(within(screen.getByRole('listbox')).getByRole('option'))
    // 선택한 뒤 목록을 닫으면 검색어가 비워져 결과가 전체로 돌아가지만 이름은 유지된다.
    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('바닐라 시럽 (SYR-1)')
    vi.mocked(useMaterialSearch).mockReturnValue({ data: { items: [products[0]], page: 0, size: 20, totalElements: 1 }, isFetching: false } as never)
    await user.click(screen.getByRole('combobox', { name: '상품' }))
    await user.keyboard('{Escape}')

    expect(screen.getByRole('combobox', { name: '상품' })).toHaveValue('바닐라 시럽 (SYR-1)')
  })

  it('서버에 더 있는 상품 수를 알리고 더 입력해 좁히라고 안내한다', async () => {
    const user = userEvent.setup()
    mockSearch(57)
    render(<StockFilterForm initial={{}} onApply={vi.fn()} />)

    await user.click(screen.getByRole('combobox', { name: '상품' }))

    expect(screen.getByText('55개가 더 있습니다. 더 입력해 좁혀 주세요.')).toBeInTheDocument()
  })
})

