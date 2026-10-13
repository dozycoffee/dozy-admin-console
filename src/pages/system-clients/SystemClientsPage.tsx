import { useState } from 'react'
import { toAdminErrorMessage } from '../../features/auth/model/adminErrors'
import { permissions } from '../../features/auth/model/permissions'
import { useAuth } from '../../features/auth/model/useAuth'
import { useRoles } from '../../features/role/model/useRoles'
import type { RevealedSecret } from '../../features/system-client/model/systemClientSchemas'
import { useSystemClients } from '../../features/system-client/model/useSystemClients'
import { SecretReveal } from '../../features/system-client/ui/SecretReveal'
import { ClientCard } from './ClientCard'
import { RegisterClientForm } from './RegisterClientForm'

export function SystemClientsPage() {
  const { can } = useAuth()
  const writable = can(permissions.accountWrite)
  const clients = useSystemClients()
  const roles = useRoles()
  const [registering, setRegistering] = useState(false)
  // secret은 이 상태에만 두고 한 번 보여준 뒤 버린다. 새로고침하거나 화면을 떠나면 사라진다.
  const [revealed, setRevealed] = useState<RevealedSecret | null>(null)

  return <>
    <header className="page-header inbound-page-header">
      <div><p>ACCOUNT ADMINISTRATION</p><h1>시스템 클라이언트</h1></div>
      {writable && <button type="button" className="inbound-action-button employee-invite-toggle" aria-expanded={registering} onClick={() => setRegistering((value) => !value)}>{registering ? '등록 닫기' : '클라이언트 등록'}</button>}
    </header>
    <p className="employee-hint role-intro">시스템 클라이언트는 서비스끼리 호출할 때 쓰는 계정입니다. 서비스는 clientId와 secret으로 토큰을 발급받고, 부여된 role의 서비스만 호출할 수 있습니다.</p>
    {revealed && <SecretReveal secret={revealed} onClose={() => setRevealed(null)} />}
    {registering && <RegisterClientForm writable={writable} onRegistered={(secret) => { setRevealed(secret); setRegistering(false) }} />}
    {clients.isLoading && <section className="panel"><p>시스템 클라이언트 목록을 불러오는 중입니다...</p></section>}
    {clients.isError && <section className="panel"><p className="inbound-error" role="alert">{toAdminErrorMessage(clients.error)}</p></section>}
    {clients.data && clients.data.length === 0 && <section className="panel"><p className="inbound-empty">등록된 시스템 클라이언트가 없습니다.</p></section>}
    <ul className="client-list">
      {clients.data?.map((client) => <ClientCard key={client.principalId} client={client} allRoles={roles.data ?? []} writable={writable} onRotated={setRevealed} />)}
    </ul>
  </>
}
