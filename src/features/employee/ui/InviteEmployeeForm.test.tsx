import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import { useRoles } from '../../role/model/useRoles'
import { useInviteEmployee } from '../model/useEmployees'
import { InviteEmployeeForm } from './InviteEmployeeForm'

vi.mock('../../role/model/useRoles')
vi.mock('../model/useEmployees')

const mockedUseRoles = vi.mocked(useRoles)
const mockedUseInviteEmployee = vi.mocked(useInviteEmployee)

const roles = [
  { id: 1, audience: 'auth', code: 'owner', fullCode: 'auth:owner', name: 'Owner', description: null, isSystem: true, grantedCount: 1 },
  { id: 2, audience: 'auth', code: 'admin', fullCode: 'auth:admin', name: 'Admin', description: null, isSystem: true, grantedCount: 0 },
  { id: 11, audience: 'wms', code: 'warehouse_manager', fullCode: 'wms:warehouse_manager', name: '창고 관리자', description: null, isSystem: false, grantedCount: 3 },
]

function setup(overrides: Partial<ReturnType<typeof useInviteEmployee>> = {}, rolesResult: Partial<ReturnType<typeof useRoles>> = { data: roles }) {
  const mutate = vi.fn()
  mockedUseRoles.mockReturnValue({ isLoading: false, isError: false, ...rolesResult } as never)
  mockedUseInviteEmployee.mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...overrides } as never)
  return mutate
}

const goToRoles = (user: ReturnType<typeof userEvent.setup>) => user.click(screen.getByRole('button', { name: '다음' }))

