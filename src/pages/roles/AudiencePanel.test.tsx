import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useCreateAudience } from '../../features/role/model/useRoles'
import { AudiencePanel } from './AudiencePanel'

vi.mock('../../features/role/model/useRoles')

const audiences = [{ id: 1, code: 'wms', name: '창고 관리', description: null }, { id: 4, code: 'auth', name: '인증', description: null }]
const mutate = vi.fn()

function setup(canCreate: boolean, state: Record<string, unknown> = {}) {
  vi.mocked(useCreateAudience).mockReturnValue({ mutate, isPending: false, isError: false, isSuccess: false, ...state } as never)
  render(<AudiencePanel audiences={audiences} canCreate={canCreate} />)
}

beforeEach(() => vi.clearAllMocks())

describe('AudiencePanel', () => {
  it('audience 목록을 보여준다', () => {
    setup(false)

    expect(screen.getByText('창고 관리')).toBeInTheDocument()
    expect(screen.getByText('2개')).toBeInTheDocument()
  })

  it('owner가 아니면 추가 폼 대신 안내만 보여준다', () => {
    setup(false)

    expect(screen.queryByRole('form', { name: 'audience 추가' })).not.toBeInTheDocument()
    expect(screen.getByText('audience 추가는 owner만 할 수 있습니다.')).toBeInTheDocument()
  })

  it('owner는 올바른 code와 이름으로 audience를 추가한다', async () => {
    setup(true)
    mutate.mockImplementation((_body, options) => options.onSuccess())
    const user = userEvent.setup()
    const submit = screen.getByRole('button', { name: 'audience 추가' })
    expect(submit).toBeDisabled()

    await user.type(screen.getByLabelText('code'), 'Order!')
    await user.type(screen.getByLabelText('이름'), '주문')
    expect(submit).toBeDisabled()
    await user.clear(screen.getByLabelText('code'))
    await user.type(screen.getByLabelText('code'), 'order')
    await user.click(submit)

    expect(mutate.mock.calls[0][0]).toEqual({ code: 'order', name: '주문' })
    expect(screen.getByLabelText('code')).toHaveValue('')
  })

  it('중복 code 에러를 안내한다', () => {
    setup(true, { isError: true, error: new ApiError('dup', { status: 409, code: 'AUDIENCE_CODE_DUPLICATED' }) })

    expect(screen.getByRole('alert')).toHaveTextContent('이미 있는 audience code입니다.')
  })
})
