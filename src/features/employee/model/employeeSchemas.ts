import { z } from 'zod'

export const employeeStatusSchema = z.enum(['PENDING', 'ACTIVE', 'SUSPENDED', 'DEACTIVATED'])
export type EmployeeStatus = z.infer<typeof employeeStatusSchema>

export const employeeStatusLabels: Record<EmployeeStatus, string> = {
  PENDING: '초대 대기',
  ACTIVE: '활성',
  SUSPENDED: '정지',
  DEACTIVATED: '비활성화',
}

export const employeeStatuses = employeeStatusSchema.options

/** 주소 쿼리(`?status=PENDING`)의 값을 상태로 바꾼다. 비었거나 알 수 없는 값이면 빈 문자열(필터 없음)이다. */
export function parseEmployeeStatus(value: string | null | undefined): EmployeeStatus | '' {
  const parsed = employeeStatusSchema.safeParse(value)
  return parsed.success ? parsed.data : ''
}

export const employeeSummarySchema = z.object({
  principalId: z.string(),
  email: z.string(),
  name: z.string(),
  status: employeeStatusSchema,
  roles: z.array(z.string()),
  createdAt: z.string(),
})
export type EmployeeSummary = z.infer<typeof employeeSummarySchema>

const pageSchema = z.object({
  number: z.number(),
  size: z.number(),
  totalElements: z.number(),
  totalPages: z.number(),
})

export const employeePageSchema = z.object({
  items: z.array(employeeSummarySchema),
  page: pageSchema,
})
export type EmployeePage = z.infer<typeof employeePageSchema>

export const employeeDetailSchema = z.object({
  principalId: z.string(),
  email: z.string(),
  name: z.string(),
  phone: z.string().nullish(),
  address: z.string().nullish(),
  status: employeeStatusSchema,
  roles: z.array(z.string()),
  lockedUntil: z.string().nullish(),
  invitation: z.object({ expiresAt: z.string() }).nullish(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type EmployeeDetail = z.infer<typeof employeeDetailSchema>

export const inviteEmployeeResponseSchema = z.object({
  principalId: z.string(),
  status: employeeStatusSchema,
  invitationExpiresAt: z.string(),
})

export const resendInvitationResponseSchema = z.object({
  invitationExpiresAt: z.string(),
})

export type InviteEmployeeRequest = {
  email: string
  name: string
  phone?: string
  address?: string
  roles?: string[]
}

export type EmployeeListParams = {
  status?: EmployeeStatus
  role?: string
  q?: string
  /** 0부터 시작 */
  page: number
  size: number
}

/** 보낸 필드만 수정한다. phone·address는 null이면 삭제한다. email은 바꿀 수 없다. */
export type UpdateEmployeeRequest = {
  name?: string
  phone?: string | null
  address?: string | null
}
