import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import type { OptionGroup } from '../../features/catalog/model/catalogSchemas'
import { useOptionGroups } from '../../features/catalog/model/useCatalog'
import { useCreateOptionGroup, useDeleteOptionGroup, useReplaceOptions, useUpdateOptionGroup } from '../../features/catalog/model/useOptionGroupMutations'
import { OptionGroupsPage } from './OptionGroupsPage'

vi.mock('../../features/catalog/model/useCatalog')
vi.mock('../../features/catalog/model/useOptionGroupMutations')

const size: OptionGroup = {
  id: 1, name: '사이즈', selectionType: 'SINGLE', required: true, version: 2,
  options: [{ optionKey: 'REGULAR', name: '레귤러', price: 0 }, { optionKey: 'LARGE', name: '라지', price: 700 }],
}
const shot: OptionGroup = { id: 2, name: '샷 추가', selectionType: 'MULTI', required: false, version: 1, options: [{ optionKey: 'SHOT', name: '샷 추가', price: 500 }] }

const remove = vi.fn()
const idle = { isPending: false, isError: false, error: null, reset: vi.fn() }
const updateGroup = vi.fn()

function setup(data: OptionGroup[] = [size, shot]) {
  vi.mocked(useOptionGroups).mockReturnValue({ isLoading: false, isError: false, data } as never)
  vi.mocked(useDeleteOptionGroup).mockReturnValue({ ...idle, mutate: remove } as never)
  vi.mocked(useCreateOptionGroup).mockReturnValue({ mutateAsync: vi.fn() } as never)
  vi.mocked(useReplaceOptions).mockReturnValue({ mutateAsync: vi.fn() } as never)
  vi.mocked(useUpdateOptionGroup).mockReturnValue({ mutateAsync: updateGroup } as never)
}

