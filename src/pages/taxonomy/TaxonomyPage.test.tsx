import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastProvider } from '../../shared/ui/ToastProvider'
import { AuthContext } from '../../features/auth/model/authContext'
import { permissions, type Permission } from '../../features/auth/model/permissions'
import { useCategories, useCountProducts, useProductGroups, useTags } from '../../features/catalog/model/useCatalog'
import {
  useCreateCategory, useCreateProductGroup, useDeleteCategory, useDeleteProductGroup, useDeleteTag, useMoveCategory, useRenameCategory, useRenameProductGroup, useRenameTag,
} from '../../features/catalog/model/useTaxonomyMutations'
import { TaxonomyPage } from './TaxonomyPage'

vi.mock('../../features/catalog/model/useCatalog')
vi.mock('../../features/catalog/model/useTaxonomyMutations')

const categories = [
  { id: 1, name: '음료', parentId: null }, { id: 2, name: '푸드', parentId: null }, { id: 3, name: 'MD', parentId: null },
  { id: 5, name: '커피', parentId: 1 }, { id: 6, name: '티', parentId: 1 }, { id: 7, name: '디저트', parentId: 2 },
]
const tags = [{ id: 1, name: '신메뉴' }, { id: 2, name: '베스트' }, { id: 3, name: '시즌한정' }]
const groups = [{ id: 1, name: '여름 시즌' }, { id: 2, name: '겨울 시즌' }]

const fns = {
  createCategory: vi.fn(), renameCategory: vi.fn(), moveCategory: vi.fn(), deleteCategory: vi.fn(),
  renameTag: vi.fn(), deleteTag: vi.fn(), createGroup: vi.fn(), renameGroup: vi.fn(), deleteGroup: vi.fn(),
}
const countProducts = vi.fn()
const idle = { isPending: false, isError: false, error: null, reset: vi.fn() }
const mutation = (mutate: ReturnType<typeof vi.fn>, extra: object = {}) => ({ ...idle, mutate, mutateAsync: mutate, ...extra }) as never

function setup(overrides: { [key in keyof typeof fns]?: object } = {}) {
  vi.mocked(useCategories).mockReturnValue({ isLoading: false, isError: false, data: categories } as never)
  vi.mocked(useTags).mockReturnValue({ isLoading: false, isError: false, data: tags } as never)
  vi.mocked(useProductGroups).mockReturnValue({ isLoading: false, isError: false, data: groups } as never)
  vi.mocked(useCountProducts).mockReturnValue(countProducts)
  vi.mocked(useCreateCategory).mockReturnValue(mutation(fns.createCategory, overrides.createCategory))
  vi.mocked(useRenameCategory).mockReturnValue(mutation(fns.renameCategory, overrides.renameCategory))
  vi.mocked(useMoveCategory).mockReturnValue(mutation(fns.moveCategory, overrides.moveCategory))
  vi.mocked(useDeleteCategory).mockReturnValue(mutation(fns.deleteCategory, overrides.deleteCategory))
  vi.mocked(useRenameTag).mockReturnValue(mutation(fns.renameTag, overrides.renameTag))
  vi.mocked(useDeleteTag).mockReturnValue(mutation(fns.deleteTag, overrides.deleteTag))
  vi.mocked(useCreateProductGroup).mockReturnValue(mutation(fns.createGroup, overrides.createGroup))
  vi.mocked(useRenameProductGroup).mockReturnValue(mutation(fns.renameGroup, overrides.renameGroup))
  vi.mocked(useDeleteProductGroup).mockReturnValue(mutation(fns.deleteGroup, overrides.deleteGroup))
}

