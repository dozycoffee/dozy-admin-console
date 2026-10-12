import { toAccountErrorMessage } from '../../features/account/model/accountErrors'
import { useMyAccount } from '../../features/account/model/useMyAccount'
import { PasswordChangeForm } from './PasswordChangeForm'

/** 로그인한 모든 사용자가 쓰는 화면이라 액터 모드·Permission 제한이 없다. */
export function AccountPage() {
  const account = useMyAccount()

  return <>
    <header className="page-header inbound-page-header">
      <div><p>MY ACCOUNT</p><h1>내 계정</h1></div>
    </header>
    {account.isLoading && <section className="panel account-panel"><p>내 정보를 불러오는 중입니다...</p></section>}
    {account.isError && <section className="panel account-panel"><p className="inbound-error" role="alert">{toAccountErrorMessage(account.error)}</p></section>}
    {account.data && <>
      <section className="panel account-panel">
        <div className="panel-heading"><div><p className="eyebrow">ACCOUNT</p><h2>{account.data.name}</h2></div></div>
        <dl className="employee-fields">
          <div><dt>이메일 (로그인 ID)</dt><dd>{account.data.email}</dd></div>
          <div><dt>계정 종류</dt><dd>직원</dd></div>
        </dl>
        <h3 className="employee-section-title">부여된 role</h3>
        {account.data.roles.length > 0
          ? <ul className="employee-roles">{account.data.roles.map((role) => <li key={role}>{role}</li>)}</ul>
          : <p className="employee-no-roles">부여된 role이 없습니다. 관리자에게 role 부여를 요청하세요.</p>}
        <p className="employee-hint">이름·전화번호·주소를 바꾸려면 관리자에게 요청하세요. 이메일(로그인 ID)은 바꿀 수 없습니다.</p>
      </section>
    </>}
    <PasswordChangeForm />
  </>
}
