import { Tooltip } from './Tooltip'

type Props = {
  /** 배지가 무엇에 대한 안내인지(화면 읽기 도구용 이름). 예: "code 입력 규칙" */
  label: string
  /** 호버·포커스 때 보여줄 설명 */
  children: string
}

/** 입력칸 라벨 옆에 두는 작은 "?" 배지. 입력 규칙처럼 늘 보일 필요는 없지만 알아야 하는 설명을 호버·포커스 때 보여준다. */
export function FieldTip({ label, children }: Props) {
  return <Tooltip content={children} label={label} className="field-tip"><span className="field-tip-badge" aria-hidden="true">?</span></Tooltip>
}
