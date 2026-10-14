import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import type { OptionGroup, Product } from '../../features/catalog/model/catalogSchemas'
import { useEffectiveOptions } from '../../features/catalog/model/useCatalog'
import { useClearOptionOverride, useLinkOptionGroup, useReorderOptionGroups, useSetOptionOverride, useUnlinkOptionGroup } from '../../features/catalog/model/useProductOptionMutations'
import { ProductOptionGroups } from './ProductOptionGroups'

vi.mock('../../features/catalog/model/useCatalog')
vi.mock('../../features/catalog/model/useProductOptionMutations')

const size: OptionGroup = {
  id: 7, name: '사이즈', selectionType: 'SINGLE', required: true, version: 2,
  options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 500 }, { optionKey: 'XLARGE', name: '엑스라지', price: 1000 }],
}
const shot: OptionGroup = { id: 8, name: '샷 추가', selectionType: 'MULTI', required: false, version: 1, options: [{ optionKey: 'SHOT', name: '샷 추가', price: 500 }] }
const temperature: OptionGroup = { id: 9, name: '온도', selectionType: 'SINGLE', required: true, version: 1, options: [{ optionKey: 'HOT', name: '따뜻하게', price: 0 }] }
const allGroups = [size, shot, temperature]

const product: Product = {
  id: 12, sku: 'DZ-00000012', name: '아이스 아메리카노', status: 'ACTIVE', categoryId: 5, description: null, imageUrl: null, basePrice: 4500, tracksInventory: false,
  tagIds: [], groupIds: [], storeScope: { kind: 'ALL', targetStoreIds: [] }, version: 4,
  optionGroups: [
    { optionGroupId: 7, overrides: [{ optionKey: 'LARGE', type: 'PRICE', price: 700 }, { optionKey: 'XLARGE', type: 'EXCLUDE', price: null }] },
    { optionGroupId: 8, overrides: [] },
  ],
}

type Handlers = { onSuccess: () => void; onError: (error: unknown) => void }
const fns = { link: vi.fn(), unlink: vi.fn(), reorder: vi.fn(), setOverride: vi.fn(), clearOverride: vi.fn() }
const confirm = vi.fn()
const idle = { isPending: false, isError: false, error: null, reset: vi.fn() }

function mockMutations(overrides: Partial<Record<keyof typeof fns, object>> = {}) {
  vi.mocked(useLinkOptionGroup).mockReturnValue({ ...idle, mutate: fns.link, ...overrides.link } as never)
  vi.mocked(useUnlinkOptionGroup).mockReturnValue({ ...idle, mutate: fns.unlink, ...overrides.unlink } as never)
  vi.mocked(useReorderOptionGroups).mockReturnValue({ ...idle, mutate: fns.reorder, ...overrides.reorder } as never)
  vi.mocked(useSetOptionOverride).mockReturnValue({ ...idle, mutate: fns.setOverride, ...overrides.setOverride } as never)
  vi.mocked(useClearOptionOverride).mockReturnValue({ ...idle, mutate: fns.clearOverride, ...overrides.clearOverride } as never)
}

function renderSection(extra: { writable?: boolean; groups?: OptionGroup[]; product?: Product } = {}) {
  return render(<ToastProvider><ProductOptionGroups product={extra.product ?? product} optionGroups={extra.groups ?? allGroups} writable={extra.writable ?? true} confirm={confirm} /></ToastProvider>)
}

beforeEach(() => {
  vi.clearAllMocks()
  mockMutations()
  vi.mocked(useEffectiveOptions).mockReturnValue({ isLoading: false, isError: false, data: undefined } as never)
})

const card = (name: string) => screen.getByText(new RegExp(`^\\d+\\. ${name}$`)).closest('li')!

