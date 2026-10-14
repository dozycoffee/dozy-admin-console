import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useEffectiveOptions } from '../../features/catalog/model/useCatalog'
import { EffectiveOptionsPreview } from './EffectiveOptionsPreview'

vi.mock('../../features/catalog/model/useCatalog')

beforeEach(() => vi.clearAllMocks())

describe('EffectiveOptionsPreview', () => {
  it('서버가 계산한 시작가와 유효 옵션(이 상품 가격·자동 선택 표시)을 그대로 보여준다', () => {
    vi.mocked(useEffectiveOptions).mockReturnValue({
      isLoading: false, isError: false,
      data: {
        productId: 12, basePrice: 4500, displayStartingPrice: 5200,
        groups: [
          { optionGroupId: 7, name: '사이즈', selectionType: 'SINGLE', required: true, autoSelectedOptionKey: 'LARGE', options: [{ optionKey: 'LARGE', name: '라지', price: 700, priceOverridden: true }] },
          { optionGroupId: 8, name: '샷 추가', selectionType: 'MULTI', required: false, autoSelectedOptionKey: null, options: [{ optionKey: 'SHOT', name: '샷 추가', price: 500, priceOverridden: false }] },
        ],
      },
    } as never)
    render(<EffectiveOptionsPreview productId={12} />)

    expect(screen.getByText('5,200원')).toBeInTheDocument()
    expect(screen.getByText(/기준가 4,500원/)).toBeInTheDocument()
    expect(screen.getByText('단일 선택 · 필수 · 자동 선택')).toBeInTheDocument()
    expect(screen.getByText('복수 선택 · 선택')).toBeInTheDocument()
    expect(screen.getByText('이 상품 가격')).toBeInTheDocument()
    // 옵션 줄의 "자동 선택" 표시(그룹 제목 줄의 문구는 다른 텍스트와 이어져 있다)
    expect(screen.getAllByText('자동 선택')).toHaveLength(1)
  })

  it('옵션 그룹이 없으면 기준가가 시작가라고 알린다', () => {
    vi.mocked(useEffectiveOptions).mockReturnValue({ isLoading: false, isError: false, data: { productId: 12, basePrice: 4500, displayStartingPrice: 4500, groups: [] } } as never)
    render(<EffectiveOptionsPreview productId={12} />)

    expect(screen.getByText('연결된 옵션 그룹이 없어 기준가가 시작가입니다.')).toBeInTheDocument()
  })

  it('불러오는 중과 실패를 알린다', () => {
    vi.mocked(useEffectiveOptions).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    const { rerender } = render(<EffectiveOptionsPreview productId={12} />)
    expect(screen.getByText('미리보기를 불러오는 중입니다...')).toBeInTheDocument()

    vi.mocked(useEffectiveOptions).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 404, code: 'PRODUCT_NOT_FOUND' }), data: undefined } as never)
    rerender(<EffectiveOptionsPreview productId={12} />)
    expect(screen.getByRole('alert')).toHaveTextContent('상품을 찾을 수 없습니다.')
  })
})
