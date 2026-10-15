import { useId, useRef, useState, type KeyboardEvent } from 'react'

export type SearchSelectOption = { value: string; label: string }

type Props = {
  label: string
  options: readonly SearchSelectOption[]
  /** 고른 항목의 값. 아무것도 고르지 않았으면 빈 문자열이다. */
  value: string
  onChange: (value: string) => void
  placeholder?: string
  /** 한 번에 보여줄 항목 수. 넘으면 더 입력해 좁히라고 안내한다. */
  maxVisible?: number
  /**
   * 서버 검색처럼 항목을 바깥에서 거를 때 넘긴다. 입력할 때마다(닫을 때는 빈 문자열로) 호출하고, `options`는 이미 걸러진 결과라 다시 거르지 않고 그대로 보여준다.
   * 입력이 멈춘 뒤에 요청하도록 디바운스는 호출한 쪽이 한다.
   */
  onQueryChange?: (query: string) => void
  /** 바깥에서 검색하는 중. 결과가 아직 없으면 "검색 중..."을 보여준다. */
  loading?: boolean
  /** 고른 항목이 검색 결과(`options`)에 없을 때 입력칸에 보여줄 이름. */
  selectedLabel?: string
  /** 바깥 검색 결과에 담기지 않은 나머지 항목 수. 있으면 더 입력해 좁히라고 안내한다. */
  hiddenCount?: number
}

/**
 * 입력한 글자가 들어 있는 항목만 보여주고 고르게 하는 검색형 선택. 항목이 많아 `<select>`로는 찾기 어려울 때 쓴다.
 * 고른 항목은 입력칸에 이름으로 보이고 ×로 지우면 선택이 비워진다. 키보드(↑ ↓ Enter Esc)와 combobox/listbox 속성을 지원한다.
 * 항목이 서버에 있어 다 받을 수 없을 때는 `onQueryChange`로 입력을 넘겨 서버가 거른 결과를 `options`로 받는다.
 */
export function SearchSelect({ label, options, value, onChange, placeholder = '전체', maxVisible = 50, onQueryChange, loading = false, selectedLabel, hiddenCount = 0 }: Props) {
  const id = useId()
  const listId = `${id}-list`
  const inputRef = useRef<HTMLInputElement>(null)
  // 입력 중인 글자. null이면 고른 항목의 이름을 보여준다.
  const [typing, setTyping] = useState<string | null>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = options.find((option) => option.value === value)
  const query = (typing ?? '').trim().toLowerCase()
  const remote = onQueryChange !== undefined
  const matches = remote || query === '' ? options : options.filter((option) => option.label.toLowerCase().includes(query))
  const visible = matches.slice(0, maxVisible)
  const moreCount = remote ? hiddenCount : matches.length - visible.length
  const activeIndex = Math.min(active, Math.max(visible.length - 1, 0))

  function close() {
    setOpen(false)
    setTyping(null)
    onQueryChange?.('')
  }

  function choose(option: SearchSelectOption) {
    onChange(option.value)
    close()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      if (!open) setOpen(true)
      else setActive(Math.min(activeIndex + 1, visible.length - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      setActive(Math.max(activeIndex - 1, 0))
    } else if (event.key === 'Enter' && open) {
      // 목록이 열려 있을 때의 Enter는 항목 선택이고 폼 제출이 아니다.
      event.preventDefault()
      if (visible[activeIndex]) choose(visible[activeIndex])
    } else if (event.key === 'Escape' && open) {
      event.preventDefault()
      close()
    }
  }

  return <div className="search-select">
    <label htmlFor={id}>{label}</label>
    <div className="search-select-field">
      <input
        id={id}
        ref={inputRef}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && visible[activeIndex] ? `${id}-option-${activeIndex}` : undefined}
        value={typing ?? selected?.label ?? selectedLabel ?? ''}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => setOpen(true)}
        onBlur={close}
        onChange={(event) => { setTyping(event.target.value); onQueryChange?.(event.target.value); setOpen(true); setActive(0) }}
        onKeyDown={onKeyDown}
      />
      {value !== '' && <button type="button" className="search-select-clear" aria-label={`${label} 선택 지우기`} onMouseDown={(event) => event.preventDefault()} onClick={() => { onChange(''); close(); inputRef.current?.focus() }}>×</button>}
    </div>
    {open && <ul id={listId} role="listbox" aria-label={`${label} 목록`} className="search-select-list">
      {visible.map((option, index) => <li
        key={option.value}
        id={`${id}-option-${index}`}
        role="option"
        aria-selected={option.value === value}
        className={index === activeIndex ? 'active' : undefined}
        // 클릭하기 전에 입력칸이 포커스를 잃어 목록이 닫히지 않게 한다.
        onMouseDown={(event) => event.preventDefault()}
        onMouseEnter={() => setActive(index)}
        onClick={() => choose(option)}
      >{option.label}</li>)}
      {visible.length === 0 && <li role="presentation" className="search-select-empty">{loading ? '검색 중...' : '일치하는 항목이 없습니다.'}</li>}
      {moreCount > 0 && <li role="presentation" className="search-select-more">{moreCount}개가 더 있습니다. 더 입력해 좁혀 주세요.</li>}
    </ul>}
  </div>
}
