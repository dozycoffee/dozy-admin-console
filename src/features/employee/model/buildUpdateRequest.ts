import type { EmployeeDetail, UpdateEmployeeRequest } from './employeeSchemas'

/** 입력값과 현재 값을 비교해 바뀐 필드만 담는다. 비운 전화번호·주소는 null(삭제)로 보낸다. */
export function buildUpdateRequest(employee: Pick<EmployeeDetail, 'name' | 'phone' | 'address'>, input: { name: string; phone: string; address: string }): UpdateEmployeeRequest {
  const body: UpdateEmployeeRequest = {}
  const name = input.name.trim()
  const phone = input.phone.trim() || null
  const address = input.address.trim() || null
  if (name !== employee.name) body.name = name
  if (phone !== (employee.phone ?? null)) body.phone = phone
  if (address !== (employee.address ?? null)) body.address = address
  return body
}
