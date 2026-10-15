import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useOutboxEvents } from '../../features/outbox/model/useOutboxEvents'
import { useReconciliationProposals } from '../../features/reconciliation/model/useReconciliations'
import { useStocks } from '../../features/stock/model/useStocks'
import { StockDashboard } from './StockDashboard'

vi.mock('../../features/stock/model/useStocks', () => ({ useStocks: vi.fn() }))
vi.mock('../../features/outbox/model/useOutboxEvents', () => ({ useOutboxEvents: vi.fn() }))
vi.mock('../../features/reconciliation/model/useReconciliations', () => ({ useReconciliationProposals: vi.fn() }))

const card = (title: string) => screen.getByRole('region', { name: title })
const panel = () => within(card('주의가 필요한 재고'))
const cell = (title: string) => panel().getByRole('group', { name: title })
const open = (title: string) => panel().getByRole('link', { name: `${title} 보기` })

const ready = (totalElements: number) => ({ isLoading: false, isError: false, data: { totalElements } }) as never

function mockStocks(counts: { lotStatus?: Record<string, number>; qualityStatus?: Record<string, number>; hold?: number }) {
  vi.mocked(useStocks).mockImplementation(((params: { lotStatus?: string; qualityStatus?: string; allocationHold?: boolean }) =>
    ready(
      (params.lotStatus && counts.lotStatus?.[params.lotStatus]) ||
        (params.qualityStatus && counts.qualityStatus?.[params.qualityStatus]) ||
        (params.allocationHold ? counts.hold ?? 0 : 0),
    )) as never)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(useReconciliationProposals).mockReturnValue(ready(0))
  vi.mocked(useOutboxEvents).mockReturnValue(ready(0))
  mockStocks({})
})

function renderDashboard() {
  return render(<MemoryRouter><StockDashboard /></MemoryRouter>)
}