function renderPage(granted: Permission[] = [permissions.catalogRead, permissions.catalogWrite]) {
  return render(
    <AuthContext.Provider value={{ user: null, isLoading: false, activeActorMode: null, can: (permission) => granted.includes(permission), selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <ToastProvider><TaxonomyPage /></ToastProvider>
    </AuthContext.Provider>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  countProducts.mockResolvedValue(0)
})

const row = (name: string) => screen.getByText(name, { selector: 'strong' }).closest('li')!
const button = (label: string, target: string) => screen.getByRole('button', { name: `${label} · ${target}` })
const dialog = () => screen.getByRole('dialog')

describe('탭', () => {
  it('처음에는 카테고리를 보여주고 탭으로 태그·상품 그룹을 오간다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    expect(screen.getByRole('tab', { name: '카테고리', selected: true })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: '카테고리' })).toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '태그' }))
    expect(screen.getByRole('region', { name: '태그' })).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: '카테고리' })).not.toBeInTheDocument()

    await user.click(screen.getByRole('tab', { name: '상품 그룹' }))
    expect(screen.getByRole('region', { name: '상품 그룹' })).toBeInTheDocument()
  })
})

describe('카테고리', () => {
  it('설명은 본문에 늘어놓지 않고 제목 옆 ? 툴팁으로 보여준다', async () => {
    setup()
    renderPage()

    const tip = screen.getByText(/소분류가 하나도 없으면 상품을 등록할 수 없습니다/)
    expect(tip).not.toBeVisible()
    await userEvent.setup().hover(screen.getByRole('img', { name: '카테고리 안내' }))
    expect(tip).toBeVisible()
  })

  it('대분류 아래에 소분류를 계층으로 보여주고 소분류 수를 알려 준다', () => {
    setup()
    renderPage()

    expect(within(row('음료')).getByText('대분류 · 소분류 2개')).toBeInTheDocument()
    expect(within(row('MD')).getByText('대분류 · 소분류 0개')).toBeInTheDocument()
    expect(within(row('커피')).getByText('소분류')).toBeInTheDocument()
    expect(row('커피').closest('ul')).toBe(row('음료').closest('ul'))
  })

  it('대분류를 추가한다(parentId null)', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '대분류 추가' }))
    await user.type(within(dialog()).getByLabelText('이름'), '  베이커리 ')
    await user.click(within(dialog()).getByRole('button', { name: '추가' }))

    expect(fns.createCategory).toHaveBeenCalledWith({ name: '베이커리', parentId: null }, expect.any(Object))
  })

  it('대분류 줄에서 그 아래 소분류를 추가한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('소분류 추가', '푸드'))
    expect(screen.getByRole('dialog', { name: '소분류 추가 · 푸드' })).toBeInTheDocument()
    await user.type(within(dialog()).getByLabelText('이름'), '빵')
    await user.click(within(dialog()).getByRole('button', { name: '추가' }))

    expect(fns.createCategory).toHaveBeenCalledWith({ name: '빵', parentId: 2 }, expect.any(Object))
  })

  it('이름이 비면 요청하지 않고 안내한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '대분류 추가' }))
    await user.click(within(dialog()).getByRole('button', { name: '추가' }))

    expect(fns.createCategory).not.toHaveBeenCalled()
    expect(within(dialog()).getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(within(dialog()).getByLabelText('이름')).toHaveFocus()
  })

  it('소분류가 있는 대분류는 삭제를 막고 사유를 알리며 변경은 할 수 있다', async () => {
    setup()
    renderPage()

    expect(button('삭제', '음료')).toBeDisabled()
    expect(button('변경', '음료')).toBeEnabled()
    expect(button('삭제', 'MD')).toBeEnabled()
    await userEvent.setup().hover(button('삭제', '음료').parentElement!)
    // 소분류가 있는 대분류(음료·푸드)마다 같은 사유를 툴팁으로 단다
    expect(await screen.findAllByText(/소분류가 있는 대분류는 삭제할 수 없습니다/)).toHaveLength(2)
  })

  it('줄마다 변경 버튼 하나로 이름과 부모를 함께 바꾼다(이름 변경·부모 변경 버튼은 따로 없다)', () => {
    setup()
    renderPage()

    expect(button('변경', '커피')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /이름 변경/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /부모 변경/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /소분류로 변경/ })).not.toBeInTheDocument()
  })

  it('변경 모달은 현재 이름과 상위 대분류를 채워 열고 바뀐 게 없으면 요청 없이 닫는다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    expect(screen.getByRole('dialog', { name: '카테고리 변경 · 커피' })).toBeInTheDocument()
    expect(within(dialog()).getByLabelText('이름')).toHaveValue('커피')
    expect(within(dialog()).getByLabelText('상위 대분류')).toHaveValue('1')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.renameCategory).not.toHaveBeenCalled()
    expect(fns.moveCategory).not.toHaveBeenCalled()
  })

  it('이름만 바꾸면 이름 변경만 요청한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.type(within(dialog()).getByLabelText('이름'), '에스프레소')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.renameCategory).toHaveBeenCalledWith({ id: 5, name: '에스프레소' })
    expect(fns.moveCategory).not.toHaveBeenCalled()
  })

  it('소분류를 다른 대분류로 옮긴다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    await user.selectOptions(within(dialog()).getByLabelText('상위 대분류'), '푸드')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.moveCategory).toHaveBeenCalledWith({ id: 5, parentId: 2 })
    expect(fns.renameCategory).not.toHaveBeenCalled()
  })

  it('소분류를 대분류로 승격하면 parentId를 null로 보낸다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '디저트'))
    await user.selectOptions(within(dialog()).getByLabelText('상위 대분류'), '대분류로 승격 (상위 없음)')
    expect(within(dialog()).getByText(/쓰는 상품이 있으면 승격할 수 없습니다/)).toBeInTheDocument()
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.moveCategory).toHaveBeenCalledWith({ id: 7, parentId: null })
  })

  it('이름과 부모를 함께 바꾸면 부모를 먼저 바꾼 뒤 이름을 바꾸고 토스트로 알린다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.type(within(dialog()).getByLabelText('이름'), '에스프레소')
    await user.selectOptions(within(dialog()).getByLabelText('상위 대분류'), '푸드')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.moveCategory).toHaveBeenCalledWith({ id: 5, parentId: 2 })
    expect(fns.renameCategory).toHaveBeenCalledWith({ id: 5, name: '에스프레소' })
    expect(fns.moveCategory.mock.invocationCallOrder[0]).toBeLessThan(fns.renameCategory.mock.invocationCallOrder[0])
    expect(await screen.findByText('"에스프레소" 카테고리를 변경했습니다.')).toBeInTheDocument()
  })

  it('부모 변경이 거부되면 이름도 바꾸지 않고 모달을 열어 둔다', async () => {
    fns.moveCategory.mockRejectedValueOnce(new ApiError('x', { status: 409, code: 'REFERENCED_CATEGORY_NOT_PROMOTABLE' }))
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.type(within(dialog()).getByLabelText('이름'), '에스프레소')
    await user.selectOptions(within(dialog()).getByLabelText('상위 대분류'), '대분류로 승격 (상위 없음)')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.renameCategory).not.toHaveBeenCalled()
    expect(dialog()).toBeInTheDocument()
  })

  it('저장이 서버에서 거부되면 모달 안에 code별 안내를 보여준다', async () => {
    setup({ moveCategory: { isError: true, error: new ApiError('x', { status: 409, code: 'REFERENCED_CATEGORY_NOT_PROMOTABLE' }) } })
    renderPage()

    await userEvent.setup().click(button('변경', '커피'))

    expect(within(dialog()).getByRole('alert')).toHaveTextContent('대분류로 바꿀 수 없습니다')
  })

  it('이름을 비우면 요청하지 않고 안내한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', '커피'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(within(dialog()).getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(fns.renameCategory).not.toHaveBeenCalled()
  })

  it('소분류가 있는 대분류는 이름만 바꿀 수 있고 상위 대분류 선택은 잠긴다', async () => {
    setup()
    renderPage()

    await userEvent.setup().click(button('변경', '음료'))

    expect(within(dialog()).getByLabelText('상위 대분류')).toBeDisabled()
    expect(within(dialog()).getByText('소분류가 있는 대분류는 다른 대분류의 소분류로 바꿀 수 없습니다.')).toBeInTheDocument()
  })

  it('소분류가 없는 대분류는 다른 대분류 아래의 소분류로 바꿀 수 있다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('변경', 'MD'))
    expect(within(dialog()).getByLabelText('상위 대분류')).toHaveValue('none')
    expect(within(dialog()).queryByRole('option', { name: 'MD' })).not.toBeInTheDocument()
    await user.selectOptions(within(dialog()).getByLabelText('상위 대분류'), '음료')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.moveCategory).toHaveBeenCalledWith({ id: 3, parentId: 1 })
  })

  it('삭제는 확인 모달을 거친 뒤에만 요청한다', async () => {
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(button('삭제', '커피'))
    expect(fns.deleteCategory).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog', { name: '"커피" 카테고리를 삭제할까요?' })).getByRole('button', { name: '삭제' }))

    expect(fns.deleteCategory).toHaveBeenCalledWith(5, expect.any(Object))
  })

  it('삭제가 서버에서 거부되면 code별 안내를 보여준다', () => {
    setup({ deleteCategory: { isError: true, error: new ApiError('x', { status: 409, code: 'CATEGORY_STILL_REFERENCED' }) } })
    renderPage()

    expect(screen.getByRole('alert')).toHaveTextContent('이 카테고리를 쓰는 상품이 있어 삭제할 수 없습니다.')
  })

  it('성공하면 토스트로 알린다', async () => {
    fns.createCategory.mockImplementation((_body, handlers) => handlers.onSuccess())
    setup()
    renderPage()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '대분류 추가' }))
    await user.type(within(dialog()).getByLabelText('이름'), '베이커리')
    await user.click(within(dialog()).getByRole('button', { name: '추가' }))

    expect(await screen.findByText('대분류 "베이커리"을 추가했습니다.')).toBeInTheDocument()
  })

  it('조회 권한만 있으면 추가 버튼은 숨기고 변경 버튼은 모두 비활성화한다', async () => {
    setup()
    renderPage([permissions.catalogRead])

    expect(screen.queryByRole('button', { name: '대분류 추가' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /소분류 추가/ })).not.toBeInTheDocument()
    expect(button('변경', '커피')).toBeDisabled()
    expect(button('삭제', 'MD')).toBeDisabled()
    await userEvent.setup().hover(button('삭제', 'MD').parentElement!)
    expect((await screen.findAllByText('분류를 변경할 권한이 없습니다.')).length).toBeGreaterThan(0)
  })

  it('카테고리가 없으면 대분류부터 추가하라고 안내한다', () => {
    setup()
    vi.mocked(useCategories).mockReturnValue({ isLoading: false, isError: false, data: [] } as never)
    renderPage()

    expect(screen.getByText(/등록된 카테고리가 없습니다. 대분류를 먼저 추가하세요./)).toBeInTheDocument()
  })
})

