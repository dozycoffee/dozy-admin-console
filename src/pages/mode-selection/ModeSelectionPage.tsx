import { useNavigate } from 'react-router-dom'
import { actorModes, type ActorModeId } from '../../features/auth/model/actorModes'
import { useAuth } from '../../features/auth/model/useAuth'
import { useCurrentUser } from '../../features/auth/model/useCurrentUser'
import dozyCoffeeLogo from '../../assets/dozy-coffee-logo.png'

function ModeIcon({ modeId }: { modeId: ActorModeId }) {
  const paths: Record<ActorModeId, string> = {
    'account-administrator': 'M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 7c.8-3.2 3.1-5 7-5s6.2 1.8 7 5M18 8.5h3M19.5 7v3',
    merchandiser: 'M5 8h14l-1 12H6L5 8Zm3 0V6a4 4 0 0 1 8 0v2M9 12h6',
    'warehouse-manager': 'm3 9 9-5 9 5-9 5-9-5Zm2 2.5V19h14v-7.5M9 20v-5h6v5',
    'headquarters-inventory-manager': 'M4 5h16v5H4V5Zm0 9h7v5H4v-5Zm11 0h5v5h-5v-5Z',
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d={paths[modeId]} /></svg>
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7 11V8a5 5 0 0 1 10 0v3M6 11h12v9H6v-9Zm6 4v2" />
    </svg>
  )
}

export function ModeSelectionPage() {
  const user = useCurrentUser()
  const { selectActorMode, logout } = useAuth()
  const navigate = useNavigate()

  function handleSelect(modeId: ActorModeId) {
    if (selectActorMode(modeId)) navigate('/', { replace: true })
  }

  return (
    <main className="mode-selection-page">
      <header className="mode-selection-header">
        <div className="mode-selection-brand">
          <img src={dozyCoffeeLogo} alt="" />
          <strong>DOZY <span>COFFEE</span></strong>
        </div>
        <div className="mode-selection-user">
          <span>{user.name}</span>
          <button type="button" onClick={logout}>로그아웃</button>
        </div>
      </header>

      <section className="mode-selection-content" aria-labelledby="mode-selection-title">
        <div className="mode-selection-intro">
          <p>WORKSPACE</p>
          <h1 id="mode-selection-title">어떤 모드로 시작할까요?</h1>
          <span>현재 수행할 업무를 선택하세요. 권한이 있는 모드만 시작할 수 있습니다.</span>
        </div>

        <div className="mode-grid">
          {actorModes.map((mode) => {
            const allowed = user.actorModes.includes(mode.id)
            return (
              <article key={mode.id} className={`mode-card ${allowed ? 'available' : 'locked'}`}>
                <div className="mode-card-topline">
                  <span className="mode-icon"><ModeIcon modeId={mode.id} /></span>
                  {allowed ? (
                    <span className="mode-status available">사용 가능</span>
                  ) : (
                    <span className="mode-status locked"><LockIcon /> 권한 없음</span>
                  )}
                </div>
                <div>
                  <h2>{mode.label}</h2>
                  <p>{mode.description}</p>
                </div>
                <button
                  type="button"
                  disabled={!allowed}
                  aria-describedby={allowed ? undefined : `${mode.id}-locked-reason`}
                  onClick={() => handleSelect(mode.id)}
                >
                  {allowed ? '이 모드로 시작' : '접근할 수 없음'}
                  {allowed && <span aria-hidden="true">→</span>}
                </button>
                {!allowed && <small id={`${mode.id}-locked-reason`}>관리자에게 해당 모드 권한을 요청하세요.</small>}
              </article>
            )
          })}
        </div>
      </section>
    </main>
  )
}
