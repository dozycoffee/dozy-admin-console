import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import type { TaskState } from '../../features/dashboard/model/useAccountDashboard'
import { TASK_PREVIEW_LIMIT } from '../../features/dashboard/model/dashboardRules'

type Props<T> = {
  title: string
  description: string
  state: TaskState<T>
  /** 처리가 필요한 일이 있을 때의 강조색 */
  tone: 'warning' | 'danger' | 'info'
  itemKey: (item: T) => string
  renderItem: (item: T) => ReactNode
  /** "전체 보기"가 이동할 주소 */
  moreTo: string
  /** 한 번에 훑는 범위를 넘어 일부만 센 경우 안내에 쓰는 범위 문구(예: "처음 100명") */
  partialLabel?: string
}

/** 처리가 필요한 일 한 가지. 건수와 일부 항목을 보여주고 해당 화면으로 이동할 수 있다. 할 일이 없으면 그렇게 알린다. */
export function TaskCard<T>({ title, description, state, tone, itemKey, renderItem, moreTo, partialLabel }: Props<T>) {
  const ready = state.status === 'ready'
  const count = ready ? state.count : null
  const hasWork = ready && state.count > 0
  return (
    <section className={`panel task-card ${hasWork ? `task-${tone}` : ''}`} aria-label={title}>
      <header className="task-card-header">
        <h2>{title}</h2>
        <span className={`task-count ${hasWork ? 'has-work' : ''}`} aria-label={count === null ? undefined : `${count}건`}>{count ?? '-'}</span>
      </header>
      <p className="task-description">{description}</p>
      {state.status === 'loading' && <p className="task-status">불러오는 중입니다...</p>}
      {state.status === 'error' && <p className="inbound-error" role="alert">{toAdminErrorMessage(state.error)}</p>}
      {ready && state.count === 0 && <p className="task-empty">처리할 일이 없습니다.</p>}
      {ready && state.count > 0 && <ul className="task-items">
        {state.items.map((item) => <li key={itemKey(item)}>{renderItem(item)}</li>)}
        {state.count > state.items.length && <li className="task-more-count">외 {state.count - state.items.length}건</li>}
      </ul>}
      {ready && state.partial && <p className="task-partial">{partialLabel ?? `처음 ${TASK_PREVIEW_LIMIT}건`} 기준입니다. 전체는 목록에서 확인하세요.</p>}
      <Link to={moreTo} className="text-link task-link">전체 보기 ›</Link>
    </section>
  )
}
