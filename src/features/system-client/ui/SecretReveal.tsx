import { useState } from 'react'
import { Modal } from '../../../shared/ui/Modal'
import { useToast } from '../../../shared/ui/toastContext'
import type { RevealedSecret } from '../model/systemClientSchemas'

type Props = {
  secret: RevealedSecret
  onClose: () => void
}

/**
 * 시스템 클라이언트 secret을 한 번만 보여주는 모달이다. 서버에는 해시만 남아 다시 볼 수 없으므로
 * 복사해 안전한 곳에 저장했다고 확인해야 닫을 수 있다.
 */
export function SecretReveal({ secret, onClose }: Props) {
  const { notify } = useToast()
  const [copied, setCopied] = useState<'failed' | null>(null)
  const [saved, setSaved] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(secret.clientSecret)
      setCopied(null)
      notify('클립보드에 복사했습니다.')
    } catch {
      // 클립보드를 쓸 수 없는 환경이면 입력창에서 직접 선택해 복사한다.
      setCopied('failed')
    }
  }

  return (
    // 닫기 버튼·Esc로는 닫히지 않고, 저장했다고 확인한 뒤 아래 "닫기"로만 닫는다. 한 번만 보이는 값을 실수로 놓치지 않게 하기 위해서다.
    <Modal open title={`${secret.clientId}의 secret`} dismissible={false} onClose={onClose}>
      <p className="secret-warning">이 secret은 지금 한 번만 볼 수 있습니다. 닫으면 다시 확인할 수 없고, 잃어버리면 재발급해야 합니다.</p>
      <div className="secret-box">
        <input readOnly value={secret.clientSecret} aria-label="클라이언트 secret" onFocus={(event) => event.target.select()} />
        <button type="button" className="inbound-action-button" onClick={copy}>복사</button>
      </div>
      {copied === 'failed' && <p className="inbound-error">복사하지 못했습니다. 입력창의 값을 직접 선택해 복사하세요.</p>}
      <label className="secret-confirm">
        <input type="checkbox" checked={saved} onChange={(event) => setSaved(event.target.checked)} />
        secret을 안전한 곳에 저장했습니다
      </label>
      <div className="inbound-form-actions">
        <button type="button" className="inbound-action-button" disabled={!saved} onClick={onClose}>닫기</button>
      </div>
    </Modal>
  )
}
