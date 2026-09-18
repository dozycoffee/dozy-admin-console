export function DashboardPage() {
  return (
    <>
      <header className="page-header"><div><p>2026년 9월 18일</p><h1>운영 대시보드</h1><span>권한 범위 내 운영 현황을 확인하세요.</span></div></header>
      <section className="stat-grid">
        <article><span>운영 상품</span><strong>128</strong><small>이번 주 6개 추가</small></article>
        <article><span>정상 가동 창고</span><strong>3 / 3</strong><small>모든 창고 정상 운영</small></article>
        <article><span>재고 부족 품목</span><strong>12</strong><small>어제보다 3개 감소</small></article>
      </section>
      <section className="panel"><h2>프로젝트 기본 구조</h2><p>카탈로그와 재고 도메인을 하나의 콘솔 안에서 권한 기반으로 연결합니다.</p></section>
    </>
  )
}