describe('연결된 옵션 그룹 표시', () => {
  it('노출 순서대로 번호를 붙이고 옵션별 예외 상태를 보여준다', () => {
    renderSection()

    const sizes = within(card('사이즈'))
    expect(screen.getByText('1. 사이즈')).toBeInTheDocument()
    expect(screen.getByText('2. 샷 추가')).toBeInTheDocument()
    expect(sizes.getByText('단일 선택 · 필수')).toBeInTheDocument()
    expect(sizes.getByText('가격 변경 700원')).toBeInTheDocument()
    expect(sizes.getByText('제외')).toBeInTheDocument()
    expect(sizes.getAllByText('기본')).toHaveLength(1)
    expect(within(card('샷 추가')).getByText('기본')).toBeInTheDocument()
  })

  it('제외된 옵션 줄은 흐리게 표시할 수 있도록 표시한다', () => {
    renderSection()

    expect(within(card('사이즈')).getByText('엑스라지').closest('tr')).toHaveClass('option-excluded')
  })

  it('연결된 옵션 그룹이 없으면 안내한다', () => {
    renderSection({ product: { ...product, optionGroups: [] } })

    expect(screen.getByText('연결된 옵션 그룹이 없습니다.')).toBeInTheDocument()
  })

  it('옵션 그룹 정보를 아직 못 받았으면 #id로 보이고 예외 버튼은 없다', () => {
    renderSection({ groups: [] })

    expect(screen.getByText('1. #7')).toBeInTheDocument()
    expect(screen.getAllByText('옵션 그룹 정보를 불러오는 중입니다...')).toHaveLength(2)
    expect(screen.queryByRole('button', { name: /예외/ })).not.toBeInTheDocument()
  })
})

describe('연결', () => {
  it('연결하지 않은 옵션 그룹만 고를 수 있고 고르기 전에는 연결할 수 없다', () => {
    renderSection()

    expect(screen.getByRole('button', { name: '연결' })).toBeDisabled()
    const options = within(screen.getByLabelText('옵션 그룹 연결')).getAllByRole('option').map((option) => option.textContent)
    expect(options).toEqual(['선택하세요', '온도'])
  })

  it('고른 옵션 그룹을 상품 버전과 함께 연결하고 성공하면 선택을 비우고 토스트로 알린다', async () => {
    fns.link.mockImplementation((_variables, handlers: Handlers) => handlers.onSuccess())
    renderSection()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('옵션 그룹 연결'), '온도')
    await user.click(screen.getByRole('button', { name: '연결' }))

    expect(fns.link).toHaveBeenCalledWith({ productId: 12, version: 4, optionGroupId: 9 }, expect.any(Object))
    expect(await screen.findByText('옵션 그룹을 연결했습니다.')).toBeInTheDocument()
    expect(screen.getByLabelText('옵션 그룹 연결')).toHaveValue('')
  })

  it('연결할 수 있는 옵션 그룹이 없으면 선택을 막고 안내한다', () => {
    renderSection({ groups: [size, shot] })

    expect(screen.getByLabelText('옵션 그룹 연결')).toBeDisabled()
    expect(screen.getByRole('option', { name: '연결할 수 있는 옵션 그룹이 없습니다' })).toBeInTheDocument()
  })
})

describe('연결 해제', () => {
  it('확인 모달에서 예외도 함께 삭제된다고 알리고 확인하면 해제한다', async () => {
    renderSection()

    await userEvent.setup().click(screen.getByRole('button', { name: '사이즈 연결 해제' }))

    expect(confirm).toHaveBeenCalledWith(expect.objectContaining({
      title: '"사이즈" 옵션 그룹 연결을 해제할까요?',
      description: expect.stringContaining('예외도 함께 삭제되며, 다시 연결해도 복원되지 않습니다'),
      confirmLabel: '연결 해제',
    }))
    expect(fns.unlink).not.toHaveBeenCalled()
    confirm.mock.calls[0][0].run()
    expect(fns.unlink).toHaveBeenCalledWith({ productId: 12, version: 4, optionGroupId: 7 }, expect.any(Object))
  })
})

describe('노출 순서', () => {
  it('위로·아래로 누르면 연결된 옵션 그룹 전체를 새 순서로 보낸다', async () => {
    renderSection()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '샷 추가 위로' }))
    expect(fns.reorder).toHaveBeenLastCalledWith({ productId: 12, version: 4, optionGroupIds: [8, 7] }, expect.any(Object))

    await user.click(screen.getByRole('button', { name: '사이즈 아래로' }))
    expect(fns.reorder).toHaveBeenLastCalledWith({ productId: 12, version: 4, optionGroupIds: [8, 7] }, expect.any(Object))
  })

  it('맨 위의 위로와 맨 아래의 아래로는 막혀 있다', () => {
    renderSection()

    expect(screen.getByRole('button', { name: '사이즈 위로' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '샷 추가 아래로' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '사이즈 아래로' })).toBeEnabled()
  })
})

