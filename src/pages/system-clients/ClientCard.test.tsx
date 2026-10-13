import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { ToastContext } from '../../shared/ui/toastContext'
import type { Role } from '../../features/role/model/roleSchemas'
import type { SystemClient } from '../../features/system-client/model/systemClientSchemas'
import { useDeactivateSystemClient, useGrantClientRole, useRevokeClientRole, useRotateClientSecret } from '../../features/system-client/model/useSystemClients'
import { ClientCard } from './ClientCard'

vi.mock('../../features/system-client/model/useSystemClients')

const role = (fullCode: string, name: string, isSystem = false): Role => {
  const [audience, code] = fullCode.split(':')
  return { id: fullCode.length, audience, code, fullCode, name, description: null, isSystem, grantedCount: 0 }
}
const catalog = [role('auth:owner', 'Owner', true), role('auth:admin', 'Admin', true), role('auth:partner_reader', '파트너 조회'), role('wms:viewer', '재고 조회')]
const base: SystemClient = { principalId: 'p-1', clientId: 'svc-store', name: 'Store 서비스', status: 'ACTIVE', roles: ['auth:partner_reader'], secretRotatedAt: '2026-09-24T05:00:00Z', createdAt: '2026-09-24T05:00:00Z' }

const notify = vi.fn()
const rotateMutate = vi.fn(); const grantMutate = vi.fn(); const revokeMutate = vi.fn(); const deactivateMutate = vi.fn()
const mutation = (mutate: ReturnType<typeof vi.fn>, state: Record<string, unknown> = {}) => ({ mutate, reset: vi.fn(), isPending: false, isError: false, ...state }) as never

function setup(client: SystemClient = base, { writable = true, expanded = true, rotate = {}, grant = {}, revoke = {}, deactivate = {} }: { writable?: boolean; expanded?: boolean; rotate?: Record<string, unknown>; grant?: Record<string, unknown>; revoke?: Record<string, unknown>; deactivate?: Record<string, unknown> } = {}) {
  vi.mocked(useRotateClientSecret).mockReturnValue(mutation(rotateMutate, rotate))
  vi.mocked(useGrantClientRole).mockReturnValue(mutation(grantMutate, grant))
  vi.mocked(useRevokeClientRole).mockReturnValue(mutation(revokeMutate, revoke))
  vi.mocked(useDeactivateSystemClient).mockReturnValue(mutation(deactivateMutate, deactivate))
  const onRotated = vi.fn()
  const onToggle = vi.fn()
  render(<ToastContext.Provider value={{ notify }}><ul><ClientCard client={client} allRoles={catalog} writable={writable} onRotated={onRotated} expanded={expanded} onToggle={onToggle} /></ul></ToastContext.Provider>)
  return Object.assign(onRotated, { onToggle })
}

/** 컨트롤이 비활성일 때 감싼 툴팁이 가진 사유(없으면 빈 문자열) */
const reasonOf = (element: HTMLElement) => element.closest('.tooltip-anchor')?.querySelector('[role=tooltip]')?.textContent ?? ''

const optionValues = () => Array.from(screen.getByLabelText('role 추가').querySelectorAll('option')).map((option) => (option as HTMLOptionElement).value).filter(Boolean)

beforeEach(() => vi.clearAllMocks())

