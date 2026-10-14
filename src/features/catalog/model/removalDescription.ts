/**
 * 태그·상품 그룹을 삭제하면 서버가 그것을 쓰던 모든 상품에서 자동으로 뺀다(요구사항 1.7, 1.8).
 * 확인 모달에서 영향을 받는 상품 수를 알려 주는 문구다. 수를 알 수 없으면(조회 실패) 수 없이 안내한다.
 *
 * @param usage 대상을 가리키는 구절 (예: "이 태그가 붙은")
 */
export function removalDescription(usage: string, count: number | null): string {
  if (count === null) return `${usage} 모든 상품에서 제거되며 되돌릴 수 없습니다.`
  if (count === 0) return `${usage} 상품이 없습니다. 삭제하면 되돌릴 수 없습니다.`
  return `${usage} ${count}개 상품에서 제거됩니다. 되돌릴 수 없습니다.`
}