describe('옵션 예외', () => {
  const open = async (optionName: string, group = '사이즈') => {
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: `${group} ${optionName} 예외` }))
    return { user, dialog: screen.getByRole('dialog', { name: new RegExp(`옵션 예외 · ${group} / ${optionName}`) }) }
  }

  it('예외가 없는 옵션은 기본값 사용으로 열리고 그대로 저장하면 요청 없이 닫는다', async () => {
    renderSection()
    const { user, dialog } = await open('레귤러')

    expect(within(dialog).getByLabelText(/옵션 그룹의 기본값 사용/)).toBeChecked()
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(fns.setOverride).not.toHaveBeenCalled()
    expect(fns.clearOverride).not.toHaveBeenCalled()
  })

  it('가격 변경을 고르면 가격 칸이 나오고 입력한 가격을 보낸다', async () => {
    renderSection()
    const { user, dialog } = await open('레귤러')

    await user.click(within(dialog).getByLabelText('이 상품에서만 가격 변경'))
    await user.clear(within(dialog).getByLabelText('이 상품에서의 가격 (원)'))
    await user.type(within(dialog).getByLabelText('이 상품에서의 가격 (원)'), '300')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(fns.setOverride).toHaveBeenCalledWith({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'REGULAR', override: { type: 'PRICE', price: 300 } }, expect.any(Object))
  })

  it('가격이 올바르지 않으면 요청하지 않고 안내한다', async () => {
    renderSection()
    const { user, dialog } = await open('레귤러')

    await user.click(within(dialog).getByLabelText('이 상품에서만 가격 변경'))
    await user.clear(within(dialog).getByLabelText('이 상품에서의 가격 (원)'))
    await user.type(within(dialog).getByLabelText('이 상품에서의 가격 (원)'), '-1')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(within(dialog).getByText('0 이상의 정수로 입력하세요.')).toBeInTheDocument()
    expect(fns.setOverride).not.toHaveBeenCalled()
  })

  it('제외를 고르면 제외 예외를 보낸다', async () => {
    renderSection()
    const { user, dialog } = await open('레귤러')

    await user.click(within(dialog).getByLabelText('이 상품에서는 선택할 수 없게 제외'))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(fns.setOverride).toHaveBeenCalledWith(expect.objectContaining({ optionKey: 'REGULAR', override: { type: 'EXCLUDE' } }), expect.any(Object))
  })

  it('이미 가격 예외가 있는 옵션은 그 가격으로 열리고 같은 값이면 요청 없이 닫는다', async () => {
    renderSection()
    const { user, dialog } = await open('라지')

    expect(within(dialog).getByLabelText('이 상품에서만 가격 변경')).toBeChecked()
    expect(within(dialog).getByLabelText('이 상품에서의 가격 (원)')).toHaveValue('700')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(fns.setOverride).not.toHaveBeenCalled()
  })

  it('예외를 기본값 사용으로 되돌리면 예외를 해제한다', async () => {
    renderSection()
    const { user, dialog } = await open('엑스라지')

    expect(within(dialog).getByLabelText('이 상품에서는 선택할 수 없게 제외')).toBeChecked()
    await user.click(within(dialog).getByLabelText(/옵션 그룹의 기본값 사용/))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(fns.clearOverride).toHaveBeenCalledWith({ productId: 12, version: 4, optionGroupId: 7, optionKey: 'XLARGE' }, expect.any(Object))
  })

  it('저장에 성공하면 모달을 닫고 토스트로 알린다', async () => {
    fns.setOverride.mockImplementation((_variables, handlers: Handlers) => handlers.onSuccess())
    renderSection()
    const { user, dialog } = await open('레귤러')

    await user.click(within(dialog).getByLabelText('이 상품에서는 선택할 수 없게 제외'))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByText('예외를 저장했습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: /옵션 예외/ })).not.toBeInTheDocument()
  })

  it('서버가 거부하면(선택 가능한 옵션 0개) 모달 안에 안내하고 닫지 않는다', async () => {
    const rejected = new ApiError('x', { status: 422, code: 'NO_SELECTABLE_OPTION' })
    mockMutations({ setOverride: { isError: true, error: rejected } })
    fns.setOverride.mockImplementation((_variables, handlers: Handlers) => handlers.onError(rejected))
    renderSection()
    const { user, dialog } = await open('레귤러')

    await user.click(within(dialog).getByLabelText('이 상품에서는 선택할 수 없게 제외'))
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(within(dialog).getByRole('alert')).toHaveTextContent('선택할 수 있는 옵션이 하나도 없는 상품')
    // 같은 오류를 구역 아래에 한 번 더 보여주지 않는다
    expect(screen.getAllByRole('alert')).toHaveLength(1)
  })
})

