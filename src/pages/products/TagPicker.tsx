import { useState, type KeyboardEvent } from 'react'
import type { Tag } from '../../features/catalog/model/catalogSchemas'
import { addTagName } from '../../features/catalog/model/productValidation'

type Props = {
  /** 이미 있는 태그. 이름으로 골라 재사용한다. */
  tags: readonly Tag[]
  /** 고른 태그 이름(기존 태그와 새로 입력한 이름이 섞여 있다). 서버에는 이름으로 보낸다. */
  selected: readonly string[]
  onChange: (names: string[]) => void
  disabled: boolean
}

/**
 * 태그 고르기. 이미 있는 태그는 목록에서 눌러 고르고, 없는 태그는 이름을 입력해 더한다(요구사항 1.7).
 * 입력하면 목록이 걸러지고, 입력한 이름이 기존 태그와 같으면 그 태그를 고른 것이 되고 없으면 새 태그가 된다.
 * 새 태그는 상품을 저장할 때 서버가 만든다.
 */
export function TagPicker({ tags, selected, onChange, disabled }: Props) {
  const [draft, setDraft] = useState('')
  const existingNames = new Set(tags.map((tag) => tag.name))
  const keyword = draft.trim().toLowerCase()
  // 이미 고른 태그는 걸러도 계속 보여 선택 상태를 잃어버리지 않게 한다.
  const shown = keyword === '' ? tags : tags.filter((tag) => tag.name.toLowerCase().includes(keyword) || selected.includes(tag.name))
  const newNames = selected.filter((name) => !existingNames.has(name))

  const toggle = (name: string) => onChange(selected.includes(name) ? selected.filter((item) => item !== name) : [...selected, name])
  const add = () => {
    onChange(addTagName(selected, draft))
    setDraft('')
  }
  // Enter가 폼 제출로 이어지지 않도록 막고 태그로 더한다.
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter') return
    event.preventDefault()
    add()
  }

  return <fieldset className="tag-picker" disabled={disabled}>
    <legend>태그 (선택)</legend>
    {tags.length === 0
      ? <p className="employee-hint">등록된 태그가 아직 없습니다. 아래에 입력하면 새로 만들어집니다.</p>
      : <div className="tag-picker-options" role="group" aria-label="기존 태그">
        {shown.map((tag) => <button type="button" key={tag.id} className="tag-chip" aria-pressed={selected.includes(tag.name)} onClick={() => toggle(tag.name)}>{tag.name}</button>)}
        {shown.every((tag) => !tag.name.toLowerCase().includes(keyword)) && keyword !== '' && <span className="tag-picker-empty">"{draft.trim()}"와 일치하는 기존 태그가 없습니다.</span>}
      </div>}
    {newNames.length > 0 && <div className="tag-picker-new" role="group" aria-label="새로 만들 태그">
      {newNames.map((name) => <span key={name} className="tag-chip tag-chip-new">
        {name}<small>새 태그</small>
        <button type="button" aria-label={`${name} 태그 제거`} onClick={() => toggle(name)}>×</button>
      </span>)}
    </div>}
    <div className="tag-picker-input">
      <input value={draft} placeholder="태그 이름 입력 후 Enter" aria-label="태그 이름 입력" onChange={(event) => setDraft(event.target.value)} onKeyDown={onKeyDown} autoComplete="off" />
      <button type="button" className="inbound-action-button compact employee-secondary" disabled={draft.trim() === ''} onClick={add}>추가</button>
    </div>
    <p className="employee-hint">같은 이름의 태그가 있으면 그 태그를 쓰고, 없으면 저장할 때 새로 만들어집니다.</p>
  </fieldset>
}
