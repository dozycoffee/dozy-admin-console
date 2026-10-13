import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ToastContext } from '../../shared/ui/toastContext'
import { ApiError } from '../../shared/api/ApiError'
import { useAuditLogs } from '../../features/audit/model/useAuditLogs'
import type { AuditLog } from '../../features/audit/model/auditSchemas'
import { AuditLogsPage } from './AuditLogsPage'

vi.mock('../../features/audit/model/useAuditLogs', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../features/audit/model/useAuditLogs')>()),
  useAuditLogs: vi.fn(),
}))

const notify = vi.fn()

const granted: AuditLog = {
  id: 1024, occurredAt: '2026-09-24T05:00:00Z', actorId: '0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24', actorType: 'employee', action: 'ROLE_GRANTED',
  targetType: 'PRINCIPAL', targetId: '0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f', detail: { roles: ['wms:inbound_manager'] }, ip: '203.0.113.10',
}
const system: AuditLog = { id: 1023, occurredAt: '2026-09-24T04:00:00Z', actorId: null, actorType: null, action: 'EMPLOYEE_INVITED', targetType: 'PRINCIPAL', targetId: 'p-short', detail: null, ip: null }

function setup(items: AuditLog[], page = { number: 0, size: 20, totalElements: items.length, totalPages: 1 }, state: Record<string, unknown> = {}) {
  vi.mocked(useAuditLogs).mockReturnValue({ isLoading: false, isError: false, data: { items, page }, ...state } as never)
  render(<ToastContext.Provider value={{ notify }}><AuditLogsPage /></ToastContext.Provider>)
}

beforeEach(() => vi.clearAllMocks())
afterEach(() => vi.restoreAllMocks())

