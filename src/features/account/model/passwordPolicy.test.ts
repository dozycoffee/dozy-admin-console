import { describe, expect, it } from 'vitest'
import { passwordLength, validateNewPassword } from './passwordPolicy'

describe('passwordLength (PWD-01)', () => {
  it('이모지 같은 보충 문자도 한 글자로 센다', () => {
    expect(passwordLength('a😀b')).toBe(3)
    expect(passwordLength('비밀번호')).toBe(4)
  })

  it('앞뒤 공백을 제거하지 않고 그대로 센다', () => {
    expect(passwordLength('  ab  ')).toBe(6)
  })
})

describe('validateNewPassword', () => {
  it('8자 미만이면 길이 안내를 한다', () => {
    expect(validateNewPassword('1234567', '1234567')).toBe('비밀번호는 8자 이상 128자 이하여야 합니다.')
  })

  it('8자와 128자는 허용하고 129자는 거부한다', () => {
    expect(validateNewPassword('a'.repeat(8), 'a'.repeat(8))).toBeNull()
    expect(validateNewPassword('a'.repeat(128), 'a'.repeat(128))).toBeNull()
    expect(validateNewPassword('a'.repeat(129), 'a'.repeat(129))).not.toBeNull()
  })

  it('이모지 4개는 4자라 거부하고 8개는 허용한다', () => {
    expect(validateNewPassword('😀'.repeat(4), '😀'.repeat(4))).not.toBeNull()
    expect(validateNewPassword('😀'.repeat(8), '😀'.repeat(8))).toBeNull()
  })

  it('확인 입력이 다르면 불일치 안내를 한다', () => {
    expect(validateNewPassword('password-1', 'password-2')).toBe('비밀번호 확인이 일치하지 않습니다.')
  })

  it('문자 조합은 강제하지 않는다(PWD-02)', () => {
    expect(validateNewPassword('aaaaaaaa', 'aaaaaaaa')).toBeNull()
    expect(validateNewPassword('12345678', '12345678')).toBeNull()
  })
})
