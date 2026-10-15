import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useReconciliationProposals } from '../../features/reconciliation/model/useReconciliations'
import { useStocks } from '../../features/stock/model/useStocks'
import { StockDashboard } from './StockDashboard'

vi.mock('../../features/stock/model/useStocks', () => ({ useStocks: vi.fn() }))
vi.mock('../../features/reconciliation/model/useReconciliations', () => ({ useReconciliationProposals: vi.fn() }))

const card = (title: string) => screen.getByRole('region', { name: title })

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 0 } } as never)
})

describe('StockDashboard', () => {
  it('카드마다 해당하는 재고 행 수를 보여주고 재고 현황의 같은 조건으로 연결한다', () => {
    vi.mocked(useStocks).mockImplementation(((params: { lotStatus?: string }) => ({ isLoading: false, isError: false, data: { totalElements: params.lotStatus === 'EXPIRED' ? 3 : 0 } })) as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)

    const expired = card('유통기한이 지난 재고')
    expect(within(expired).getByLabelText('3건')).toHaveTextContent('3')
    expect(within(expired).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/stock?lotStatus=EXPIRED')
    expect(within(card('유통기한 임박 재고')).getByText('해당하는 재고가 없습니다.')).toBeInTheDocument()
    expect(within(card('할당 보류 재고')).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/stock?allocationHold=true')
    expect(within(card('불량 재고')).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/stock?qualityStatus=DEFECTIVE')
  })

  it('건수만 세려고 한 건씩만 요청한다', () => {
    vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 0 } } as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)

    expect(useStocks).toHaveBeenCalledWith({ lotStatus: 'EXPIRED', page: 0, size: 1 })
    expect(useStocks).toHaveBeenCalledWith({ allocationHold: true, page: 0, size: 1 })
  })

  it('불러오는 중과 오류를 카드별로 보여준다', () => {
    vi.mocked(useStocks).mockImplementation(((params: { lotStatus?: string }) => params.lotStatus === 'EXPIRED'
      ? { isLoading: true, isError: false, data: undefined }
      : { isLoading: false, isError: true, error: new ApiError('x', { status: 500 }), data: undefined }) as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)

    expect(within(card('유통기한이 지난 재고')).getByText('불러오는 중입니다...')).toBeInTheDocument()
    expect(within(card('불량 재고')).getByRole('alert')).toHaveTextContent('재고 정보를 불러오지 못했습니다.')
  })

  it('승인 대기 보정안 수를 보여주고 승인 대기 필터로 연결한다', () => {
    vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 0 } } as never)
    vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 5 } } as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)

    const pending = card('대사 보정 대기')
    expect(within(pending).getByLabelText('5건')).toHaveTextContent('5')
    expect(within(pending).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/reconciliations?status=PENDING')
    expect(useReconciliationProposals).toHaveBeenCalledWith({ status: 'PENDING', page: 0, size: 1 })
  })

  it('승인 대기 보정안이 없으면 안내한다', () => {
    vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 0 } } as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)
    expect(within(card('대사 보정 대기')).getByText('승인을 기다리는 보정안이 없습니다.')).toBeInTheDocument()
  })

  it('보정안 조회가 실패해도 재고 카드는 그대로 보인다', () => {
    vi.mocked(useStocks).mockReturnValue({ isLoading: false, isError: false, data: { totalElements: 2 } } as never)
    vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 502, code: 'INV_WMS_UNAVAILABLE' }), data: undefined } as never)
    render(<MemoryRouter><StockDashboard /></MemoryRouter>)

    expect(within(card('대사 보정 대기')).getByRole('alert')).toHaveTextContent('WMS')
    expect(within(card('불량 재고')).getByLabelText('2건')).toBeInTheDocument()
  })
})
