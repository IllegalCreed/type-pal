import { type KeyboardEvent, useCallback, useEffect, useId, useMemo, useRef, useState } from 'react'
import { DsCheckbox, type DsControlSize, type DsOption, DsTextInput } from './controls.js'
import { DsFloatingLayer } from './floating-layer.js'
import { DsIcon } from './icons.js'

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
  const layerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const selected = useMemo(() => new Set(props.value), [props.value])
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase()
    if (!needle) return props.options
    return props.options.filter((option) =>
      `${option.label} ${option.value} ${option.description ?? ''}`
        .toLocaleLowerCase()
        .includes(needle),
    )
  }, [props.options, query])
  const labels = props.value
    .map((value) => props.options.find((option) => option.value === value)?.label ?? value)
    .slice(0, 2)
  const overflow = Math.max(0, props.value.length - labels.length)

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    setQuery('')
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  useEffect(() => {
    if (open) requestAnimationFrame(() => searchRef.current?.focus())
  }, [open])

  useEffect(() => {
    if (props.disabled && open) close(false)
  }, [close, open, props.disabled])

  function toggle(value: string): void {
    const option = props.options.find((candidate) => candidate.value === value)
    if (!option || option.disabled) return
    const next = new Set(props.value)
    if (next.has(value)) next.delete(value)
    else next.add(value)
    props.onChange([...next])
  }

  function handleLayerKeyDown(event: KeyboardEvent<HTMLDivElement>): void {
    if (event.key !== 'Escape') return
    close(true)
    event.preventDefault()
    event.stopPropagation()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className={`ds-select ds-multiselect__trigger${
          props.size === 'compact' ? ' ds-select--compact' : ''
        }`}
        aria-label={props.label}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={listId}
        disabled={props.disabled}
        onClick={() => setOpen((value) => !value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && open) close(false)
          else if (!open && ['Enter', ' ', 'ArrowDown'].includes(event.key)) setOpen(true)
          else return
          event.preventDefault()
        }}
      >
        <span className="ds-multiselect__summary">
          {labels.length ? labels.join('、') : '请选择'}
          {overflow ? ` +${overflow}` : ''}
        </span>
        <DsIcon name={open ? 'chevron-up' : 'chevron-down'} />
      </button>
      <DsFloatingLayer
        open={open}
        anchorRef={triggerRef}
        layerRef={layerRef}
        className="ds-select-popover ds-multiselect-popover"
        maxHeight={420}
        onDismiss={() => close(false)}
      >
        <div
          id={listId}
          role="dialog"
          aria-label={`选择${props.label}`}
          className="ds-multiselect-popover__content"
          onKeyDownCapture={handleLayerKeyDown}
        >
          <div className="ds-multiselect-popover__search">
            <DsTextInput
              ref={searchRef}
              size={props.size}
              aria-label={`搜索${props.label}`}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
            />
          </div>
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
          <fieldset className="ds-multiselect__options">
            <legend className="ds-visually-hidden">{props.label}选项</legend>
            {filtered.length ? (
              filtered.map((option) => (
                <div key={option.value} className="ds-multiselect__option">
                  <DsCheckbox
                    label={option.label}
                    size={props.size}
                    checked={selected.has(option.value)}
                    disabled={option.disabled}
                    onChange={() => toggle(option.value)}
                  />
                </div>
              ))
            ) : (
              <div className="ds-select-popover__empty">没有匹配的选项</div>
            )}
          </fieldset>
        </div>
      </DsFloatingLayer>
    </>
  )
}
