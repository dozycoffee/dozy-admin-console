import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../../shared/api/ApiError'
import type { EmployeeDetail } from '../model/employeeSchemas'
import { useUpdateEmployee } from '../model/useEmployees'
import { EditEmployeeForm } from './EditEmployeeForm'

vi.mock('../model/useEmployees')

const employee: EmployeeDetail = {
  principalId: 'p-1', email: 'kim@dozycoffee.com', name: '김도윤', phone: '010-1234-5678', address: null, status: 'ACTIVE', roles: [],
  lockedUntil: null, invitation: null, createdAt: '2026-09-24T05:00:00Z', updatedAt: '2026-09-24T05:00:00Z',
}
const mutate = vi.fn()

function setup(state: Record<string, unknown> = {}, disabled = false) {
  vi.mocked(useUpdateEmployee).mockReturnValue({ mutate, isPending: false, isError: false, ...state } as never)
  const onDone = vi.fn()
  render(<EditEmployeeForm employee={employee} disabled={disabled} onDone={onDone} />)
  return onDone
}

beforeEach(() => vi.clearAllMocks())

describe('EditEmployeeForm', () => {
  it('현재 값으로 채우고 이메일은 바꿀 수 없다고 안내한다', () => {
    setup()

    expect(screen.getByLabelText('이름')).toHaveValue('김도윤')
    expect(screen.getByLabelText('전화번호')).toHaveValue('010-1234-5678')
    expect(screen.getByLabelText('주소')).toHaveValue('')
    expect(screen.getByText(/이메일\(로그인 ID\)은 바꿀 수 없습니다/)).toBeInTheDocument()
  })

  it('바뀐 필드만 보내고, 성공하면 닫는다', async () => {
    setup()
    mutate.mockImplementation((_variables, options) => options.onSuccess())
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('전화번호'))
    await user.type(screen.getByLabelText('주소'), '서울시')
    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutate.mock.calls[0][0]).toEqual({ principalId: 'p-1', body: { phone: null, address: '서울시' } })
  })

  it('바뀐 것이 없으면 요청 없이 닫는다', async () => {
    const onDone = setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '저장' }))

    expect(mutate).not.toHaveBeenCalled()
    expect(onDone).toHaveBeenCalled()
  })

  it('이름을 비우면 저장할 수 없다', async () => {
    setup()
    const user = userEvent.setup()

    await user.clear(screen.getByLabelText('이름'))

    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })

  it('에러 code별 안내 문구를 보여준다', () => {
    setup({ isError: true, error: new ApiError('x', { status: 409, code: 'INVALID_STATE' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('현재 계정 상태에서는 할 수 없는 작업입니다.')
  })

  it('작업할 수 없는 상태면 입력과 저장이 비활성이다', () => {
    setup({}, true)

    expect(screen.getByLabelText('이름')).toBeDisabled()
    expect(screen.getByRole('button', { name: '저장' })).toBeDisabled()
  })
})
