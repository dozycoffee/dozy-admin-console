import { describe, expect, it, vi } from 'vitest'
import { httpClient } from '../../../shared/api/httpClient'
import { fetchCurrentUser, loginRequest } from './authApi'
import { actorModeIds } from './actorModes'

describe('loginRequest', () => {
  it('username/password로 로그인 요청을 보내고 응답을 zod로 검증해 반환한다', async () => {
    const postSpy = vi.spyOn(httpClient, 'post').mockResolvedValue({ data: { accessToken: 'test-token' } })

    const result = await loginRequest('dozy', 'dozy1234')

    expect(postSpy).toHaveBeenCalledWith('/api/auth/login', { username: 'dozy', password: 'dozy1234' })
    expect(result).toEqual({ accessToken: 'test-token' })
  })
})

describe('fetchCurrentUser', () => {
  it('현재 사용자 정보를 조회하고 응답을 zod로 검증해 반환한다', async () => {
    const user = { id: 'user-001', name: '김도윤', actorModes: [actorModeIds.warehouseManager], permissions: ['dashboard.read'], scope: { warehouseIds: [1] } }
    const getSpy = vi.spyOn(httpClient, 'get').mockResolvedValue({ data: user })

    const result = await fetchCurrentUser()

    expect(getSpy).toHaveBeenCalledWith('/api/auth/me')
    expect(result).toEqual(user)
  })
})
