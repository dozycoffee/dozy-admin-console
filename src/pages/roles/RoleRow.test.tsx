import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import type { Role } from '../../features/role/model/roleSchemas'
import { useUpdateRole } from '../../features/role/model/useRoles'
import { RoleRow } from './RoleRow'

vi.mock('../../features/role/model/useRoles')

const role: Role = { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: '입출고 관리', isSystem: false, grantedCount: 3 }
const systemRole: Role = { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 }
const mutate = vi.fn()

function setup(target: Role, { writable = true, state = {} as Record<string, unknown> } = {}) {
  vi.mocked(useUpdateRole).mockReturnValue({ mutate, reset: vi.fn(), isPending: false, isError: false, ...state } as never)
  const onDelete = vi.fn()
  render(<ul><RoleRow role={target} writable={writable} deleting={false} onDelete={onDelete} /></ul>)
  return onDelete
}

beforeEach(() => vi.clearAllMocks())

describe('RoleRow', () => {
  it('role 정보와 부여된 인원 수를 보여준다', () => {
    setup(role)

    expect(screen.getByText('창고 관리자')).toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager').tagName).toBe('CODE') // 이름 옆의 작은 고정폭 칩
    expect(screen.getByText('입출고 관리')).toBeInTheDocument()
    expect(screen.getByText('3명')).toBeInTheDocument()
  })

  it('system role은 표시하고 수정·삭제할 수 없다', () => {
    setup(systemRole)

    expect(screen.getByText('system')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
  })

  it('쓰기 권한이 없으면 수정·삭제할 수 없다', () => {
    setup(role, { writable: false })

    expect(screen.getByRole('button', { name: '수정' })).toBeDisabled()
    expect(screen.getByRole('button', { name: '삭제' })).toBeDisabled()
  })

  it('삭제를 누르면 role을 부모에 알린다', async () => {
    const onDelete = setup(role)

    await userEvent.setup().click(screen.getByRole('button', { name: '삭제' }))

    expect(onDelete).toHaveBeenCalledWith(role)
  })

  it('이름과 설명만 수정할 수 있고 바뀐 필드만 보낸다', async () => {
    setup(role)
    mutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '수정' }))
    expect(screen.getByText(/code와 서비스는 바꿀 수 없습니다/)).toBeInTheDocument()
    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '창고 책임자')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutate.mock.calls[0][0]).toEqual({ roleId: 11, body: { name: '창고 책임자' } })
    expect(screen.queryByLabelText('이름')).not.toBeInTheDocument()
  })

  it('설명을 비우면 빈 문자열로 보내 설명을 지운다', async () => {
    setup(role)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.clear(screen.getByLabelText('설명'))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutate.mock.calls[0][0]).toEqual({ roleId: 11, body: { description: '' } })
  })

  it('바뀐 것이 없으면 요청 없이 닫는다', async () => {
    setup(role)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
  })

  it('수정을 누르면 목록 항목은 그대로 두고 모달로 수정 폼을 연다', async () => {
    setup(role)
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '수정' }))

    const dialog = screen.getByRole('dialog', { name: 'role 수정 · 창고 관리자' })
    expect(within(dialog).getByLabelText('이름')).toHaveValue('창고 관리자')
    expect(within(dialog).getByLabelText('설명')).toHaveValue('입출고 관리')
    expect(within(dialog).getByText('wms:warehouse_manager')).toBeInTheDocument()
    expect(screen.getByText('3명')).toBeInTheDocument() // 항목이 폼으로 바뀌지 않고 목록에 남아 있다
  })

  it('수정 모달은 Esc로 닫히고 입력은 버려진다', async () => {
    setup(role)
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.clear(screen.getByLabelText('이름'))
    await user.type(screen.getByLabelText('이름'), '바꾼 이름')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: '수정' }))

    expect(screen.getByLabelText('이름')).toHaveValue('창고 관리자')
    expect(mutate).not.toHaveBeenCalled()
  })

  it('수정을 취소하면 닫는다', async () => {
    setup(role)
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '수정' }))
    await user.click(screen.getByRole('button', { name: '취소' }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '수정' })).toBeInTheDocument()
  })

  it('수정 에러를 안내한다', async () => {
    setup(role, { state: { isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }) } })
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '수정' }))

    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })
})