function renderPage(granted: Permission[] = [permissions.catalogRead, permissions.catalogWrite]) {
  return render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastProvider><OptionGroupsPage /></ToastProvider>
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

const detailOf = (name: string) => screen.getByRole('heading', { level: 2, name }).closest('section')!

describe('OptionGroupsPage', () => {
  it('옵션 그룹 목록과 첫 그룹의 상세(옵션 표)를 보여준다', () => {
    setup()
    renderPage()

    expect(screen.getByRole('heading', { name: '옵션 그룹' })).toBeInTheDocument()
    expect(screen.getByText('2개')).toBeInTheDocument()
    expect(screen.getByText('단일 선택 · 필수 · 옵션 2개')).toBeInTheDocument()
    expect(screen.getByText('복수 선택 · 선택 · 옵션 1개')).toBeInTheDocument()
    const detail = within(detailOf('사이즈'))
    expect(detail.getByText('단일 선택')).toBeInTheDocument()
    expect(detail.getByText('필수 선택')).toBeInTheDocument()
    expect(detail.getByText('LARGE')).toBeInTheDocument()
    expect(detail.getByText('700원')).toBeInTheDocument()
    expect(detail.getByText('버전 2')).toBeInTheDocument()
  })

  it('다른 옵션 그룹을 선택하면 상세가 바뀐다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(screen.getByRole('button', { name: /샷 추가/ }))

    const detail = within(detailOf('샷 추가'))
    expect(detail.getByText('복수 선택')).toBeInTheDocument()
    expect(detail.getByText('선택 사항')).toBeInTheDocument()
  })

  it('이름으로 검색하면 검색어를 조회에 넘기고 선택을 푼다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이름'), '샷')
    await user.click(screen.getByRole('button', { name: '검색' }))

    expect(vi.mocked(useOptionGroups)).toHaveBeenLastCalledWith('샷')
  })

  it('목록이 비면 안내한다(검색 중이면 조건 안내)', async () => {
    setup([])
    renderPage()

    expect(screen.getByText('등록된 옵션 그룹이 없습니다.')).toBeInTheDocument()
    expect(screen.getByText('선택한 옵션 그룹이 없습니다')).toBeInTheDocument()
    await userEvent.setup().type(screen.getByLabelText('이름'), '없는이름')
    await userEvent.setup().click(screen.getByRole('button', { name: '검색' }))
    expect(screen.getByText('조건에 맞는 옵션 그룹이 없습니다.')).toBeInTheDocument()
  })

  it('목록 조회가 실패하면 code별 안내를 보여준다', () => {
    vi.mocked(useOptionGroups).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined } as never)
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('catalog.write가 있으면 추가 버튼과 변경·삭제가 있고 없으면 추가는 숨기고 나머지는 비활성이다', async () => {
    setup()
    const { unmount } = renderPage()
    expect(screen.getByRole('button', { name: '옵션 그룹 추가' })).toBeInTheDocument()
    expect(within(detailOf('사이즈')).getByRole('button', { name: '변경' })).toBeEnabled()
    unmount()

    renderPage([permissions.catalogRead])
    expect(screen.queryByRole('button', { name: '옵션 그룹 추가' })).not.toBeInTheDocument()
    const detail = within(detailOf('사이즈'))
    expect(detail.getByRole('button', { name: '변경' })).toBeDisabled()
    expect(detail.getByRole('button', { name: '삭제' })).toBeDisabled()
    await userEvent.setup().hover(detail.getByRole('button', { name: '삭제' }).parentElement!)
    expect((await screen.findAllByText('옵션 그룹을 변경할 권한이 없습니다.')).length).toBeGreaterThan(0)
  })

  it('삭제는 확인 모달을 거친 뒤에만 요청하고 성공하면 토스트로 알린다', async () => {
    remove.mockImplementation((_id, handlers) => handlers.onSuccess())
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('사이즈')).getByRole('button', { name: '삭제' }))
    expect(remove).not.toHaveBeenCalled()
    const dialog = screen.getByRole('dialog', { name: '"사이즈" 옵션 그룹을 삭제할까요?' })
    expect(within(dialog).getByText(/연결한 상품이 있으면 삭제할 수 없습니다/)).toBeInTheDocument()
    await user.click(within(dialog).getByRole('button', { name: '삭제' }))

    expect(remove).toHaveBeenCalledWith(1, expect.any(Object))
    expect(await screen.findByText('"사이즈" 옵션 그룹을 삭제했습니다.')).toBeInTheDocument()
  })

  it('확인 모달에서 취소하면 삭제하지 않는다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('사이즈')).getByRole('button', { name: '삭제' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(remove).not.toHaveBeenCalled()
  })

  it('연결한 상품이 있어 삭제가 거부되면 안내를 상세 안에 보여준다', () => {
    setup()
    vi.mocked(useDeleteOptionGroup).mockReturnValue({ ...idle, mutate: remove, isError: true, error: new ApiError('x', { status: 409, code: 'OPTION_GROUP_STILL_REFERENCED' }) } as never)
    renderPage()

    expect(within(detailOf('사이즈')).getByRole('alert')).toHaveTextContent('연결한 상품이 있어 삭제할 수 없습니다')
  })

  it('변경은 모달에서 현재 값을 채워 연다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(within(detailOf('사이즈')).getByRole('button', { name: '변경' }))

    const dialog = screen.getByRole('dialog', { name: '옵션 그룹 변경 · 사이즈' })
    expect(within(dialog).getByLabelText('이름')).toHaveValue('사이즈')
    expect(within(dialog).getByLabelText('옵션 2 키')).toHaveValue('LARGE')
  })

  it('저장하면 모달을 닫고 토스트로 알린다', async () => {
    updateGroup.mockResolvedValue({ ...size, name: '크기', version: 3 })
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('사이즈')).getByRole('button', { name: '변경' }))
    const dialog = screen.getByRole('dialog', { name: '옵션 그룹 변경 · 사이즈' })
    await user.clear(within(dialog).getByLabelText('이름'))
    await user.type(within(dialog).getByLabelText('이름'), '크기')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(updateGroup).toHaveBeenCalledWith({ id: 1, version: 2, body: { name: '크기', selectionType: 'SINGLE', required: true } })
    expect(await screen.findByText('옵션 그룹을 저장했습니다.')).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '옵션 그룹 변경 · 사이즈' })).not.toBeInTheDocument()
  })

  it('버전이 어긋나면(409) 모달을 닫고 최신 내용을 확인하라는 오류 토스트를 띄운다', async () => {
    updateGroup.mockRejectedValue(new ApiError('x', { status: 409, code: 'VERSION_CONFLICT' }))
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(within(detailOf('사이즈')).getByRole('button', { name: '변경' }))
    const dialog = screen.getByRole('dialog', { name: '옵션 그룹 변경 · 사이즈' })
    await user.clear(within(dialog).getByLabelText('이름'))
    await user.type(within(dialog).getByLabelText('이름'), '크기')
    await user.click(within(dialog).getByRole('button', { name: '저장' }))

    expect(await screen.findByText(/다른 사용자가 먼저 수정했습니다/)).toBeInTheDocument()
    expect(screen.queryByRole('dialog', { name: '옵션 그룹 변경 · 사이즈' })).not.toBeInTheDocument()
  })

  it('추가는 모달에서 옵션 한 줄이 비어 있는 폼으로 연다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(screen.getByRole('button', { name: '옵션 그룹 추가' }))

    const dialog = screen.getByRole('dialog', { name: '옵션 그룹 추가' })
    expect(within(dialog).getByLabelText('옵션 1 키')).toHaveValue('')
    expect(within(dialog).getByRole('button', { name: '옵션 그룹 등록하기' })).toBeInTheDocument()
  })
})
