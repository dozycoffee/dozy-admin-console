import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { AuthContext } from '../../features/auth/model/authContext'
import type { CurrentUser } from '../../features/auth/model/permissions'
import type { EmployeeSummary } from '../../features/employee/model/employeeSchemas'
import { useEmployees } from '../../features/employee/model/useEmployees'
import { useCancelOwnerTransfer, useRequestOwnerTransfer } from '../../features/owner-transfer/model/useOwnerTransfer'
import { OwnerTransferPage } from './OwnerTransferPage'

vi.mock('../../features/employee/model/useEmployees')
vi.mock('../../features/owner-transfer/model/useOwnerTransfer')

const me: CurrentUser = { id: 'p-owner', name: '대표', actorModes: [], permissions: [], scope: { warehouseIds: [] } }
const employee = (id: string, name: string): EmployeeSummary => ({ principalId: id, email: `${id}@dozycoffee.com`, name, status: 'ACTIVE', roles: [], createdAt: '2026-09-24T05:00:00Z' })
const requestMutate = vi.fn()
const cancelMutate = vi.fn()

function setup(items: EmployeeSummary[] = [employee('p-owner', '대표'), employee('p-kim', '김도윤'), employee('p-lee', '이서연')], state: { request?: Record<string, unknown>; cancel?: Record<string, unknown>; total?: number } = {}) {
  vi.mocked(useEmployees).mockReturnValue({ isLoading: false, isError: false, data: { items, page: { number: 0, size: 50, totalElements: state.total ?? items.length, totalPages: 1 } } } as never)
  vi.mocked(useRequestOwnerTransfer).mockReturnValue({ mutate: requestMutate, reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...state.request } as never)
  vi.mocked(useCancelOwnerTransfer).mockReturnValue({ mutate: cancelMutate, reset: vi.fn(), isPending: false, isError: false, isSuccess: false, ...state.cancel } as never)
  render(
    <AuthContext.Provider value={{ user: me, isLoading: false, activeActorMode: null, can: () => true, selectActorMode: vi.fn(), clearActorMode: vi.fn(), login: vi.fn(), logout: vi.fn() }}>
      <OwnerTransferPage />
    </AuthContext.Provider>,
  )
}

beforeEach(() => vi.clearAllMocks())

