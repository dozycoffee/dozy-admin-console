import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError } from '../../shared/api/ApiError'
import { useAuditLogs } from '../../features/audit/model/useAuditLogs'
import type { AuditLog } from '../../features/audit/model/auditSchemas'
import { AuditLogsPage } from './AuditLogsPage'

vi.mock('../../features/audit/model/useAuditLogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../features/audit/model/useAuditLogs')>()),
  useAuditLogs: vi.fn(),
}))

const granted: AuditLog = {
  id: 1024, occurredAt: '2026-09-24T05:00:00Z', actorId: '0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24', actorType: 'employee', action: 'ROLE_GRANTED',
  targetType: 'PRINCIPAL', targetId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f', detail: { roles: ['wms:inbound_manager'] }, ip: '203.0.113.10',
}
const system: AuditLog = { id: 1023, occurredAt: '2026-09-24T04:00:00Z', actorId: null, actorType: null, action: 'EMPLOYEE_INVITED', targetType: 'PRINCIPAL', targetId: 'p-short', detail: null, ip: null }

function setup(items: AuditLog[], page = { number: 0, size: 20, totalElements: items.length, totalPages: 1 }, state: Record<string, unknown> = {}) {
  vi.mocked(useAuditLogs).mockReturnValue({ isLoading: false, isError: false, data: { items, page }, ...state } as never)
  render(<AuditLogsPage />)
}

beforeEach(() => vi.clearAllMocks())

describe('AuditLogsPage', () => {
  it('기록을 action 이름·행위자·대상·IP와 함께 보여준다', () => {
    setup([granted])

    const row = within(screen.getByRole('table')).getByText('role 부여').closest('tr')!
    expect(within(row).getByText('ROLE_GRANTED')).toBeInTheDocument()
    expect(within(row).getByText('203.0.113.10')).toBeInTheDocument()
    expect(screen.getByText('1건')).toBeInTheDocument()
  })

  it('행위자·대상 id는 앞 8자리로 줄이고 전체 id는 툴팁에 둔다', () => {
    setup([granted])

    const actor = screen.getByTitle('0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24')
    expect(actor).toHaveTextContent('employee 0199a3b0…')
  })

  it('시스템 작업은 행위자와 IP를 "-"로 보여준다', () => {
    setup([system])

    const row = within(screen.getByRole('table')).getByText('직원 초대').closest('tr')!
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(3)
  })

  it('detail은 펼쳐서 JSON으로 볼 수 있고, 없으면 "-"다', () => {
    setup([granted])

    expect(screen.getByText(/wms:inbound_manager/)).toBeInTheDocument()
    expect(screen.getByText('보기')).toBeInTheDocument()
  })

  it('목록 호출에 20건 단위 페이지와 필터 없음 상태를 넘긴다', () => {
    setup([granted])

    expect(vi.mocked(useAuditLogs)).toHaveBeenLastCalledWith({ actions: [], page: 0, size: 20 })
  })

  it('조회 조건을 적용하면 첫 페이지부터 그 조건으로 다시 조회한다', async () => {
    setup([granted], { number: 0, size: 20, totalElements: 60, totalPages: 3 })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', { name: '다음' }))
    expect(vi.mocked(useAuditLogs)).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }))

    await user.selectOptions(screen.getByLabelText('대상 종류'), 'ROLE')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(vi.mocked(useAuditLogs)).toHaveBeenLastCalledWith(expect.objectContaining({ targetType: 'ROLE', page: 0 }))
  })

  it('기록이 없으면 안내한다', () => {
    setup([])

    expect(screen.getByText('조건에 맞는 기록이 없습니다.')).toBeInTheDocument()
  })

  it('로딩 중과 에러(owner가 아님 등)를 안내한다', () => {
    vi.mocked(useAuditLogs).mockReturnValue({ isLoading: true, isError: false, data: undefined } as never)
    const { unmount } = render(<AuditLogsPage />)
    expect(screen.getByText('감사 로그를 불러오는 중입니다...')).toBeInTheDocument()
    unmount()

    vi.mocked(useAuditLogs).mockReturnValue({ isLoading: false, isError: true, error: new ApiError('x', { status: 403, code: 'FORBIDDEN' }), data: undefined } as never)
    render(<AuditLogsPage />)
    expect(screen.getByRole('alert')).toHaveTextContent('이 작업을 할 권한이 없습니다.')
  })

  it('페이지가 여러 개면 이전·다음으로 넘긴다', async () => {
    setup([granted], { number: 0, size: 20, totalElements: 60, totalPages: 3 })
    const user = userEvent.setup()
    expect(screen.getByText('1 / 3')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이전' })).toBeDisabled()

    await user.click(screen.getByRole('button', { name: '다음' }))

    expect(screen.getByText('2 / 3')).toBeInTheDocument()
  })
})
