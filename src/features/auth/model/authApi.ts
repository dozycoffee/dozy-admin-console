import { httpClient } from '../../../shared/api/httpClient'
import { currentUserSchema, loginResponseSchema } from './authSchemas'

export async function loginRequest(username: string, password: string) {
  const { data } = await httpClient.post('/api/auth/login', { username, password })
  return loginResponseSchema.parse(data)
}

export async function fetchCurrentUser() {
  const { data } = await httpClient.get('/api/auth/me')
  return currentUserSchema.parse(data)
}
