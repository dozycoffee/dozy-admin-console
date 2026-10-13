/** 직원 추가 모달의 단계: 1) 기본 정보, 2) 함께 부여할 role(선택) */
export type InviteStep = 1 | 2

export const INVITE_STEPS = 2

export const inviteStepLabels: Record<InviteStep, string> = { 1: '기본 정보', 2: 'role 부여 (선택)' }
