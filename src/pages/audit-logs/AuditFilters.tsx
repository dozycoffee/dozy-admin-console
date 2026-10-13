import { useState, type FormEvent } from 'react'
import { auditActionGroups, auditTargetTypeLabels, auditTargetTypes } from '../../features/audit/model/auditSchemas'
import { FieldTip } from '../../shared/ui/FieldTip'
import { isoToLocalInput, localInputToIso, periodPresets, presetFrom, validatePeriod, type PeriodPresetId } from '../../features/audit/model/auditPeriod'

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/

export type AppliedFilters = {
  from?: string
  to?: string
  actorId?: string
  targetType?: string
  targetId?: string
  actions: string[]
}

type Props = {
  onApply: (filters: AppliedFilters) => void
  /** 지금 시각. 빠른 선택과 기간 검증의 기준이며 테스트에서 고정할 수 있다. */
  now?: () => Date
}

export function AuditFilters({ onApply, now = () => new Date() }: Props) {
  const [preset, setPreset] = useState<PeriodPresetId | ''>('')
  const [fromInput, setFromInput] = useState('')
  const [toInput, setToInput] = useState('')
  const [actorId, setActorId] = useState('')
  const [targetType, setTargetType] = useState('')
  const [targetId, setTargetId] = useState('')
  const [actions, setActions] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  function toggleAction(code: string) {
    setActions((current) => (current.includes(code) ? current.filter((item) => item !== code) : [...current, code]))
  }

  /** 입력한 필터와 주어진 기간으로 조회한다. 행위자 id나 기간에 문제가 있으면 안내만 하고 요청하지 않는다. */
  function apply(from: string | undefined, to: string | undefined) {
    const trimmedActor = actorId.trim().toLowerCase()
    if (trimmedActor !== '' && !UUID_PATTERN.test(trimmedActor)) {
      setError('행위자 id는 UUID 형식이어야 합니다.')
      return
    }
    const problem = validatePeriod(from, to, now())
    if (problem) {
      setError(problem)
      return
    }
    setError(null)
    onApply({ from, to, actorId: trimmedActor || undefined, targetType: targetType || undefined, targetId: targetId.trim() || undefined, actions })
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    apply(localInputToIso(fromInput), localInputToIso(toInput))
  }

  /** 빠른 조회: 누른 시각을 종료, 거기서 N만큼 뺀 시각을 시작으로 칸에 채우고, 지금 입력된 다른 필터와 함께 바로 조회한다. */
  function quickSearch(id: PeriodPresetId) {
    const current = now()
    const from = presetFrom(id, current)
    const to = current.toISOString()
    setPreset(id)
    setFromInput(isoToLocalInput(from))
    setToInput(isoToLocalInput(to))
    apply(from, to)
  }

  function reset() {
    setPreset('')
    setFromInput('')
    setToInput('')
    setActorId('')
    setTargetType('')
    setTargetId('')
    setActions([])
    setError(null)
    onApply({ actions: [] })
  }

  const pristine = preset === '' && fromInput === '' && toInput === '' && actorId === '' && targetType === '' && targetId === '' && actions.length === 0

  return (
    <form className="panel audit-filters" onSubmit={submit} role="search" aria-label="감사 로그 검색">
      <fieldset className="audit-period">
        <legend>기간<FieldTip label="기간 입력 안내">시작과 종료를 모두 비워 두면 최근 7일을 조회합니다. 종료만 비우면 지금까지 조회합니다.</FieldTip></legend>
        <div className="audit-range">
          <label>시작<input type="datetime-local" value={fromInput} onChange={(event) => { setFromInput(event.target.value); setPreset('') }} /></label>
          <label>종료<input type="datetime-local" value={toInput} onChange={(event) => { setToInput(event.target.value); setPreset('') }} /></label>
        </div>
      </fieldset>
      <div className="audit-filter-grid">
        <label>행위자 id<input value={actorId} onChange={(event) => setActorId(event.target.value)} placeholder="계정 UUID" autoComplete="off" /></label>
        <label>대상 종류
          <select value={targetType} onChange={(event) => setTargetType(event.target.value)}>
            <option value="">전체</option>
            {auditTargetTypes.map((type) => <option key={type} value={type}>{auditTargetTypeLabels[type]}</option>)}
          </select>
        </label>
        <label>대상 id<input value={targetId} onChange={(event) => setTargetId(event.target.value)} placeholder="계정 UUID, role id 등" autoComplete="off" /></label>
      </div>
      <details className="audit-actions">
        <summary>action {actions.length > 0 ? `${actions.length}개 선택` : '전체'}</summary>
        {auditActionGroups.map((group) => (
          <fieldset key={group.label}>
            <legend className={`audit-cat-${group.id}`}><span className="audit-category-dot" aria-hidden="true" />{group.label}</legend>
            {group.actions.map((action) => <label key={action.code}><input type="checkbox" checked={actions.includes(action.code)} onChange={() => toggleAction(action.code)} />{action.label}</label>)}
          </fieldset>
        ))}
      </details>
      {error && <p className="inbound-error" role="alert">{error}</p>}
      <div className="audit-submit-row">
        <div className="audit-submit-main">
          <button type="submit" className="inbound-action-button">조회</button>
          <button type="button" className="inbound-action-button employee-secondary" disabled={pristine} onClick={reset}>초기화</button>
        </div>
        <div className="audit-quick" role="group" aria-label="빠른 조회">
          <span>빠른 조회</span>
          {periodPresets.map((item) => <button type="button" key={item.id} className={preset === item.id ? 'active' : ''} aria-pressed={preset === item.id} onClick={() => quickSearch(item.id)}>{item.label}</button>)}
        </div>
      </div>
    </form>
  )
}
