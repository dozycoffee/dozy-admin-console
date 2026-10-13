import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { isoToLocalInput } from '../../features/audit/model/auditPeriod'
import { AuditFilters } from './AuditFilters'

const now = () => new Date('2026-10-12T12:00:00Z')
const actorId = '0199a3b0-2c7d-7e41-a5f8-3b0c9d6e1f24'

function setup() {
  const onApply = vi.fn()
  render(<AuditFilters onApply={onApply} now={now} />)
  return onApply
}

describe('AuditFilters', () => {
  it('아무것도 고르지 않고 조회하면 필터 없이 요청한다(서버가 최근 7일을 쓴다)', async () => {
    const onApply = setup()

    await userEvent.setup().click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ from: undefined, to: undefined, actorId: undefined, targetType: undefined, targetId: undefined, actions: [] })
  })

  it('빠른 조회는 누르는 즉시 누른 시각을 종료, 거기서 뺀 시각을 시작으로 조회한다', async () => {
    const onApply = setup()

    await userEvent.setup().click(screen.getByRole('button', { name: '최근 30일' }))

    expect(onApply).toHaveBeenCalledTimes(1)
    expect(onApply.mock.calls[0][0]).toMatchObject({ from: '2026-09-12T12:00:00.000Z', to: '2026-10-12T12:00:00.000Z' })
    expect(screen.getByRole('button', { name: '최근 30일' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('빠른 조회를 누르면 시작 칸과 종료 칸이 모두 누른 시각 기준으로 채워진다', async () => {
    setup()

    await userEvent.setup().click(screen.getByRole('button', { name: '최근 24시간' }))

    expect(screen.getByLabelText('시작')).toHaveValue(isoToLocalInput('2026-10-11T12:00:00.000Z'))
    expect(screen.getByLabelText('종료')).toHaveValue(isoToLocalInput('2026-10-12T12:00:00.000Z'))
  })

  it('빠른 조회는 지금 입력된 다른 필터와 함께 조회한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('행위자 id'), actorId)
    await user.selectOptions(screen.getByLabelText('대상 종류'), 'ROLE')
    await user.click(screen.getByText(/action/i, { selector: 'summary' }))
    await user.click(screen.getByLabelText('로그인 실패'))

    await user.click(screen.getByRole('button', { name: '최근 7일' }))

    expect(onApply).toHaveBeenCalledWith(expect.objectContaining({ from: '2026-10-05T12:00:00.000Z', to: '2026-10-12T12:00:00.000Z', actorId, targetType: 'ROLE', actions: ['LOGIN_FAILED'] }))
  })

  it('빠른 조회도 행위자 id가 UUID가 아니면 요청하지 않고 안내한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('행위자 id'), 'not-a-uuid')

    await user.click(screen.getByRole('button', { name: '최근 7일' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('행위자 id는 UUID 형식이어야 합니다.')
  })

  it('조회 버튼과 빠른 조회 버튼이 같은 줄에 나란히 있다', () => {
    setup()

    const row = screen.getByRole('button', { name: '조회' }).closest('.audit-submit-row')!
    expect(within(row as HTMLElement).getByRole('group', { name: '빠른 조회' })).toBeInTheDocument()
    expect(within(row as HTMLElement).getByRole('button', { name: '초기화' })).toBeInTheDocument()
  })

  it('직접 입력하면 빠른 조회 선택 표시가 풀린다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '최근 24시간' }))
    await user.type(screen.getByLabelText('시작'), '2026-10-01T09:00')

    expect(screen.getByRole('button', { name: '최근 24시간' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('필터가 하나도 없으면 초기화 버튼이 비활성이다', () => {
    setup()

    expect(screen.getByRole('button', { name: '초기화' })).toBeDisabled()
  })

  it('초기화하면 모든 입력을 비우고 필터 없이 다시 조회한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('행위자 id'), actorId)
    await user.selectOptions(screen.getByLabelText('대상 종류'), 'ROLE')
    await user.click(screen.getByRole('button', { name: '최근 7일' }))
    onApply.mockClear()

    await user.click(screen.getByRole('button', { name: '초기화' }))

    expect(onApply).toHaveBeenCalledWith({ actions: [] })
    expect(screen.getByLabelText('행위자 id')).toHaveValue('')
    expect(screen.getByLabelText('대상 종류')).toHaveValue('')
    expect(screen.getByLabelText('시작')).toHaveValue('')
    expect(screen.getByRole('button', { name: '최근 7일' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: '초기화' })).toBeDisabled()
  })

  it('초기화하면 이전 오류 안내도 지운다', async () => {
    setup()
    const user = userEvent.setup()
    await user.type(screen.getByLabelText('행위자 id'), 'bad')
    await user.click(screen.getByRole('button', { name: '조회' }))
    expect(screen.getByRole('alert')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '초기화' }))

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('시작이 종료보다 늦으면 요청하지 않고 안내한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('시작'), '2026-10-12T09:00')
    await user.type(screen.getByLabelText('종료'), '2026-10-11T09:00')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('시작은 종료보다 앞이어야 합니다.')
  })

  it('90일을 넘는 기간은 요청하지 않고 안내한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('시작'), '2026-06-01T09:00')
    await user.type(screen.getByLabelText('종료'), '2026-10-01T09:00')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('90일 이하')
  })

  it('행위자 id가 UUID가 아니면 요청하지 않고 안내한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('행위자 id'), 'not-a-uuid')
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).not.toHaveBeenCalled()
    expect(screen.getByRole('alert')).toHaveTextContent('UUID')
  })

  it('행위자·대상·action 필터를 함께 보낸다(UUID는 소문자로 정규화)', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.type(screen.getByLabelText('행위자 id'), ` ${actorId.toUpperCase()} `)
    await user.selectOptions(screen.getByLabelText('대상 종류'), 'ROLE')
    await user.type(screen.getByLabelText('대상 id'), ' 11 ')
    await user.click(screen.getByText(/^action/))
    await user.click(screen.getByLabelText('role 부여'))
    await user.click(screen.getByLabelText('role 회수'))
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply).toHaveBeenCalledWith({ from: undefined, to: undefined, actorId, targetType: 'ROLE', targetId: '11', actions: ['ROLE_GRANTED', 'ROLE_REVOKED'] })
    expect(screen.getByText('action 2개 선택')).toBeInTheDocument()
  })

  it('action 선택을 다시 누르면 해제한다', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.click(screen.getByText(/^action/))
    await user.click(screen.getByLabelText('로그인 실패'))
    await user.click(screen.getByLabelText('로그인 실패'))
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply.mock.calls[0][0].actions).toEqual([])
  })

  it('action 필터의 분류 제목도 로그 목록과 같은 분류 색을 쓴다', async () => {
    setup()
    await userEvent.setup().click(screen.getByText(/action/i, { selector: 'summary' }))

    expect(screen.getByText('로그인·세션', { selector: 'legend' })).toHaveClass('audit-cat-session')
    expect(screen.getByText('비밀번호', { selector: 'legend' })).toHaveClass('audit-cat-password')
    expect(screen.getByText('시스템 클라이언트·owner', { selector: 'legend' })).toHaveClass('audit-cat-client')
  })

  it('기간 제목은 짧게 두고 입력 규칙은 "?" 배지 툴팁으로 안내한다', async () => {
    setup()
    const user = userEvent.setup()
    expect(screen.getByText('기간', { selector: 'legend' })).toBeInTheDocument()
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()

    await user.hover(screen.getByRole('img', { name: '기간 입력 안내' }))

    expect(screen.getByRole('tooltip')).toHaveTextContent('시작과 종료를 모두 비워 두면 최근 7일을 조회합니다. 종료만 비우면 지금까지 조회합니다.')
  })
})