describe('태그', () => {
  async function openTags() {
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '태그' }))
    return user
  }

  it('태그 목록을 보여주고 등록 버튼은 없으며 만드는 방법을 안내한다', async () => {
    setup()
    renderPage()
    await openTags()

    expect(screen.getByText('베스트', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /추가/ })).not.toBeInTheDocument()
    const tip = screen.getByText(/상품 등록·수정에서 이름을 입력하면 만들어집니다/)
    expect(tip).not.toBeVisible()
    await userEvent.setup().hover(screen.getByRole('img', { name: '태그 안내' }))
    expect(tip).toBeVisible()
  })

  it('검색어로 목록을 거른다', async () => {
    setup()
    renderPage()
    const user = await openTags()

    await user.type(screen.getByLabelText('검색'), '시즌')

    expect(screen.getByText('시즌한정', { selector: 'strong' })).toBeInTheDocument()
    expect(screen.queryByText('베스트', { selector: 'strong' })).not.toBeInTheDocument()

    await user.clear(screen.getByLabelText('검색'))
    await user.type(screen.getByLabelText('검색'), '없는태그')
    expect(screen.getByText('검색 결과가 없습니다.')).toBeInTheDocument()
  })

  it('이름을 바꾼다', async () => {
    setup()
    renderPage()
    const user = await openTags()

    await user.click(button('변경', '베스트'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.type(within(dialog()).getByLabelText('이름'), 'BEST')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.renameTag).toHaveBeenCalledWith({ id: 2, name: 'BEST' }, expect.any(Object))
  })

  it('같은 이름의 다른 태그가 있으면 모달 안에 안내한다', async () => {
    setup({ renameTag: { isError: true, error: new ApiError('x', { status: 409, code: 'TAG_NAME_DUPLICATED' }) } })
    renderPage()
    const user = await openTags()

    await user.click(button('변경', '베스트'))

    expect(within(dialog()).getByRole('alert')).toHaveTextContent('이미 있는 태그 이름입니다.')
  })

  it('삭제 확인 모달에 영향을 받는 상품 수를 보여준다', async () => {
    countProducts.mockResolvedValue(7)
    setup()
    renderPage()
    const user = await openTags()

    await user.click(button('삭제', '베스트'))

    expect(countProducts).toHaveBeenCalledWith({ tagId: 2 })
    const confirm = await screen.findByRole('dialog', { name: '"베스트" 태그를 삭제할까요?' })
    expect(within(confirm).getByText('이 태그가 붙은 7개 상품에서 제거됩니다. 되돌릴 수 없습니다.')).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: '삭제' }))
    expect(fns.deleteTag).toHaveBeenCalledWith(2, expect.any(Object))
  })

  it('상품 수를 못 구해도 삭제를 확인할 수 있고 수 없이 안내한다', async () => {
    countProducts.mockRejectedValue(new Error('network'))
    setup()
    renderPage()
    const user = await openTags()

    await user.click(button('삭제', '신메뉴'))

    expect(await screen.findByText('이 태그가 붙은 모든 상품에서 제거되며 되돌릴 수 없습니다.')).toBeInTheDocument()
  })

  it('확인 모달에서 취소하면 삭제하지 않는다', async () => {
    setup()
    renderPage()
    const user = await openTags()

    await user.click(button('삭제', '베스트'))
    await user.click(within(await screen.findByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(fns.deleteTag).not.toHaveBeenCalled()
  })

  it('조회 권한만 있으면 변경 버튼이 비활성이다', async () => {
    setup()
    renderPage([permissions.catalogRead])
    await openTags()

    expect(button('변경', '베스트')).toBeDisabled()
    expect(button('삭제', '베스트')).toBeDisabled()
  })
})