describe('InviteEmployeeForm', () => {
  it('system role은 선택지에서 빼고 일반 role만 보여준다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await goToRoles(user)

    expect(screen.getByLabelText(/창고 관리자/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Owner/)).not.toBeInTheDocument()
    expect(screen.queryByLabelText(/Admin/)).not.toBeInTheDocument()
  })

  it('이메일과 이름에 무엇을 넣는지 플레이스홀더로 예시를 보여준다', () => {
    setup()

    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByLabelText('이메일')).toHaveAttribute('placeholder', 'name@dozycoffee.com')
    expect(screen.getByLabelText('이름')).toHaveAttribute('placeholder', '홍길동')
  })

  it('입력하는 동안에는 오류를 띄우지 않고 필드를 벗어나면 이유를 보여준다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), 'not-an-email')
    expect(screen.queryByText(/올바른 이메일 형식/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).not.toHaveAttribute('aria-invalid')

    await user.tab()
    expect(screen.getByText(/올바른 이메일 형식으로 입력하세요/)).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveAttribute('aria-invalid', 'true')
    expect(screen.getByLabelText('이메일')).toHaveAccessibleDescription(/올바른 이메일 형식으로 입력하세요/)
  })

  it('오류 문구 자리는 오류가 없을 때도 비워 두어 오류가 뜨고 사라져도 레이아웃이 변하지 않는다', async () => {
    setup()
    const user = userEvent.setup()
    const { container } = render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    const slots = () => [...container.querySelectorAll('.field-error')]
    expect(slots()).toHaveLength(4) // 이메일·이름·전화번호·주소가 같은 간격을 갖도록 모든 필드에 자리를 둔다
    expect(slots().every((slot) => slot.textContent === '')).toBe(true)

    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(slots()).toHaveLength(4)
    expect(slots().map((slot) => slot.textContent)).toEqual(['이메일을 입력하세요.', '이름을 입력하세요.', '', ''])
  })

  it('오류가 뜬 뒤 올바르게 고치면 바로 사라진다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'bad')
    await user.tab()
    expect(screen.getByText(/올바른 이메일 형식/)).toBeInTheDocument()

    await user.type(screen.getByLabelText('이메일'), '@dozycoffee.com')

    expect(screen.queryByText(/올바른 이메일 형식/)).not.toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).not.toHaveAttribute('aria-invalid')
  })

  it('입력이 잘못된 채 다음을 누르면 넘어가지 않고 틀린 필드에 오류와 포커스를 준다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    const next = screen.getByRole('button', { name: '다음' })
    expect(next).toBeEnabled() // 비활성으로 막지 않고 눌렀을 때 이유를 알려 준다

    await user.click(next)

    expect(screen.getByText('이메일을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이메일')).toHaveFocus()
    expect(screen.queryByText('함께 부여할 role (선택)')).not.toBeInTheDocument()
  })

  it('이메일만 올바르고 이름이 비어 있으면 이름 필드로 포커스를 옮긴다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')

    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.queryByText(/올바른 이메일 형식/)).not.toBeInTheDocument()
    expect(screen.getByText('이름을 입력하세요.')).toBeInTheDocument()
    expect(screen.getByLabelText('이름')).toHaveFocus()
  })

  it('입력한 값과 선택한 role로 초대하고, 비어 있는 선택 필드는 보내지 않는다', async () => {
    const mutate = setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), ' new@dozycoffee.com ')
    await user.type(screen.getByLabelText('이름'), '신입')
    await goToRoles(user)
    await user.click(screen.getByLabelText(/창고 관리자/))
    await user.click(screen.getByRole('button', { name: '직원 추가하기' }))

    expect(mutate).toHaveBeenCalledTimes(1)
    expect(mutate.mock.calls[0][0]).toEqual({ email: 'new@dozycoffee.com', name: '신입', roles: ['wms:warehouse_manager'] })
  })

  it('role을 선택하지 않으면 roles를 보내지 않는다', async () => {
    const mutate = setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await user.type(screen.getByLabelText('전화번호 (선택)'), '010-1234-5678')
    await goToRoles(user)
    await user.click(screen.getByRole('button', { name: '직원 추가하기' }))

    expect(mutate.mock.calls[0][0]).toEqual({ email: 'new@dozycoffee.com', name: '신입', phone: '010-1234-5678' })
  })

  it('추가에 성공하면 입력을 비우고 새 직원의 id와 초대 만료 시각을 알린다', async () => {
    const mutate = setup()
    mutate.mockImplementation((_body, options) => options.onSuccess({ principalId: 'p-9', status: 'PENDING', invitationExpiresAt: '2026-09-27T05:00:00Z' }))
    const onInvited = vi.fn()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={onInvited} onCancel={vi.fn()} />)

    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await goToRoles(user)
    await user.click(screen.getByRole('button', { name: '직원 추가하기' }))

    expect(onInvited).toHaveBeenCalledWith({ principalId: 'p-9', invitationExpiresAt: '2026-09-27T05:00:00Z' })
    expect(screen.getByLabelText('이메일')).toHaveValue('')
    expect(screen.getByLabelText('이름')).toHaveValue('')
    expect(screen.getByRole('button', { name: '다음' })).toBeInTheDocument()
  })

  it('취소 버튼은 입력을 보내지 않고 닫기만 요청한다', async () => {
    const mutate = setup()
    const onCancel = vi.fn()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={onCancel} />)

    await userEvent.setup().click(screen.getByRole('button', { name: '취소' }))

    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(mutate).not.toHaveBeenCalled()
  })

  it('추가하면 초대 메일이 발송되고 직원이 비밀번호를 정해야 활성화된다고 안내한다', async () => {
    setup()
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await goToRoles(user)

    expect(screen.getByText(/추가하면 입력한 이메일로 초대 메일이 발송됩니다/)).toBeInTheDocument()
  })

  it('에러 code에 맞는 안내 문구를 보여준다', () => {
    setup({ isError: true, error: new ApiError('dup', { status: 409, code: 'DUPLICATE_EMAIL' }) } as never)

    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByRole('alert')).toHaveTextContent('이미 사용 중인 이메일입니다.')
  })

  it('쓰기 권한이 없으면 모든 입력과 버튼이 비활성이다', () => {
    setup()

    render(<InviteEmployeeForm writable={false} onInvited={vi.fn()} onCancel={vi.fn()} />)

    expect(screen.getByLabelText('이메일')).toBeDisabled()
    expect(screen.getByRole('button', { name: '다음' })).toBeDisabled()
  })

  it('부여할 수 있는 role이 없으면 안내 문구를 보여준다', async () => {
    setup({}, { data: [roles[0]] })
    const user = userEvent.setup()
    render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
    await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
    await user.type(screen.getByLabelText('이름'), '신입')
    await goToRoles(user)

    expect(screen.getByText(/부여할 수 있는 role이 아직 없습니다/)).toBeInTheDocument()
  })

  describe('2단계 구성', () => {
    const catalog = [
      ...roles,
      { id: 12, audience: 'wms', code: 'hq_inventory_manager', fullCode: 'wms:hq_inventory_manager', name: '본사 재고 담당자', description: null, isSystem: false, grantedCount: 1 },
      { id: 21, audience: 'catalog', code: 'merchandiser', fullCode: 'catalog:merchandiser', name: '상품 담당자', description: null, isSystem: false, grantedCount: 0 },
    ]
    const fillBasics = async (user: ReturnType<typeof userEvent.setup>) => {
      await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
      await user.type(screen.getByLabelText('이름'), '신입')
    }

    it('처음에는 기본 정보만 보이고 role 선택은 다음 단계에서 보인다', async () => {
      setup({}, { data: catalog })
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)

      expect(screen.queryByText('함께 부여할 role (선택)')).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: '직원 추가하기' })).not.toBeInTheDocument()

      await fillBasics(user)
      await goToRoles(user)

      expect(screen.getByText('함께 부여할 role (선택)')).toBeInTheDocument()
      expect(screen.queryByLabelText('이메일')).not.toBeInTheDocument()
    })

    it('role을 audience별 그룹 아래에 묶어서 보여준다', async () => {
      setup({}, { data: catalog })
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
      await fillBasics(user)
      await goToRoles(user)

      const wms = screen.getByRole('group', { name: 'WMS role' })
      expect(within(wms).getAllByRole('checkbox').map((box) => box.parentElement?.textContent)).toEqual([
        expect.stringContaining('창고 관리자'),
        expect.stringContaining('본사 재고 담당자'),
      ])
      expect(within(screen.getByRole('group', { name: 'CATALOG role' })).getByLabelText(/상품 담당자/)).toBeInTheDocument()
      expect(screen.queryByRole('group', { name: 'AUTH role' })).not.toBeInTheDocument()
    })

    it('이전을 누르면 입력한 값과 선택한 role이 그대로 유지된다', async () => {
      const mutate = setup({}, { data: catalog })
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
      await fillBasics(user)
      await goToRoles(user)
      await user.click(screen.getByLabelText(/상품 담당자/))

      await user.click(screen.getByRole('button', { name: '이전' }))
      expect(screen.getByLabelText('이메일')).toHaveValue('new@dozycoffee.com')
      await goToRoles(user)
      expect(screen.getByLabelText(/상품 담당자/)).toBeChecked()

      await user.click(screen.getByRole('button', { name: '직원 추가하기' }))
      expect(mutate.mock.calls[0][0]).toEqual({ email: 'new@dozycoffee.com', name: '신입', roles: ['catalog:merchandiser'] })
    })

    it('첫 단계에서 Enter를 눌러도 추가하지 않고 다음 단계로만 넘어간다', async () => {
      const mutate = setup({}, { data: catalog })
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
      await user.type(screen.getByLabelText('이메일'), 'new@dozycoffee.com')
      await user.type(screen.getByLabelText('이름'), '신입{Enter}')

      expect(screen.getByText('함께 부여할 role (선택)')).toBeInTheDocument()
      expect(mutate).not.toHaveBeenCalled()
    })

    it('입력이 올바르지 않으면 Enter로도 다음 단계로 넘어가지 않는다', async () => {
      setup({}, { data: catalog })
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} />)
      await user.type(screen.getByLabelText('이름'), '신입{Enter}')

      expect(screen.queryByText('함께 부여할 role (선택)')).not.toBeInTheDocument()
      expect(screen.getByLabelText('이름')).toHaveValue('신입')
    })

    it('단계가 바뀔 때마다 알린다(처음 열 때 1단계 포함)', async () => {
      setup({}, { data: catalog })
      const onStepChange = vi.fn()
      const user = userEvent.setup()
      render(<InviteEmployeeForm writable onInvited={vi.fn()} onCancel={vi.fn()} onStepChange={onStepChange} />)
      expect(onStepChange).toHaveBeenLastCalledWith(1)

      await fillBasics(user)
      await goToRoles(user)
      expect(onStepChange).toHaveBeenLastCalledWith(2)

      await user.click(screen.getByRole('button', { name: '이전' }))
      expect(onStepChange).toHaveBeenLastCalledWith(1)
    })
  })
})