describe('버전 충돌과 오류', () => {
  it('연결 중 버전이 어긋나면(409) 최신 내용을 다시 불러왔다는 오류 토스트를 띄운다', async () => {
    fns.link.mockImplementation((_variables, handlers: Handlers) => handlers.onError(new ApiError('x', { status: 409, code: 'VERSION_CONFLICT' })))
    renderSection()
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('옵션 그룹 연결'), '온도')
    await user.click(screen.getByRole('button', { name: '연결' }))

    expect(await screen.findByText(/최신 내용을 불러왔으니 확인한 뒤 다시 시도해 주세요/)).toBeInTheDocument()
    // 구역 안의 인라인 오류 문구는 쓰지 않는다(토스트로만 알린다)
    expect(screen.queryByText(/최신 내용을 불러온 뒤 다시 시도해 주세요/)).not.toBeInTheDocument()
  })

  it('그 밖의 오류는 구역 안에 code별 안내로 보여준다', async () => {
    fns.reorder.mockImplementation((_variables, handlers: Handlers) => handlers.onError(new ApiError('x', { status: 400, code: 'INVALID_OPTION_GROUP_ORDER' })))
    renderSection()

    await userEvent.setup().click(screen.getByRole('button', { name: '샷 추가 위로' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('옵션 그룹 순서가 올바르지 않습니다.')
  })
})

describe('연속 변경 보호와 권한', () => {
  it('변경이 끝나지 않았으면(상품 재조회 포함) 모든 버튼과 선택을 막고 이유를 알린다', async () => {
    mockMutations({ link: { isPending: true } })
    renderSection()

    for (const name of ['사이즈 위로', '샷 추가 위로', '사이즈 아래로', '사이즈 연결 해제', '사이즈 라지 예외', '연결']) expect(screen.getByRole('button', { name })).toBeDisabled()
    expect(screen.getByLabelText('옵션 그룹 연결')).toBeDisabled()
    await userEvent.setup().hover(screen.getByRole('button', { name: '사이즈 연결 해제' }).parentElement!)
    expect((await screen.findAllByText('처리 중입니다.')).length).toBeGreaterThan(0)
  })

  it('catalog.write가 없으면 연결·해제·순서·예외 버튼을 모두 비활성화하고 권한 사유를 알린다', async () => {
    renderSection({ writable: false })

    for (const name of ['사이즈 아래로', '사이즈 연결 해제', '사이즈 라지 예외', '샷 추가 샷 추가 예외']) expect(screen.getByRole('button', { name })).toBeDisabled()
    expect(screen.getByLabelText('옵션 그룹 연결')).toBeDisabled()
    await userEvent.setup().hover(screen.getByRole('button', { name: '사이즈 연결 해제' }).parentElement!)
    expect((await screen.findAllByText('상품을 변경할 권한이 없습니다.')).length).toBeGreaterThan(0)
  })
})

describe('판매 옵션 미리보기', () => {
  it('눌러야 열리고 서버가 계산한 시작가를 보여준다', async () => {
    vi.mocked(useEffectiveOptions).mockReturnValue({
      isLoading: false, isError: false,
      data: { productId: 12, basePrice: 4500, displayStartingPrice: 4500, groups: [{ optionGroupId: 7, name: '사이즈', selectionType: 'SINGLE', required: true, autoSelectedOptionKey: null, options: [{ optionKey: 'LARGE', name: '라지', price: 700, priceOverridden: true }] }] },
    } as never)
    renderSection()
    const user = userEvent.setup()

    expect(screen.queryByText(/표시용 시작가/)).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '판매 옵션 미리보기' }))

    expect(screen.getByText(/표시용 시작가/)).toBeInTheDocument()
    expect(screen.getByText('이 상품 가격')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '판매 옵션 미리보기 닫기' })).toHaveAttribute('aria-expanded', 'true')
  })
})