describe('상품 그룹', () => {
  async function openGroups() {
    const user = userEvent.setup()
    await user.click(screen.getByRole('tab', { name: '상품 그룹' }))
    return user
  }

  it('그룹을 추가한다', async () => {
    setup()
    renderPage()
    const user = await openGroups()

    await user.click(screen.getByRole('button', { name: '그룹 추가' }))
    await user.type(within(dialog()).getByLabelText('이름'), '봄 시즌')
    await user.click(within(dialog()).getByRole('button', { name: '추가' }))

    expect(fns.createGroup).toHaveBeenCalledWith('봄 시즌', expect.any(Object))
  })

  it('이름을 바꾼다', async () => {
    setup()
    renderPage()
    const user = await openGroups()

    await user.click(button('변경', '여름 시즌'))
    await user.clear(within(dialog()).getByLabelText('이름'))
    await user.type(within(dialog()).getByLabelText('이름'), '여름 한정')
    await user.click(within(dialog()).getByRole('button', { name: '저장' }))

    expect(fns.renameGroup).toHaveBeenCalledWith({ id: 1, name: '여름 한정' }, expect.any(Object))
  })

  it('삭제 확인 모달에 속한 상품 수를 보여준다', async () => {
    countProducts.mockResolvedValue(3)
    setup()
    renderPage()
    const user = await openGroups()

    await user.click(button('삭제', '겨울 시즌'))

    expect(countProducts).toHaveBeenCalledWith({ groupId: 2 })
    const confirm = await screen.findByRole('dialog', { name: '"겨울 시즌" 상품 그룹을 삭제할까요?' })
    expect(within(confirm).getByText('이 상품 그룹에 속한 3개 상품에서 제거됩니다. 되돌릴 수 없습니다.')).toBeInTheDocument()
    await user.click(within(confirm).getByRole('button', { name: '삭제' }))
    expect(fns.deleteGroup).toHaveBeenCalledWith(2, expect.any(Object))
  })

  it('조회 권한만 있으면 추가 버튼은 숨기고 변경 버튼은 비활성이다', async () => {
    setup()
    renderPage([permissions.catalogRead])
    await openGroups()

    expect(screen.queryByRole('button', { name: '그룹 추가' })).not.toBeInTheDocument()
    expect(button('삭제', '여름 시즌')).toBeDisabled()
  })
})
