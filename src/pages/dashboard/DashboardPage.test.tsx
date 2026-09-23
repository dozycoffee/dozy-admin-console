import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { DashboardPage } from './DashboardPage'

function renderDashboard() {
  return render(<MemoryRouter><DashboardPage /></MemoryRouter>)
}

describe('DashboardPage', () => {
  it('목 데이터로 담당 창고와 Zone별 Capacity를 보여준다', () => {
    renderDashboard()

    expect(screen.getByText('서울 중앙 창고')).toBeInTheDocument()
    expect(screen.getByText('71%')).toBeInTheDocument()
    expect(screen.getAllByRole('link').find((link) => link.getAttribute('href') === '/inventory?zone=A')).toBeTruthy()
    expect(screen.getByRole('link', { name: /평면도 보기/ })).toHaveAttribute('href', '/warehouse-map')
  })
})