describe('AuditLogsPage', () => {
  it('기록을 action 이름·행위자·대상·IP와 함께 보여준다', () => {
    setup([granted])

    const row = within(screen.getByRole('table')).getByText('role 부여').closest('tr')!
    expect(within(row).getByText('203.0.113.10')).toBeInTheDocument()
    expect(screen.getByText('1건')).toBeInTheDocument()
  })

  it('목록에는 서버 action 코드를 보여주지 않는다(상세에서 본다)', () => {
    setup([granted])

    expect(within(screen.getByRole('table')).queryByText('ROLE_GRANTED')).not.toBeInTheDocument()
  })

  it('action을 분류 칩(색으로 구분)과 함께 보여주고 분류 이름도 글자로 적는다', () => {
    setup([granted, { ...system, action: 'LOGIN_FAILED' }])

    const role = within(screen.getByRole('table')).getByText('role 부여').closest('tr')!
    expect(within(role).getByText('role·서비스')).toHaveClass('audit-category', 'audit-cat-role')
    const login = within(screen.getByRole('table')).getByText('로그인 실패').closest('tr')!
    expect(within(login).getByText('로그인·세션')).toHaveClass('audit-cat-session')
  })

  it('목록에 없는 새 action은 분류 칩 없이 코드를 이름으로 보여준다', () => {
    setup([{ ...system, action: 'SOMETHING_NEW' }])

    const row = within(screen.getByRole('table')).getByText('SOMETHING_NEW').closest('tr')!
    expect(row.querySelector('.audit-category')).toBeNull()
  })

  it('행위자·대상 id는 앞 6자리와 뒤 4자리로 줄여 칩으로 보여준다', () => {
    setup([granted])

    const actor = screen.getByRole('button', { name: 'employee id 0199a3…1f24 복사' })
    expect(actor).toHaveTextContent('0199a3…1f24')
  })

  it('id 칩에 올리면 전체 id와 복사 안내를 바로 보여준다', async () => {
    setup([granted])

    await userEvent.setup().hover(screen.getByRole('button', { name: 'employee id 0199a3…1f24 복사' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24 클릭하여 복사')
  })

  it('id 칩을 누르면 전체 id를 복사하고 토스트로 알린다', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    setup([granted])

    await user.click(screen.getByRole('button', { name: 'employee id 0199a3…1f24 복사' }))

    expect(writeText).toHaveBeenCalledWith('0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24')
    expect(notify).toHaveBeenCalledWith('id를 복사했습니다.')
  })

  it('클립보드를 쓸 수 없으면 직접 복사하라고 안내한다', async () => {
    const user = userEvent.setup()
    vi.spyOn(navigator.clipboard, 'writeText').mockRejectedValue(new Error('denied'))
    setup([granted])

    await user.click(screen.getByRole('button', { name: 'employee id 0199a3…1f24 복사' }))

    expect(notify).toHaveBeenCalledWith('복사하지 못했습니다. 직접 선택해 복사하세요.', 'error')
  })

  it('시스템 작업은 행위자와 IP를 "-"로 보여준다', () => {
    setup([system])

    const row = within(screen.getByRole('table')).getByText('직원 초대').closest('tr')!
    expect(within(row).getAllByText('-').length).toBeGreaterThanOrEqual(2)
  })

  it('보기를 누르면 목록은 그대로 두고 상세 모달을 연다', async () => {
    setup([granted])
    const user = userEvent.setup()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'role 부여 상세 보기' }))

    const dialog = screen.getByRole('dialog', { name: '기록 상세' })
    expect(within(dialog).getByText('ROLE_GRANTED')).toBeInTheDocument() // 목록에서 뺀 서버 코드
    expect(within(dialog).getByText('0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24')).toBeInTheDocument() // 전체 id
    expect(within(dialog).getByText('0199a3c4-7b2e-7c1a-9f3d-2b6e8a1c4d5f')).toBeInTheDocument()
    expect(within(dialog).getByText('203.0.113.10')).toBeInTheDocument()
    expect(within(dialog).getByText('role·서비스')).toHaveClass('audit-cat-role')
    expect(within(dialog).getByText('role 부여')).toBeInTheDocument() // action 이름
    expect(within(dialog).getByText('행위자')).toBeInTheDocument()
    expect(within(dialog).getByText('대상')).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('상세 모달은 detail을 항목별로 보여주고 원본 JSON도 볼 수 있다', async () => {
    setup([granted])
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: 'role 부여 상세 보기' }))

    const dialog = screen.getByRole('dialog')
    expect(within(dialog).getByText('role')).toBeInTheDocument()
    expect(within(dialog).getAllByText('wms:inbound_manager').length).toBeGreaterThanOrEqual(1)
    await user.click(within(dialog).getByText('원본 JSON 보기'))
    expect(within(dialog).getByText(/"roles": \[/)).toBeInTheDocument()
  })

  it('detail이 없는 기록은 추가 정보가 없다고 안내하고 Esc로 닫힌다', async () => {
    setup([system])
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '직원 초대 상세 보기' }))
    expect(within(screen.getByRole('dialog')).getByText('이 기록에는 추가 정보가 없습니다.')).toBeInTheDocument()
    expect(within(screen.getByRole('dialog')).queryByText('원본 JSON 보기')).not.toBeInTheDocument()

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('상세 모달에서 전체 id와 원본 JSON을 복사한다', async () => {
    const user = userEvent.setup()
    const writeText = vi.spyOn(navigator.clipboard, 'writeText').mockResolvedValue()
    setup([granted])
    await user.click(screen.getByRole('button', { name: 'role 부여 상세 보기' }))
    const dialog = screen.getByRole('dialog')

    await user.click(within(dialog).getByRole('button', { name: 'employee id 복사' }))
    expect(writeText).toHaveBeenLastCalledWith('0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24')

    await user.click(within(dialog).getByText('원본 JSON 보기'))
    await user.click(within(dialog).getByRole('button', { name: 'JSON 복사' }))
    expect(writeText).toHaveBeenLastCalledWith(JSON.stringify(granted.detail, null, 2))
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
