import {
  type ButtonHTMLAttributes,
  forwardRef,
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { DS_OPTION_VIRTUALIZE_ABOVE, filterDsCollection } from './collection-search.js'
import { classes, describedBy } from './control-utils.js'
import { DsField, type DsFieldChromeProps } from './field-layout.js'
import { DsFloatingLayer } from './floating-layer.js'
import { DsIcon } from './icons.js'
import type { DsFormControlAppearance } from './text-inputs.js'

export interface DsOption {
  value: string
  label: string
  description?: string
  /** Opt-in native disclosure for copy that may be clipped by a constrained option row. */
  title?: string
  /** Stable technical identifiers may use the secondary slot without forcing the primary label to monospace. */
  descriptionMonospace?: boolean
  disabled?: boolean
}

const SELECT_SEARCH_THRESHOLD = 20
const SELECT_OPTION_HEIGHT = 40
const SELECT_VISIBLE_OPTIONS = 8
const SELECT_OVERSCAN = 4

type DsSelectButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  | 'children'
  | 'className'
  | 'style'
  | 'size'
  | 'type'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'name'
  | 'form'
>

export type DsSelectProps = DsSelectButtonProps &
  DsFormControlAppearance & {
    options: readonly DsOption[]
    value: string
    onValueChange: (value: string) => void
    placeholder?: string
    /** Long option sets become searchable automatically. */
    searchable?: boolean | 'auto'
    required?: boolean
  }

interface IndexedOption {
  option: DsOption
  sourceIndex: number
}

function firstEnabledValue(options: readonly IndexedOption[], fromEnd = false): string | null {
  const iterable = fromEnd ? [...options].reverse() : options
  return iterable.find(({ option }) => !option.disabled)?.option.value ?? null
}

function nextEnabledValue(
  options: readonly IndexedOption[],
  activeValue: string | null,
  delta: -1 | 1,
): string | null {
  if (!options.length) return null
  const activeIndex = options.findIndex(({ option }) => option.value === activeValue)
  let index = activeIndex < 0 ? (delta > 0 ? -1 : options.length) : activeIndex
  for (let visited = 0; visited < options.length; visited += 1) {
    index = (index + delta + options.length) % options.length
    const candidate = options[index]
    if (candidate && !candidate.option.disabled) return candidate.option.value
  }
  return null
}

const TAB_STOP_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[contenteditable="true"]',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

function focusAdjacentTabStop(
  reference: HTMLElement,
  backwards: boolean,
  excludedRoot: HTMLElement | null,
): void {
  const scope = reference.closest('dialog[open]') ?? document
  const candidates = [...scope.querySelectorAll<HTMLElement>(TAB_STOP_SELECTOR)].filter(
    (candidate) => {
      if (excludedRoot?.contains(candidate) || candidate.closest('[hidden], [inert]')) return false
      if (candidate.getAttribute('aria-hidden') === 'true' || candidate.tabIndex < 0) return false
      const style = window.getComputedStyle(candidate)
      return style.display !== 'none' && style.visibility !== 'hidden'
    },
  )
  const currentIndex = candidates.indexOf(reference)
  if (currentIndex < 0) return
  candidates[currentIndex + (backwards ? -1 : 1)]?.focus()
}

function virtualWindowStart(optionCount: number, scrollTop: number, visibleCount: number): number {
  return Math.max(
    0,
    Math.min(
      Math.floor(scrollTop / SELECT_OPTION_HEIGHT) - SELECT_OVERSCAN,
      Math.max(0, optionCount - visibleCount),
    ),
  )
}

export const DsSelect = forwardRef<HTMLButtonElement, DsSelectProps>(function DsSelect(props, ref) {
  const {
    options,
    value,
    onValueChange,
    placeholder,
    searchable = 'auto',
    required,
    invalid,
    size = 'default',
    monospace = false,
    disabled,
    id,
    onKeyDown,
    onClick,
    ...buttonProps
  } = props
  const generatedId = useId()
  const controlId = id ?? `ds-select-${generatedId}`
  const listboxId = `${controlId}-listbox`
  const searchId = `${controlId}-search`
  const triggerRef = useRef<HTMLButtonElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const typeaheadRef = useRef({ text: '', at: 0 })
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [activeValue, setActiveValue] = useState<string | null>(null)
  const [listScrollTop, setListScrollTop] = useState(0)
  const selected = options.find((option) => option.value === value)
  const missing = value !== '' && !selected
  const hasSearch =
    searchable === true || (searchable === 'auto' && options.length >= SELECT_SEARCH_THRESHOLD)

  const indexedOptions = useMemo<IndexedOption[]>(
    () => options.map((option, sourceIndex) => ({ option, sourceIndex })),
    [options],
  )
  const filteredOptions = useMemo(
    () =>
      filterDsCollection(indexedOptions, query, ({ option }) => [
        option.label,
        option.value,
        option.description,
      ]),
    [indexedOptions, query],
  )
  const activeIndex = filteredOptions.findIndex(({ option }) => option.value === activeValue)
  const virtual = filteredOptions.length > DS_OPTION_VIRTUALIZE_ABOVE
  const visibleCount = SELECT_VISIBLE_OPTIONS + SELECT_OVERSCAN * 2
  const virtualStart = virtual
    ? virtualWindowStart(filteredOptions.length, listScrollTop, visibleCount)
    : 0
  const renderedOptions = virtual
    ? filteredOptions.slice(virtualStart, virtualStart + visibleCount)
    : filteredOptions

  const setTriggerNode = useCallback(
    (node: HTMLButtonElement | null) => {
      triggerRef.current = node
      if (typeof ref === 'function') ref(node)
      else if (ref) ref.current = node
    },
    [ref],
  )

  const ensureVisible = useCallback(
    (nextValue: string | null, collection: readonly IndexedOption[] = filteredOptions) => {
      if (nextValue == null) return
      const index = collection.findIndex(({ option }) => option.value === nextValue)
      if (index < 0) return
      const viewport = listRef.current
      const viewportHeight = viewport?.clientHeight || SELECT_VISIBLE_OPTIONS * SELECT_OPTION_HEIGHT
      const optionTop = index * SELECT_OPTION_HEIGHT
      const optionBottom = optionTop + SELECT_OPTION_HEIGHT
      let nextScrollTop = viewport?.scrollTop ?? listScrollTop
      if (optionTop < nextScrollTop) nextScrollTop = optionTop
      else if (optionBottom > nextScrollTop + viewportHeight)
        nextScrollTop = optionBottom - viewportHeight
      if (nextScrollTop !== listScrollTop) setListScrollTop(nextScrollTop)
      if (viewport && viewport.scrollTop !== nextScrollTop) viewport.scrollTop = nextScrollTop
    },
    [filteredOptions, listScrollTop],
  )

  const closeSelect = useCallback((restoreFocus = false) => {
    setOpen(false)
    setQuery('')
    setListScrollTop(0)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [])

  const openSelect = useCallback(
    (fromEnd = false, initialQuery = '', useBoundary = false) => {
      if (disabled) return
      const selectedEnabled = selected && !selected.disabled ? selected.value : null
      const initialOptions = filterDsCollection(indexedOptions, initialQuery, ({ option }) => [
        option.label,
        option.value,
        option.description,
      ])
      const nextActive = useBoundary
        ? firstEnabledValue(initialOptions, fromEnd)
        : (selectedEnabled ?? firstEnabledValue(initialOptions, fromEnd))
      setQuery(initialQuery)
      setActiveValue(nextActive)
      const index = initialOptions.findIndex(({ option }) => option.value === nextActive)
      setListScrollTop(Math.max(0, (index - 2) * SELECT_OPTION_HEIGHT))
      setOpen(true)
    },
    [disabled, indexedOptions, selected],
  )

  const chooseValue = useCallback(
    (nextValue: string) => {
      const option = options.find((candidate) => candidate.value === nextValue)
      if (!option || option.disabled) return
      if (nextValue !== value) onValueChange(nextValue)
      closeSelect(true)
    },
    [closeSelect, onValueChange, options, value],
  )

  const moveActive = useCallback(
    (delta: -1 | 1) => {
      const nextValue = nextEnabledValue(filteredOptions, activeValue, delta)
      setActiveValue(nextValue)
      ensureVisible(nextValue)
    },
    [activeValue, ensureVisible, filteredOptions],
  )

  const handleListNavigation = useCallback(
    (event: ReactKeyboardEvent, fromSearch = false) => {
      if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return false
      if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
        event.preventDefault()
        moveActive(event.key === 'ArrowDown' ? 1 : -1)
        return true
      }
      if (!fromSearch && (event.key === 'Home' || event.key === 'End')) {
        event.preventDefault()
        const nextValue = firstEnabledValue(filteredOptions, event.key === 'End')
        setActiveValue(nextValue)
        ensureVisible(nextValue)
        return true
      }
      if (event.key === 'Enter' || (!fromSearch && event.key === ' ')) {
        event.preventDefault()
        if (activeValue != null) chooseValue(activeValue)
        return true
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        closeSelect(true)
        return true
      }
      if (event.key === 'Tab') {
        event.preventDefault()
        const trigger = triggerRef.current
        const layer = layerRef.current
        closeSelect(false)
        if (trigger)
          requestAnimationFrame(() => focusAdjacentTabStop(trigger, event.shiftKey, layer))
        return true
      }
      return false
    },
    [activeValue, chooseValue, closeSelect, ensureVisible, filteredOptions, moveActive],
  )

  const handleTriggerKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLButtonElement>) => {
      onKeyDown?.(event)
      if (event.defaultPrevented) return
      if (open) {
        if (handleListNavigation(event)) return
        if (
          !hasSearch &&
          event.key.length === 1 &&
          !event.metaKey &&
          !event.ctrlKey &&
          !event.altKey
        ) {
          event.preventDefault()
          const now = Date.now()
          const previous = typeaheadRef.current
          const text =
            `${now - previous.at < 700 ? previous.text : ''}${event.key}`.toLocaleLowerCase()
          typeaheadRef.current = { text, at: now }
          const candidate = indexedOptions.find(
            ({ option }) => !option.disabled && option.label.toLocaleLowerCase().startsWith(text),
          )
          if (candidate) {
            setActiveValue(candidate.option.value)
            ensureVisible(candidate.option.value, indexedOptions)
          }
        }
        return
      }
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
        event.preventDefault()
        openSelect(
          event.key === 'ArrowUp' || event.key === 'End',
          '',
          event.key === 'Home' || event.key === 'End',
        )
        return
      }
      if (event.key.length === 1 && !event.metaKey && !event.ctrlKey && !event.altKey) {
        event.preventDefault()
        if (hasSearch) {
          openSelect(false, event.key)
          return
        }
        const now = Date.now()
        const previous = typeaheadRef.current
        const text =
          `${now - previous.at < 700 ? previous.text : ''}${event.key}`.toLocaleLowerCase()
        typeaheadRef.current = { text, at: now }
        const candidate = indexedOptions.find(
          ({ option }) => !option.disabled && option.label.toLocaleLowerCase().startsWith(text),
        )
        if (candidate) chooseValue(candidate.option.value)
      }
    },
    [
      chooseValue,
      ensureVisible,
      handleListNavigation,
      hasSearch,
      indexedOptions,
      onKeyDown,
      open,
      openSelect,
    ],
  )

  useEffect(() => {
    if (!open) return
    const activeStillAvailable = filteredOptions.some(
      ({ option }) => option.value === activeValue && !option.disabled,
    )
    if (!activeStillAvailable) {
      const nextActive = firstEnabledValue(filteredOptions)
      setActiveValue(nextActive)
      setListScrollTop(0)
    }
  }, [activeValue, filteredOptions, open])

  useEffect(() => {
    if (!open || !hasSearch) return
    requestAnimationFrame(() => searchRef.current?.focus())
  }, [hasSearch, open])

  useLayoutEffect(() => {
    const viewport = listRef.current
    if (open && viewport && viewport.scrollTop !== listScrollTop) viewport.scrollTop = listScrollTop
  }, [listScrollTop, open])

  useEffect(() => {
    if (disabled && open) closeSelect(false)
  }, [closeSelect, disabled, open])

  const activeOptionId =
    activeIndex >= virtualStart && activeIndex < virtualStart + renderedOptions.length
      ? `${listboxId}-option-${filteredOptions[activeIndex]?.sourceIndex ?? activeIndex}`
      : undefined
  const displayLabel =
    selected?.label ?? (value === '' ? placeholder || '请选择' : `${value}（缺失）`)
  const description = selected?.description
  // Keep active-descendant semantics on the element that currently owns combobox focus.
  const triggerSemantics = {
    role: hasSearch && open ? undefined : ('combobox' as const),
    'aria-activedescendant': !hasSearch && open ? activeOptionId : undefined,
    'aria-required': required || undefined,
  }

  return (
    <>
      <button
        {...buttonProps}
        ref={setTriggerNode}
        id={controlId}
        type="button"
        {...triggerSemantics}
        className={classes(
          'ds-select',
          size === 'compact' && 'ds-select--compact',
          monospace && 'ds-control--monospace',
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-invalid={invalid || undefined}
        data-missing={missing || undefined}
        onClick={(event) => {
          onClick?.(event)
          if (!event.defaultPrevented) {
            if (open) closeSelect(false)
            else openSelect(false)
          }
        }}
        onKeyDown={handleTriggerKeyDown}
      >
        <span className="ds-select__content">
          <span className="ds-select__value">{displayLabel}</span>
          {description ? (
            <span
              className={classes(
                'ds-select__description',
                selected?.descriptionMonospace && 'ds-control--monospace',
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
        <DsIcon name={open ? 'chevron-up' : 'chevron-down'} />
      </button>
      <DsFloatingLayer
        open={open}
        anchorRef={triggerRef}
        layerRef={layerRef}
        className="ds-select-popover"
        maxHeight={360}
        onDismiss={closeSelect}
      >
        {hasSearch ? (
          <div className="ds-select-popover__search">
            <label id={`${searchId}-label`} htmlFor={searchId}>
              筛选选项
            </label>
            <input
              ref={searchRef}
              id={searchId}
              className="ds-select-popover__search-input"
              type="search"
              role="combobox"
              value={query}
              autoComplete="off"
              aria-expanded="true"
              aria-controls={listboxId}
              aria-activedescendant={activeOptionId}
              aria-autocomplete="list"
              aria-invalid={invalid || undefined}
              aria-required={required || undefined}
              aria-label={
                buttonProps['aria-label'] ? `筛选${buttonProps['aria-label']}` : undefined
              }
              aria-labelledby={
                buttonProps['aria-label']
                  ? undefined
                  : classes(buttonProps['aria-labelledby'], `${searchId}-label`)
              }
              placeholder={`搜索 ${options.length} 项`}
              onChange={(event) => {
                const nextQuery = event.currentTarget.value
                const nextOptions = filterDsCollection(indexedOptions, nextQuery, ({ option }) => [
                  option.label,
                  option.value,
                  option.description,
                ])
                setQuery(nextQuery)
                setActiveValue(firstEnabledValue(nextOptions))
                setListScrollTop(0)
              }}
              onKeyDown={(event) => handleListNavigation(event, true)}
            />
          </div>
        ) : null}
        <div
          ref={listRef}
          id={listboxId}
          className="ds-select-popover__list"
          role="listbox"
          aria-label={
            buttonProps['aria-labelledby']
              ? undefined
              : buttonProps['aria-label']
                ? `${buttonProps['aria-label']}选项`
                : '可选项'
          }
          aria-labelledby={buttonProps['aria-labelledby']}
          style={
            virtual
              ? {
                  height:
                    Math.min(filteredOptions.length, SELECT_VISIBLE_OPTIONS) * SELECT_OPTION_HEIGHT,
                }
              : undefined
          }
          onScroll={(event) => {
            const nextScrollTop = event.currentTarget.scrollTop
            setListScrollTop(nextScrollTop)
            if (!virtual) return
            const nextStart = virtualWindowStart(
              filteredOptions.length,
              nextScrollTop,
              visibleCount,
            )
            const nextEnd = Math.min(filteredOptions.length, nextStart + visibleCount)
            if (activeIndex >= nextStart && activeIndex < nextEnd) return
            const firstVisibleIndex = Math.min(
              filteredOptions.length - 1,
              Math.max(0, Math.floor(nextScrollTop / SELECT_OPTION_HEIGHT)),
            )
            const visibleOptions = filteredOptions.slice(
              firstVisibleIndex,
              Math.min(filteredOptions.length, firstVisibleIndex + SELECT_VISIBLE_OPTIONS),
            )
            setActiveValue(
              firstEnabledValue(visibleOptions) ??
                firstEnabledValue(filteredOptions.slice(nextStart, nextEnd)),
            )
          }}
        >
          {filteredOptions.length ? (
            <div
              className={classes(virtual && 'ds-select-popover__virtual')}
              style={
                virtual ? { height: filteredOptions.length * SELECT_OPTION_HEIGHT } : undefined
              }
            >
              <div
                className={classes(virtual && 'ds-select-popover__virtual-window')}
                style={
                  virtual
                    ? { transform: `translateY(${virtualStart * SELECT_OPTION_HEIGHT}px)` }
                    : undefined
                }
              >
                {renderedOptions.map(({ option, sourceIndex }, renderedIndex) => {
                  const optionId = `${listboxId}-option-${sourceIndex}`
                  const selectedOption = option.value === value
                  const activeOption = option.value === activeValue
                  return (
                    // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: APG active-descendant focus stays on the combobox/listbox; the owner handles keyboard selection for every option.
                    <div
                      key={`${option.value}-${sourceIndex}`}
                      id={optionId}
                      className="ds-select-option"
                      role="option"
                      aria-selected={selectedOption}
                      aria-disabled={option.disabled || undefined}
                      aria-posinset={virtual ? virtualStart + renderedIndex + 1 : undefined}
                      aria-setsize={virtual ? filteredOptions.length : undefined}
                      data-active={activeOption || undefined}
                      title={option.title}
                      onPointerMove={() => {
                        if (!option.disabled) setActiveValue(option.value)
                      }}
                      onPointerDown={(event) => event.preventDefault()}
                      onClick={() => chooseValue(option.value)}
                    >
                      <span className="ds-select-option__copy">
                        <span className="ds-select-option__label">{option.label}</span>
                        {option.description ? (
                          <span
                            className={classes(
                              'ds-select-option__description',
                              option.descriptionMonospace && 'ds-control--monospace',
                            )}
                          >
                            {option.description}
                          </span>
                        ) : null}
                      </span>
                      {selectedOption ? <DsIcon name="check" /> : null}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="ds-select-popover__empty">没有匹配的选项</div>
          )}
        </div>
        {hasSearch ? (
          <div className="ds-select-popover__status" aria-live="polite">
            {query ? `找到 ${filteredOptions.length} 项` : `共 ${options.length} 项`}
          </div>
        ) : null}
      </DsFloatingLayer>
    </>
  )
})

export function DsSelectField(props: DsFieldChromeProps & Omit<DsSelectProps, 'id' | 'required'>) {
  const {
    id,
    label,
    layout,
    required,
    help,
    error,
    fieldClassName,
    'aria-describedby': ariaDescribedBy,
    ...controlProps
  } = props
  return (
    <DsField
      id={id}
      label={label}
      layout={layout}
      required={required}
      help={help}
      error={error}
      className={fieldClassName}
    >
      {(field) => (
        <DsSelect
          {...controlProps}
          id={field.id}
          required={required}
          invalid={Boolean(error) || controlProps.invalid}
          aria-describedby={describedBy(ariaDescribedBy, field['aria-describedby'])}
        />
      )}
    </DsField>
  )
}

/**
 * Selects membership or one boolean condition within a form/group.
 * Independent, immediately applied feature enablement belongs to DsSwitch instead.
 */