describe('OwnerTransferPage', () => {
  it('양도 전 영향을 먼저 안내한다', () => {
    setup()

    expect(screen.getByText(/나는 role이 없는 직원/)).toBeInTheDocument()
    expect(screen.getByText(/모든 로그인 세션이 폐기/)).toBeInTheDocument()
    expect(screen.getByText(/본인 계정으로 로그인한 상태에서 메일 링크를 열어 수락/)).toBeInTheDocument()
  })

  it('활성 직원만 조회하고 본인은 대상 목록에서 뺀다', () => {
    setup()

    expect(vi.mocked(useEmployees)).toHaveBeenLastCalledWith({ status: 'ACTIVE', q: '', page: 0, size: 50 })
    expect(screen.getByRole('radio', { name: /김도윤/ })).toBeInTheDocument()
    expect(screen.queryByRole('radio', { name: /대표/ })).not.toBeInTheDocument()
  })

  it('대상을 고르기 전에는 양도 요청 버튼이 비활성이다', () => {
    setup()

    expect(screen.getByRole('button', { name: 'owner 양도 요청' })).toBeDisabled()
  })

  it('검색어로 대상을 좁힌다', async () => {
    setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('이름·이메일'), '김')
    await user.click(screen.getByRole('button', { name: '검색' }))

    expect(vi.mocked(useEmployees)).toHaveBeenLastCalledWith(expect.objectContaining({ q: '김' }))
  })

  it('대상을 고르고 확인 모달에서 한 번 더 확인해야 요청한다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: /김도윤/ }))
    await user.click(screen.getByRole('button', { name: 'owner 양도 요청' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('김도윤님에게 owner를 양도할까요?')
    expect(dialog).toHaveTextContent('모든 세션이 폐기됩니다')
    expect(requestMutate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '양도 요청' }))

    expect(requestMutate.mock.calls[0][0]).toBe('p-kim')
  })

  it('확인 모달에서 취소하면 요청하지 않는다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: /김도윤/ }))
    await user.click(screen.getByRole('button', { name: 'owner 양도 요청' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '취소' }))

    expect(requestMutate).not.toHaveBeenCalled()
  })

  it('요청에 성공하면 대상 이름과 만료 시각을 안내하고 선택을 비운다', async () => {
    setup()
    requestMutate.mockImplementation((_id, options) => options.onSuccess({ expiresAt: '2026-10-16T05:00:00Z' }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('radio', { name: /김도윤/ }))
    await user.click(screen.getByRole('button', { name: 'owner 양도 요청' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '양도 요청' }))

    expect(screen.getByRole('status')).toHaveTextContent('김도윤님에게 수락 메일을 보냈습니다.')
    expect(screen.getByRole('button', { name: 'owner 양도 요청' })).toBeDisabled()
  })

  it('요청 실패는 단계에 맞는 안내를 보여준다', () => {
    setup(undefined, { request: { isError: true, error: new ApiError('x', { status: 409, code: 'INVALID_STATE' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('이미 진행 중인 양도가 있거나')
  })

  it('양도 취소는 확인을 거쳐 요청하고 성공을 안내한다', async () => {
    setup()
    cancelMutate.mockImplementation((_arg, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '양도 취소' }))
    expect(cancelMutate).not.toHaveBeenCalled()
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '양도 취소' }))

    expect(cancelMutate).toHaveBeenCalledTimes(1)
  })

  it('취소할 양도가 없으면 안내한다', () => {
    setup(undefined, { cancel: { isError: true, error: new ApiError('x', { status: 404, code: 'NOT_FOUND' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('진행 중인 양도가 없습니다.')
  })

  it('후보가 없으면 안내하고, 많으면 50명까지만 보인다고 알린다', () => {
    setup([employee('p-owner', '대표')])
    expect(screen.getByText('양도할 수 있는 활성 직원이 없습니다.')).toBeInTheDocument()
  })

  it('검색 결과가 50명을 넘으면 좁히라고 안내한다', () => {
    setup(undefined, { total: 120 })

    expect(screen.getByText(/50명까지만 보입니다/)).toBeInTheDocument()
  })

  it('선택한 대상을 다시 누르면 선택이 풀리고 양도 요청 버튼이 다시 비활성이 된다', async () => {
    setup()
    const user = userEvent.setup()
    const radio = screen.getByRole('radio', { name: /김도윤/ })

    await user.click(radio)
    expect(radio).toBeChecked()
    expect(screen.getByRole('button', { name: 'owner 양도 요청' })).toBeEnabled()

    await user.click(radio)

    expect(radio).not.toBeChecked()
    expect(screen.getByRole('button', { name: 'owner 양도 요청' })).toBeDisabled()
  })

  it('선택을 푼 뒤 다시 누르면 다시 선택된다', async () => {
    setup()
    const user = userEvent.setup()
    const radio = screen.getByRole('radio', { name: /김도윤/ })

    await user.click(radio)
    await user.click(radio)
    await user.click(radio)

    expect(radio).toBeChecked()
  })

  it('다른 대상을 누르면 선택이 그 대상으로 옮겨 간다(풀리지 않는다)', async () => {
    setup()
    const user = userEvent.setup()
    const radios = screen.getAllByRole('radio')
    expect(radios.length).toBeGreaterThanOrEqual(2)

    await user.click(radios[0])
    await user.click(radios[1])

    expect(radios[0]).not.toBeChecked()
    expect(radios[1]).toBeChecked()
  })

  it('목록 위에 활성 직원 안내 문구를 따로 두지 않는다(양도 전 확인 안내에 같은 내용이 있다)', () => {
    setup()

    expect(screen.queryByText(/활성 직원 중에서 한 명을 선택합니다/)).not.toBeInTheDocument()
    expect(screen.getByText(/대상은 활성 직원이어야 합니다/)).toBeInTheDocument()
  })
})
