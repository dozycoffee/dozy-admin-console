import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { refreshAccessToken } from '../../features/auth/model/authApi'
import { useAuth } from '../../features/auth/model/useAuth'
import { ApiError } from '../../shared/api/ApiError'
import { toOwnerTransferErrorMessage } from '../../features/owner-transfer/model/ownerTransferErrors'
import { useAcceptOwnerTransfer } from '../../features/owner-transfer/model/useOwnerTransfer'
import { ConfirmModal } from '../../shared/ui/ConfirmModal'

/**
 * owner 양도 메일의 링크(`/owner-transfer?token=`)가 여는 화면. 링크만 가로챈 사람이 owner가 되지 못하도록
 * 양도 대상 직원이 본인 계정으로 로그인한 상태에서만 수락할 수 있다. 대상이 아직 role이 없을 수 있어
 * 업무 모드를 고르는 콘솔 셸 밖의 독립 화면으로 둔다.
 */
export function AcceptOwnerTransferPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const accept = useAcceptOwnerTransfer()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [done, setDone] = useState(false)
  const notTarget = accept.isError && accept.error instanceof ApiError && accept.error.code === 'FORBIDDEN'

  function confirmAccept() {
    setConfirmOpen(false)
    accept.mutate(token, {
      onSuccess: async () => {
        try {
          // 새 owner는 다음 토큰 갱신부터 owner 권한을 갖는다. 바로 갱신해 지금 화면에도 반영한다.
          await refreshAccessToken()
          await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] })
        } finally {
          setDone(true)
        }
      },
    })
  }

  return (
    <div className="login-page">
      <section className="login-card">
        <div className="brand">DOZY <span>COFFEE</span></div>
        {token === '' && <p className="login-error" role="alert">{toOwnerTransferErrorMessage(new ApiError('x', { status: 410, code: 'VERIFICATION_EXPIRED' }), 'accept')}</p>}
        {token !== '' && done && <>
          <p className="login-notice" role="status">owner 권한을 넘겨받았습니다. 계정 관리자 모드에서 새 권한을 사용할 수 있습니다.</p>
          <button type="button" className="button" onClick={() => navigate('/', { replace: true })}>콘솔로 이동</button>
        </>}
        {token !== '' && !done && <>
          <p>{user?.name}님에게 owner 권한 양도가 요청되었습니다. 수락하면 이 계정이 새 owner가 되고 이전 owner는 role 없는 직원이 됩니다.</p>
          <small className="login-hint">링크를 받은 본인이 아니라면 수락하지 말고 이 창을 닫으세요. 수락하지 않으면 owner 권한은 바뀌지 않습니다.</small>
          {accept.isError && <p className="login-error" role="alert">{toOwnerTransferErrorMessage(accept.error, 'accept')}</p>}
          {notTarget
            ? <button type="button" className="button" onClick={logout}>다른 계정으로 로그인</button>
            : !accept.isError && <button type="button" className="button" disabled={accept.isPending} onClick={() => setConfirmOpen(true)}>{accept.isPending ? '수락 중...' : 'owner 권한 수락'}</button>}
        </>}
        {(token === '' || (accept.isError && !notTarget)) && <Link className="login-link" to="/">콘솔로 이동</Link>}
      </section>
      <ConfirmModal
        open={confirmOpen}
        title="owner 권한을 수락할까요?"
        description="수락하면 이 계정이 owner가 되고 이전 owner는 role 없는 직원이 됩니다. 되돌리려면 새 owner가 다시 양도해야 합니다."
        confirmLabel="수락"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={confirmAccept}
      />
    </div>
  )
}
