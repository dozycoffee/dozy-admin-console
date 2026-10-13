/**
 * 목록에서 id를 줄여 보일 때 쓴다. UUID v7은 앞부분이 생성 시각이라 같은 시기에 만든 계정끼리 앞자리가 거의 같으므로
 * 앞 6자리와 뒤 4자리를 함께 보여준다. 짧은 id(role·서비스의 숫자 id 등)는 그대로 둔다.
 */
export function shortenId(id: string): string {
  return id.length > 12 ? `${id.slice(0, 6)}…${id.slice(-4)}` : id
}
