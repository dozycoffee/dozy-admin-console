/** ISO 8601(UTC) 시각을 사용자 로컬 시간대의 "2026. 9. 24. 오후 2:00" 형식으로 보여준다. */
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' })
}
