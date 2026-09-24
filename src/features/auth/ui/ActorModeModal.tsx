import type { CSSProperties } from 'react'
import { actorModes, type ActorModeId } from '../model/actorModes'
import { useAuth } from '../model/useAuth'
import { useCurrentUser } from '../model/useCurrentUser'

function LockIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Zm6 4v2" /></svg>
}

type ActorModeModalProps = {
  open: boolean
  onClose: () => void
  onSelected: () => void
}

export function ActorModeModal({ open, onClose, onSelected }: ActorModeModalProps) {
  const user = useCurrentUser()
  const { activeActorMode, selectActorMode } = useAuth()
  if (!open) return null

  function handleSelect(modeId: ActorModeId) {
    if (selectActorMode(modeId)) onSelected()
  }

  return (
    <div className="mode-modal-backdrop" role="presentation" onMouseDown={activeActorMode ? onClose : undefined}>
      <section className="mode-modal" role="dialog" aria-modal="true" aria-labelledby="mode-modal-title" onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <p>SWITCH MODE</p>
            <h2 id="mode-modal-title">업무 모드 선택</h2>
            <span>권한이 있는 모드만 선택할 수 있습니다.</span>
          </div>
          {activeActorMode && <button type="button" className="mode-modal-close" aria-label="닫기" onClick={onClose}>×</button>}
        </header>
        <div className="mode-modal-grid">
          {actorModes.map((mode, index) => {
            const allowed = user.actorModes.includes(mode.id)
            const active = activeActorMode === mode.id
            return (
              <button
                key={mode.id}
                type="button"
                className={`mode-option ${allowed ? 'available' : 'locked'} ${active ? 'active' : ''}`}
                style={{ '--mode-index': index } as CSSProperties}
                disabled={!allowed}
                aria-describedby={allowed ? undefined : `${mode.id}-locked-reason`}
                onClick={() => handleSelect(mode.id)}
              >
                <span className="mode-option-heading">
                  <strong>{mode.label}</strong>
                  {allowed ? <small>{active ? '현재 모드' : '사용 가능'}</small> : <small><LockIcon /> 권한 없음</small>}
                </span>
                <span className="mode-option-description">{mode.description}</span>
                {!allowed && <span id={`${mode.id}-locked-reason`} className="mode-option-reason">관리자에게 권한을 요청하세요.</span>}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
