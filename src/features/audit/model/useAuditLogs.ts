import { useQuery } from '@tanstack/react-query'
import { ApiError } from '../../../shared/api/ApiError'
import { authHttpClient } from '../../../shared/api/httpClient'
import { toAdminErrorMessage } from '../../auth/model/adminErrors'
import { auditLogPageSchema, type AuditLogParams } from './auditSchemas'

/** 비어 있는 필터는 쿼리에서 빼고 action 여러 개는 쉼표로 잇는다. */
export function toAuditQueryParams({ from, to, actorId, targetType, targetId, actions, page, size }: AuditLogParams) {
  return {
    ...(from && { from }),
    ...(to && { to }),
    ...(actorId && { actorId }),
    ...(targetType && { targetType }),
    ...(targetId && { targetId }),
    ...(actions.length > 0 && { action: actions.join(',') }),
    page,
    size,
  }
}

/** owner만 조회할 수 있다. 최신순이며 기간 상한은 90일이다. */
export function useAuditLogs(params: AuditLogParams, { enabled = true }: { enabled?: boolean } = {}) {
  return useQuery({
    enabled,
    queryKey: ['audit-logs', 'list', params],
    queryFn: async () => auditLogPageSchema.parse((await authHttpClient.get('/admin/audit-logs', { params: toAuditQueryParams(params) })).data),
    placeholderData: (previous) => previous,
  })
}

/** 감사 로그 조회의 `VALIDATION_FAILED`는 기간·id 형식 문제다. */
export function toAuditErrorMessage(error: unknown): string {
  if (error instanceof ApiError && error.code === 'VALIDATION_FAILED') return '조회 조건을 확인해 주세요. 기간은 90일 이하여야 하고 시작이 종료보다 앞이어야 하며, 행위자 id는 올바른 UUID여야 합니다.'
  return toAdminErrorMessage(error)
}