describe('StockDashboard', () => {
  describe('처리가 필요한 일', () => {
    it('대사 보정 대기와 발행 실패 이벤트를 한 줄의 카드 둘로 보여준다', () => {
      renderDashboard()

      const actions = within(card('처리가 필요한 일'))
      expect(actions.getAllByRole('region').map((region) => region.getAttribute('aria-label'))).toEqual(['대사 보정 대기', '발행 실패 이벤트'])
    })

    it('승인 대기 보정안 수를 보여주고 승인 대기 필터로 연결한다', () => {
      vi.mocked(useReconciliationProposals).mockReturnValue(ready(5))
      renderDashboard()

      const pending = card('대사 보정 대기')
      expect(within(pending).getByLabelText('5건')).toHaveClass('has-work')
      expect(within(pending).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/reconciliations?status=PENDING')
      expect(useReconciliationProposals).toHaveBeenCalledWith({ status: 'PENDING', page: 0, size: 1 })
    })

    it('격리된 발행 실패 이벤트 수를 보여주고 발행 실패 이벤트 화면으로 연결한다', () => {
      vi.mocked(useOutboxEvents).mockReturnValue(ready(3))
      renderDashboard()

      const dead = card('발행 실패 이벤트')
      expect(within(dead).getByLabelText('3건')).toHaveTextContent('3')
      expect(within(dead).getByRole('link', { name: /전체 보기/ })).toHaveAttribute('href', '/outbox-events')
      expect(useOutboxEvents).toHaveBeenCalledWith(0, 1)
    })

    it('처리할 일이 없으면 안내하고 강조하지 않는다', () => {
      renderDashboard()

      expect(within(card('대사 보정 대기')).getByText('승인을 기다리는 보정안이 없습니다.')).toBeInTheDocument()
      expect(within(card('발행 실패 이벤트')).getByText('격리된 이벤트가 없습니다.')).toBeInTheDocument()
      expect(within(card('대사 보정 대기')).getByLabelText('0건')).not.toHaveClass('has-work')
    })

    it('한 카드의 조회가 실패해도 다른 카드는 그대로 보인다', () => {
      vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 502, code: 'INV_WMS_UNAVAILABLE' }), data: undefined } as never)
      vi.mocked(useOutboxEvents).mockReturnValue(ready(3))
      renderDashboard()

      expect(within(card('대사 보정 대기')).getByRole('alert')).toHaveTextContent('WMS')
      expect(within(card('발행 실패 이벤트')).getByLabelText('3건')).toBeInTheDocument()
    })

    it('불러오는 중과 발행 실패 이벤트 조회 오류를 카드별로 보여준다', () => {
      vi.mocked(useReconciliationProposals).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
      vi.mocked(useOutboxEvents).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403 }), data: undefined } as never)
      renderDashboard()

      expect(within(card('대사 보정 대기')).getByText('불러오는 중입니다...')).toBeInTheDocument()
      expect(within(card('발행 실패 이벤트')).getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
    })
  })

  describe('주의가 필요한 재고', () => {
    it('네 종류를 만료·임박·불량·보류 순서로 한 패널에 보여준다', () => {
      renderDashboard()

      const titles = panel().getAllByRole('group').map((group) => group.querySelector('.stock-attention-title')?.textContent)
      expect(titles).toEqual(['유통기한 만료', '유통기한 임박', '불량', '할당 보류'])
    })

    it('칸마다 해당하는 재고 행 수를 보여주고 보기 링크가 행 보기의 같은 조건으로 연결된다', () => {
      mockStocks({ lotStatus: { EXPIRED: 3, EXPIRING_SOON: 12 }, qualityStatus: { DEFECTIVE: 1 }, hold: 2 })
      renderDashboard()

      expect(within(cell('유통기한 만료')).getByLabelText('3건')).toBeInTheDocument()
      expect(open('유통기한 만료')).toHaveAttribute('href', '/stock?lotStatus=EXPIRED&view=rows')
      expect(within(cell('유통기한 임박')).getByLabelText('12건')).toBeInTheDocument()
      expect(open('유통기한 임박')).toHaveAttribute('href', '/stock?lotStatus=EXPIRING_SOON&view=rows')
      expect(within(cell('불량')).getByLabelText('1건')).toBeInTheDocument()
      expect(open('불량')).toHaveAttribute('href', '/stock?qualityStatus=DEFECTIVE&view=rows')
      expect(within(cell('할당 보류')).getByLabelText('2건')).toBeInTheDocument()
      expect(open('할당 보류')).toHaveAttribute('href', '/stock?allocationHold=true&view=rows')
    })

    it('칸 자체는 링크가 아니고 링크는 칸마다 보기 하나뿐이다', () => {
      renderDashboard()

      const group = cell('유통기한 만료')
      expect(group.tagName).toBe('DIV')
      expect(within(group).getAllByRole('link')).toHaveLength(1)
      expect(within(group).getByRole('link')).toHaveTextContent('보기')
    })

    it('건수가 0이어도 보기 링크는 그대로 보인다', () => {
      renderDashboard()

      expect(open('불량')).toBeInTheDocument()
      expect(within(cell('불량')).getByLabelText('0건')).toBeInTheDocument()
    })

    it('패널 머리글에 재고 행 기준임을 알리고 행 보기로 연결한다', () => {
      renderDashboard()

      expect(panel().getByRole('link', { name: /재고 행 기준/ })).toHaveAttribute('href', '/stock?view=rows')
    })

    it('건수가 있는 칸만 색으로 강조하고(만료·불량은 위험, 임박·보류는 주의) 0이면 강조하지 않는다', () => {
      mockStocks({ lotStatus: { EXPIRED: 3, EXPIRING_SOON: 12 }, qualityStatus: {}, hold: 2 })
      renderDashboard()

      expect(cell('유통기한 만료')).toHaveClass('tone-danger')
      expect(cell('유통기한 임박')).toHaveClass('tone-warning')
      expect(cell('할당 보류')).toHaveClass('tone-warning')
      expect(cell('불량').className).not.toMatch(/tone-/)
    })

    it('긴 설명은 툴팁으로 두고 칸에는 짧은 문구만 보여준다', () => {
      renderDashboard()

      expect(cell('유통기한 만료')).toHaveAttribute('title', '유통기한이 만료된 Lot의 재고 행입니다. 폐기 대상인지 확인하세요.')
      expect(within(cell('유통기한 만료')).getByText('폐기 대상 확인')).toBeInTheDocument()
    })

    it('건수만 세려고 한 건씩만 요청한다', () => {
      renderDashboard()

      expect(useStocks).toHaveBeenCalledWith({ lotStatus: 'EXPIRED', page: 0, size: 1 })
      expect(useStocks).toHaveBeenCalledWith({ lotStatus: 'EXPIRING_SOON', page: 0, size: 1 })
      expect(useStocks).toHaveBeenCalledWith({ qualityStatus: 'DEFECTIVE', page: 0, size: 1 })
      expect(useStocks).toHaveBeenCalledWith({ allocationHold: true, page: 0, size: 1 })
    })

    it('불러오는 중과 오류를 칸별로 보여주고 다른 칸은 그대로 보인다', () => {
      vi.mocked(useStocks).mockImplementation(((params: { lotStatus?: string }) => {
        if (params.lotStatus === 'EXPIRED') return { isLoading: true, isError: false, data: undefined }
        if (params.lotStatus === 'EXPIRING_SOON') return { isLoading: false, isError: true, error: new ApiError('x', { status: 500 }), data: undefined }
        return { isLoading: false, isError: false, data: { totalElements: 4 } }
      }) as never)
      renderDashboard()

      expect(within(cell('유통기한 만료')).getByText('불러오는 중입니다...')).toBeInTheDocument()
      expect(within(cell('유통기한 만료')).getByText('-')).toBeInTheDocument()
      expect(within(cell('유통기한 임박')).getByRole('alert')).toHaveTextContent('재고 정보를 불러오지 못했습니다.')
      expect(within(cell('불량')).getByLabelText('4건')).toBeInTheDocument()
    })
  })
})
