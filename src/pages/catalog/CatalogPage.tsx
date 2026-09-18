import { permissions } from '../../features/auth/model/permissions'
import { PermissionGate } from '../../features/auth/ui/PermissionGate'

export function CatalogPage() {
  return (
    <>
      <header className="page-header">
        <div><p>CATALOG</p><h1>상품 관리</h1><span>본사가 정의한 상품과 전 매장 공통 가격을 관리합니다.</span></div>
        <PermissionGate permission={permissions.catalogWrite} fallback={<button className="button locked" disabled>상품 등록 · 권한 필요</button>}>
          <button className="button">상품 등록</button>
        </PermissionGate>
      </header>
      <section className="panel"><h2>상품 목록</h2><p>카탈로그 API 연결 전 기본 화면입니다.</p></section>
    </>
  )
}
