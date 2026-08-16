import { type KeyboardEvent, useId, useMemo, useRef, useState } from 'react'
import {
  DsCheckbox,
  type DsControlSize,
  type DsOption,
  DsTextInput,
  dsClasses,
} from './controls.js'
import { DsIcon } from './icons.js'

function moveIndex(current: number, delta: number, length: number): number {
  if (length <= 0) return -1
  return (current + delta + length) % length
}

export function DsCombobox(props: {
  label: string
  options: readonly DsOption[]
  value?: string
  placeholder?: string
  disabled?: boolean
  size?: DsControlSize
  onChange: (value: string | undefined) => void
}) {
  const listId = useId()
  const [open, setOpen] = useState(false)
  const selected = props.options.find((option) => option.value === props.value)
  const [query, setQuery] = useState(selected?.label ?? '')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle || selected?.label === query) return props.options
    return props.options.filter((option) =>
      `${option.label} ${option.value} ${option.description ?? ''}`
        .toLocaleLowerCase()
        .includes(needle),
    )
  }, [props.options, query, selected?.label])

  function choose(option: DsOption): void {
    if (option.disabled) return
    props.onChange(option.value)
    setQuery(option.label)
    setOpen(false)
    inputRef.current?.focus()
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === 'ArrowDown') {
      setOpen(true)
      setActiveIndex((index) => moveIndex(index, 1, filtered.length))
    } else if (event.key === 'ArrowUp') {
      setOpen(true)
      setActiveIndex((index) => moveIndex(index, -1, filtered.length))
    } else if (event.key === 'Home' && open) setActiveIndex(0)
    else if (event.key === 'End' && open) setActiveIndex(Math.max(0, filtered.length - 1))
    else if (event.key === 'Enter' && open) {
      const option = filtered[activeIndex]
      if (option) choose(option)
    } else if (event.key === 'Escape') {
      setOpen(false)
      setQuery(selected?.label ?? '')
    } else return
    event.preventDefault()
  }

  return (
    <div className="ds-combobox">
      <DsTextInput
        ref={inputRef}
        role="combobox"
        aria-label={props.label}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          open && filtered[activeIndex] ? `${listId}-${activeIndex}` : undefined
        }
        value={query}
        placeholder={props.placeholder}
        disabled={props.disabled}
        size={props.size}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.currentTarget.value)
          setActiveIndex(0)
          setOpen(true)
        }}
        onKeyDown={onKeyDown}
      />
      {open ? (
        <div id={listId} role="listbox" className="ds-menu-popover ds-selection-popover">
          {filtered.length === 0 ? (
            <div className="ds-menu-item" role="status">
              无匹配项
            </div>
          ) : (
            filtered.map((option, index) => (
              <button
                key={option.value}
                id={`${listId}-${index}`}
                type="button"
                role="option"
                className="ds-menu-item"
                aria-selected={option.value === props.value}
                disabled={option.disabled}
                title={
                  option.description ? `${option.label} · ${option.description}` : option.label
                }
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => choose(option)}
              >
                <span>{option.label}</span>
                <span className="ds-spacer" />
                <span className="ds-field__help">{option.description ?? option.value}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  )
}

export function DsMultiSelect(props: {
  label: string
  options: readonly DsOption[]
  value: readonly string[]
  disabled?: boolean
  size?: DsControlSize
  onChange: (value: string[]) => void
}) {
  const listId = useId()
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = new Set(props.value)
  const filtered = props.options.filter((option) =>
    `${option.label} ${option.value}`.toLocaleLowerCase().includes(query.toLocaleLowerCase()),
  )
  const labels = props.value
    .map((value) => props.options.find((option) => option.value === value)?.label ?? value)
    .slice(0, 2)
  const overflow = Math.max(0, props.value.length - labels.length)

  function toggle(value: string): void {
    const next = new Set(props.value)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    props.onChange([...next])
  }

  return (
    <div className="ds-combobox ds-multiselect">
      <button
        ref={triggerRef}
        type="button"
        className={dsClasses(
          'ds-select',
          props.size === 'compact' && 'ds-select--compact',
          'ds-multiselect__trigger',
        )}
        aria-label={props.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        disabled={props.disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape') setOpen(false)
          else if (['Enter', ' ', 'ArrowDown'].includes(event.key)) setOpen(true)
          else return
          event.preventDefault()
        }}
      >
        <span className="ds-multiselect__summary">
          {labels.length ? labels.join('、') : '请选择'}
          {overflow ? ` +${overflow}` : ''}
        </span>
        <DsIcon name="chevron-down" />
      </button>
      {open ? (
        <div
          className="ds-menu-popover ds-selection-popover"
          role="dialog"
          aria-label={`选择${props.label}`}
          onKeyDownCapture={(event) => {
            if (event.key !== 'Escape') return
            setOpen(false)
            triggerRef.current?.focus()
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          <DsTextInput
            size={props.size}
            aria-label={`搜索${props.label}`}
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
          />
          <div className="ds-multiselect__actions">
            <button
              type="button"
              className="ds-menu-item"
              onClick={() => {
                const next = new Set(props.value)
                for (const option of filtered) {
                  if (!option.disabled) next.add(option.value)
                }
                props.onChange([...next])
              }}
            >
              全选
            </button>
            <button type="button" className="ds-menu-item" onClick={() => props.onChange([])}>
              清空
            </button>
            <span className="ds-spacer" />
            <span className="ds-field__help">已选 {props.value.length} 项</span>
          </div>
          <fieldset id={listId} className="ds-multiselect__options">
            <legend className="ds-visually-hidden">{props.label}选项</legend>
            {filtered.map((option) => (
              <div key={option.value} className="ds-multiselect__option">
                <DsCheckbox
                  label={option.label}
                  size={props.size}
                  checked={selected.has(option.value)}
                  disabled={option.disabled}
                  onChange={() => toggle(option.value)}
                />
              </div>
            ))}
          </fieldset>
        </div>
      ) : null}
    </div>
  )
}
