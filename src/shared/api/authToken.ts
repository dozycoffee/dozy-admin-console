// access token은 XSS로 탈취되지 않도록 localStorage가 아니라 메모리에만 둔다(dozy-auth ADR-0014).
// 새로고침하면 사라지므로 앱은 시작할 때 refresh 쿠키로 다시 발급받는다.
let accessToken: string | null = null

export function getAccessToken(): string | null {
  return accessToken
}

export function setAccessToken(token: string): void {
  accessToken = token
}

export function clearAccessToken(): void {
  accessToken = null
}
