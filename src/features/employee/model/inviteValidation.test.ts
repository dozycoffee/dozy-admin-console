import { describe, expect, it } from 'vitest'
import { validateInvite } from './inviteValidation'

describe('validateInvite', () => {
  it('올바른 입력이면 오류가 없다', () => {
    expect(validateInvite({ email: 'new@dozycoffee.com', name: '신입' })).toEqual({})
  })

  it('앞뒤 공백은 무시하고 검사한다', () => {
    expect(validateInvite({ email: ' new@dozycoffee.com ', name: ' 신입 ' })).toEqual({})
  })

  it('비어 있는 이메일과 이름은 입력하라는 문구를 돌려준다', () => {
    expect(validateInvite({ email: '  ', name: '' })).toEqual({ email: '이메일을 입력하세요.', name: '이름을 입력하세요.' })
  })

  it.each(['plain', 'a@b', '@dozycoffee.com', 'a b@dozycoffee.com'])('"%s"은 이메일 형식 오류다', (email) => {
    expect(validateInvite({ email, name: '신입' }).email).toMatch(/올바른 이메일 형식/)
  })
})