describe('ClientCard 표시', () => {
  it('clientId·이름·상태·role·secret 발급 시각을 보여준다', () => {
    setup()

    expect(screen.getByRole('heading', { name: 'Store 서비스' })).toBeInTheDocument()
    expect(screen.getByText('svc-store')).toBeInTheDocument()
    expect(screen.getByText('auth:partner_reader')).toBeInTheDocument()
    expect(screen.getByText('활성')).toBeInTheDocument()
  })

  it('부여할 role 선택지에서 system role과 이미 가진 role을 뺀다', () => {
    setup()

    expect(optionValues()).toEqual(['wms:viewer'])
  })

  it('role이 없으면 토큰으로 서비스를 호출할 수 없다고 안내한다', () => {
    setup({ ...base, roles: [] })

    expect(screen.getByText(/어떤 서비스도 호출할 수 없습니다/)).toBeInTheDocument()
  })

  it('폐기된 클라이언트도 컨트롤은 그대로 두되 모두 비활성이고 이유는 툴팁으로 알려 준다', () => {
    setup({ ...base, status: 'DEACTIVATED', clientId: 'deleted-p-1', roles: [], secretRotatedAt: null })

    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '폐기' })).toBeDisabled()
    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(reasonOf(screen.getByRole('button', { name: '폐기' }))).toBe('이미 폐기된 클라이언트입니다. clientId는 새로 등록해 다시 쓸 수 있습니다.')
    expect(reasonOf(screen.getByRole('button', { name: 'secret 재발급' }))).toBe('폐기된 클라이언트는 secret을 재발급할 수 없습니다.')
    expect(reasonOf(screen.getByLabelText('role 추가'))).toBe('폐기된 클라이언트에는 role을 부여할 수 없습니다.')
    expect(document.querySelector('.client-card p.employee-hint')).toBeNull() // 본문 문장으로 늘어놓지 않는다
  })

  it('정지된 클라이언트는 재발급·role 부여가 비활성이고 이유를 툴팁으로 알려 준다', () => {
    setup({ ...base, status: 'SUSPENDED' })

    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeDisabled()
    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(reasonOf(screen.getByLabelText('role 추가'))).toBe('정지된 클라이언트에는 role을 부여할 수 없습니다.')
    expect(reasonOf(screen.getByRole('button', { name: 'secret 재발급' }))).toMatch(/활성 상태에서만 할 수 있습니다/)
    expect(screen.getByRole('button', { name: '폐기' })).toBeEnabled() // 정지된 클라이언트도 폐기할 수 있다
  })

  it('활성 client에는 툴팁이 없다', () => {
    setup()

    expect(screen.queryByRole('tooltip', { hidden: true })).not.toBeInTheDocument()
  })

  it('role 선택지는 서비스별 그룹으로 묶어서 보여준다', () => {
    setup()

    const groups = Array.from(screen.getByLabelText('role 추가').querySelectorAll('optgroup')).map((group) => group.label)
    expect(groups).toEqual(['WMS'])
  })

  it('정보와 부여된 role 섹션을 제목으로 구분한다', () => {
    setup()

    expect(screen.getByRole('heading', { name: '부여된 role', level: 3 })).toBeInTheDocument()
  })
})

