import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { Product } from '../../features/stock/model/stockSchemas'
import type { Warehouse } from '../../features/warehouse/model/warehouseSchemas'
import { StockFilterForm } from './StockFilterForm'

const products: Product[] = [
  { productId: 100, productCode: 'BEAN-1', productName: '에티오피아 원두', category: 'BEAN', unit: 'KG', productStatus: 'ACTIVE' },
  { productId: 200, productCode: 'SYR-1', productName: '바닐라 시럽', category: 'SYRUP', unit: 'L', productStatus: 'ACTIVE' },
]

const warehouses: Warehouse[] = [
  { warehouseId: 543, warehouseName: '서울 본사 창고', address: '서울', latitude: 37.5, longitude: 127, warehouseStatus: 'AVAILABLE' },
  { warehouseId: 762, warehouseName: '경기 물류센터', address: '경기', latitude: 37.2, longitude: 127.4, warehouseStatus: 'AVAILABLE' },
]

describe('StockFilterForm', () => {
  it('입력한 조건만 담아 조회한다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} products={products} onApply={onApply} />)

    await user.type(screen.getByLabelText('창고 id'), '10')
    await user.selectOptions(screen.getByLabelText('상품'), '100')
    await user.selectOptions(screen.getByLabelText('Lot 상태'), 'EXPIRED')
    await user.selectOptions(screen.getByLabelText('할당 보류'), 'false')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ warehouseId: 10, productId: 100, lotStatus: 'EXPIRED', allocationHold: false })
  })

  it('아무것도 고르지 않고 조회하면 조건 없이 조회한다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} products={products} onApply={onApply} />)

    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({})
  })

  it('창고 id가 양의 정수가 아니면 안내하고 조회하지 않는다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{}} products={products} onApply={onApply} />)

    await user.type(screen.getByLabelText('창고 id'), 'abc')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(screen.getByRole('alert')).toHaveTextContent('창고 id는 양의 정수여야 합니다.')
    expect(onApply).not.toHaveBeenCalled()
  })

  it('처음 조건(예: 대시보드에서 넘어온 값)을 채워 두고, 초기화하면 모두 비운다', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    render(<StockFilterForm initial={{ lotStatus: 'EXPIRING_SOON', allocationHold: true }} products={products} onApply={onApply} />)

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
    render(<StockFilterForm initial={{}} products={products} warehouses={warehouses} onApply={onApply} />)

    expect(screen.queryByLabelText('창고 id')).not.toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('창고'), '762')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ warehouseId: 762 })
  })

  it('창고 이름 목록이 비어 있으면(실패·불러오는 중) 창고 id를 직접 입력한다', () => {
    render(<StockFilterForm initial={{}} products={products} warehouses={[]} onApply={vi.fn()} />)

    expect(screen.getByLabelText('창고 id')).toBeInTheDocument()
    expect(screen.queryByRole('combobox', { name: '창고' })).not.toBeInTheDocument()
  })
})
