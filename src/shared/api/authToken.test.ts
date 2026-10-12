import { afterEach, describe, expect, it } from 'vitest'
import { clearAccessToken, getAccessToken, setAccessToken } from './authToken'

afterEach(() => clearAccessToken())

describe('authToken', () => {
  it('토큰이 없으면 null이다', () => {
    expect(getAccessToken()).toBeNull()
  })

  it('저장한 토큰을 돌려주고 지우면 null이 된다', () => {
    setAccessToken('test-token')
    expect(getAccessToken()).toBe('test-token')

    clearAccessToken()
    expect(getAccessToken()).toBeNull()
  })

  it('XSS로 읽히지 않도록 localStorage와 sessionStorage에는 저장하지 않는다', () => {
    setAccessToken('test-token')

    expect(localStorage.length).toBe(0)
    expect(sessionStorage.length).toBe(0)
  })
})
