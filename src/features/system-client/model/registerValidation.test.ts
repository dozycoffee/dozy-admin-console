import { describe, expect, it } from 'vitest'
import { validateRegister } from './registerValidation'

describe('validateRegister', () => {
  it('올바른 입력이면 오류가 없다', () => {
    expect(validateRegister({ clientId: 'svc-store-sync', name: 'Store 동기화' })).toEqual({})
  })

  it('비어 있는 clientId와 이름은 입력하라는 문구를 돌려준다', () => {
    expect(validateRegister({ clientId: '  ', name: '' })).toEqual({ clientId: 'clientId를 입력하세요.', name: '이름을 입력하세요.' })
  })

  it.each(['store', 'svc-', 'svc-Store', 'svc-store-', 'SVC-store', 'svc store'])('"%s"은 형식 오류다', (clientId) => {
    expect(validateRegister({ clientId, name: '이름' }).clientId).toMatch(/svc-로 시작하는/)
  })

  it('너무 긴 clientId는 길이 오류다', () => {
    expect(validateRegister({ clientId: `svc-${'a'.repeat(100)}`, name: '이름' }).clientId).toMatch(/100자 이하/)
  })
})
