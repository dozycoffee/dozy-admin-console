import { shortenId } from '../../features/audit/model/auditId'
import { Tooltip } from '../../shared/ui/Tooltip'
import { useCopyText } from '../../shared/ui/useCopyText'

/**
 * 행위자·대상을 종류와 id 칩으로 보여준다. 칩은 줄여 보이고(앞 6·뒤 4자리), 올리면 바로 전체 id와 "클릭해 복사" 안내가 뜨며
 * 클릭하거나 Enter를 누르면 전체 id를 복사한다. 이름·이메일은 감사 로그에 없어 id로만 구분한다.
 */
export function AuditId({ type, id }: { type?: string | null; id?: string | null }) {
  const copy = useCopyText()
  if (!id && !type) return <span className="audit-none">-</span>
  return <span className="audit-id">
    {type && <b>{type}</b>}
    {id && <Tooltip content={`${id}\n클릭하여 복사`} label={`${type ? `${type} ` : ''}id ${shortenId(id)} 복사`} onActivate={() => copy(id, 'id를 복사했습니다.')} className="audit-id-chip">
      <code>{shortenId(id)}</code>
    </Tooltip>}
  </span>
}
