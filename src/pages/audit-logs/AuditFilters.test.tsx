import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
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

  it('빠른 선택은 지금에서 뺀 시작 시각만 보낸다', async () => {
    const onApply = setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '최근 30일' }))
    await user.click(screen.getByRole('button', { name: '조회' }))

    expect(onApply.mock.calls[0][0]).toMatchObject({ from: '2026-09-12T12:00:00.000Z', to: undefined })
    expect(screen.getByRole('button', { name: '최근 30일' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('직접 입력하면 빠른 선택이 해제된다', async () => {
    setup()
    const user = userEvent.setup()

    await user.click(screen.getByRole('button', { name: '최근 24시간' }))
    await user.type(screen.getByLabelText('시작'), '2026-10-01T09:00')

    expect(screen.getByRole('button', { name: '최근 24시간' })).toHaveAttribute('aria-pressed', 'false')
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
})