describe('ClientCard 작업', () => {
  it('secret 재발급은 기존 secret 무효 안내를 확인한 뒤 새 secret을 부모에 넘긴다', async () => {
    const onRotated = setup()
    rotateMutate.mockImplementation((_id, options) => options.onSuccess({ clientSecret: 'Qw4nV7pK' }))
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'secret 재발급' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('기존 secret은 즉시 무효가 됩니다')
    expect(rotateMutate).not.toHaveBeenCalled()
    await user.click(within(dialog).getByRole('button', { name: '재발급' }))

    expect(rotateMutate.mock.calls[0][0]).toBe('p-1')
    expect(onRotated).toHaveBeenCalledWith({ clientId: 'svc-store', clientSecret: 'Qw4nV7pK' })
  })

  it('role을 골라 부여하면 role 하나를 요청하고 선택을 비운다', async () => {
    setup()
    grantMutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.selectOptions(screen.getByLabelText('role 추가'), 'wms:viewer')
    await user.click(screen.getByRole('button', { name: '부여' }))

    expect(grantMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', role: 'wms:viewer' })
    expect(screen.getByLabelText('role 추가')).toHaveValue('')
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('role을 변경했습니다'))
  })

  it('role 칩의 × 버튼으로 회수한다', async () => {
    setup()

    revokeMutate.mockImplementation((_variables, options) => options.onSuccess())
    await userEvent.setup().click(screen.getByRole('button', { name: 'auth:partner_reader 회수' }))

    expect(revokeMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', role: 'auth:partner_reader' })
    expect(notify).toHaveBeenCalledWith(expect.stringContaining('role을 변경했습니다'))
  })

  it('폐기는 사유를 입력해야 하고 되돌릴 수 없다고 안내한다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '폐기' }))
    expect(screen.getByRole('dialog')).toHaveTextContent('되돌릴 수 없습니다')
    await user.type(screen.getByLabelText('사유'), '서비스 종료')
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: '폐기' }))

    expect(deactivateMutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', reason: '서비스 종료' })
    deactivateMutate.mock.calls[0][1].onSuccess()
    expect(notify).toHaveBeenCalledWith('클라이언트를 폐기했습니다.')
  })

  it('새 작업을 시작하면 이전 작업의 상태를 지운다', async () => {
    const reset = vi.fn()
    setup(base, { revoke: { reset } })

    await userEvent.setup().click(screen.getByRole('button', { name: 'auth:partner_reader 회수' }))

    expect(reset).toHaveBeenCalled()
  })

  it('작업이 실패하면 에러 code별 안내를 보여준다', () => {
    setup(base, { rotate: { isError: true, error: new ApiError('x', { status: 409, code: 'INVALID_STATE' }) } })

    expect(screen.getByRole('alert')).toHaveTextContent('현재 계정 상태에서는 할 수 없는 작업입니다.')
  })

  it('쓰기 권한이 없으면 모든 작업이 비활성이다', () => {
    setup(base, { writable: false })

    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '폐기' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'auth:partner_reader 회수' })).toBeDisabled()
    expect(screen.getByLabelText('role 추가')).toBeDisabled()
    expect(reasonOf(screen.getByRole('button', { name: '폐기' }))).toBe('시스템 클라이언트를 변경할 권한이 없습니다.')
  })
})

describe('ClientCard 펴기·접기', () => {
  const body = () => screen.getByRole('button', { name: 'secret 재발급', hidden: true }).closest('[hidden], div[id]')

  it('펼쳐져 있으면 상세가 보이고 헤더 버튼은 펼침 상태를 알린다', () => {
    setup(base)

    expect(screen.getByRole('button', { name: 'Store 서비스' })).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByRole('button', { name: 'secret 재발급' })).toBeVisible()
  })

  it('접으면 상세(정보·role·작업)는 숨기고 이름·clientId·role 수·상태만 보여준다', () => {
    setup(base, { expanded: false })

    expect(screen.getByRole('button', { name: 'Store 서비스' })).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('svc-store')).toBeVisible()
    expect(screen.getByText('role 1개')).toBeVisible()
    expect(screen.getByText('활성')).toBeVisible()
    expect(screen.getByRole('button', { name: 'secret 재발급', hidden: true })).not.toBeVisible()
    expect(body()).toHaveAttribute('hidden')
  })

  it('헤더 버튼을 누르면 펴고 접기를 요청한다', async () => {
    const view = setup(base)

    await userEvent.setup().click(screen.getByRole('button', { name: 'Store 서비스' }))

    expect(view.onToggle).toHaveBeenCalledTimes(1)
  })

  it('접어 둔 사이에도 role 선택 같은 입력 상태는 사라지지 않는다', async () => {
    const { rerender } = render(<ul><ClientCard client={base} allRoles={catalog} writable onRotated={vi.fn()} expanded onToggle={vi.fn()} /></ul>)
    await userEvent.setup().selectOptions(screen.getByLabelText('role 추가'), 'wms:viewer')

    rerender(<ul><ClientCard client={base} allRoles={catalog} writable onRotated={vi.fn()} expanded={false} onToggle={vi.fn()} /></ul>)
    rerender(<ul><ClientCard client={base} allRoles={catalog} writable onRotated={vi.fn()} expanded onToggle={vi.fn()} /></ul>)

    expect(screen.getByLabelText('role 추가')).toHaveValue('wms:viewer')
  })
})
