import { Tooltip } from '../../shared/ui/Tooltip'

type Props = {
  label: string
  /** 접근성 이름에 붙일 대상 이름(같은 버튼이 줄마다 반복되므로 어느 줄인지 알려 준다) */
  target: string
  /** 할 수 없는 이유. 있으면 버튼을 비활성화하고 툴팁으로 알린다. */
  reason: string | null
  danger?: boolean
  onClick: () => void
}

/** 목록 줄의 작은 작업 버튼. 불가한 작업은 숨기지 않고 같은 자리에 비활성화한다. */
export function RowAction({ label, target, reason, danger, onClick }: Props) {
  return <Tooltip content={reason}>
    <button type="button" className={`taxonomy-action${danger ? ' danger' : ''}`} aria-label={`${label} · ${target}`} disabled={reason !== null} onClick={onClick}>{label}</button>
  </Tooltip>
}
