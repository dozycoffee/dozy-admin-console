import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useChangePassword, useMyAccount } from '../../features/account/model/useMyAccount'
import { AccountPage } from './AccountPage'

vi.mock('../../features/account/model/useMyAccount')

const me = { principalType: 'employee', principalId: 'p-1', name: '김도윤', email: 'kim@dozycoffee.com', roles: ['wms:warehouse_manager'] }

function setup(account: Record<string, unknown>) {
  vi.mocked(useMyAccount).mockReturnValue({ isLoading: false, isError: false, ...account } as never)
  vi.mocked(useChangePassword).mockReturnValue({ mutate: vi.fn(), isPending: false, isError: false, isSuccess: false } as never)
  render(<AccountPage />)
}

beforeEach(() => vi.clearAllMocks())

describe('AccountPage', () => {
  it('이메일과 부여된 role을 읽기 전용으로 보여주고 비밀번호 변경 폼을 보여준다', () => {
    setup({ data: me })

    expect(screen.getByText('kim@dozycoffee.com')).toBeInTheDocument()
    expect(screen.getByText('wms:warehouse_manager')).toBeInTheDocument()
    expect(screen.getByText(/이름·전화번호·주소를 바꾸려면 관리자에게 요청하세요/)).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: '정보 수정' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument()
  })

  it('role이 없으면 관리자에게 요청하라고 안내한다', () => {
    setup({ data: { ...me, roles: [] } })

    expect(screen.getByText(/관리자에게 role 부여를 요청하세요/)).toBeInTheDocument()
  })

  it('조회 중에는 로딩 문구를, 실패하면 에러를 보여주되 비밀번호 변경은 쓸 수 있다', () => {
    setup({ isLoading: true })
    expect(screen.getByText('내 정보를 불러오는 중입니다...')).toBeInTheDocument()
  })

  it('내 정보 조회에 실패해도 비밀번호 변경 폼은 보여준다', () => {
    setup({ isError: true, error: new ApiError('x', { status: 401, code: 'UNAUTHENTICATED' }) })

    expect(screen.getByRole('alert')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: '비밀번호 변경' })).toBeInTheDocument()
  })
})
