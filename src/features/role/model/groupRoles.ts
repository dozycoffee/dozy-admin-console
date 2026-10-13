/** role 선택지를 서비스(audience)별로 묶는다. 서비스와 그 안의 role은 입력 순서(서버가 내려준 순서)를 유지한다. */
export function groupByAudience<T extends { audience: string }>(items: readonly T[]): [string, T[]][] {
  const groups = new Map<string, T[]>()
  for (const item of items) groups.set(item.audience, [...(groups.get(item.audience) ?? []), item])
  return [...groups]
}
