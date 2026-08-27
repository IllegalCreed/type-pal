import {
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  cloneElement,
  forwardRef,
  type HTMLAttributes,
  type InputHTMLAttributes,
  isValidElement,
  type MouseEventHandler,
  type KeyboardEvent as ReactKeyboardEvent,
  type ReactNode,
  type Ref,
  type TextareaHTMLAttributes,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  DS_OPTION_VIRTUALIZE_ABOVE,
  filterDsCollection,
} from './collection-search.js'
import { DsFloatingLayer } from './floating-layer.js'
import { DsIcon, type DsIconName } from './icons.js'

function classes(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ')
}

export type DsButtonVariant = 'primary' | 'secondary' | 'quiet' | 'danger'
export type DsControlSize = 'default' | 'compact'
export type DsTagTone = 'accent' | 'neutral' | 'warning' | 'danger'

/**
 * Unskinned semantic button for rich domain surfaces such as tiles, frames and tree rows.
 * Standard text/icon actions must use DsButton or DsIconButton instead.
 */
export const DsPressable = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement>>(
  function DsPressable({ type = 'button', className, ...props }, ref) {
    return (
      <button {...props} ref={ref} type={type} className={classes('ds-pressable', className)} />
    )
  },
)

export const DsButton = forwardRef<
  HTMLButtonElement,
  ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: DsButtonVariant
    size?: DsControlSize
    icon?: DsIconName
    busy?: boolean
  }
>(function DsButton(props, ref) {
  const {
    variant = 'secondary',
    size = 'default',
    icon,
    busy = false,
    className,
    children,
    disabled,
    ...rest
  } = props
  return (
    <button
      ref={ref}
      type="button"
      {...rest}
      className={classes(
        'ds-button',
        `ds-button--${variant}`,
        size === 'compact' && 'ds-button--compact',
        className,
      )}
      disabled={disabled || busy}
      aria-busy={busy || undefined}
    >
      {icon ? <DsIcon name={icon} /> : null}
      <span>{busy ? '处理中…' : children}</span>
    </button>
  )
})

export function DsActionLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: DsButtonVariant
    size?: DsControlSize
    icon?: DsIconName
  },
) {
  const { variant = 'secondary', size = 'default', icon, className, children, ...rest } = props
  return (
    <a
      {...rest}
      className={classes(
        'ds-button',
        `ds-button--${variant}`,
        size === 'compact' && 'ds-button--compact',
        className,
      )}
    >
      {icon ? <DsIcon name={icon} /> : null}
      <span>{children}</span>
    </a>
  )
}

/** Compact semantic status label. Object headers and catalog rows must not invent local badge skins. */
export function DsTag(
  props: HTMLAttributes<HTMLSpanElement> & {
    tone?: DsTagTone
    monospace?: boolean
  },
) {
  const { tone = 'accent', monospace = false, className, children, ...rest } = props
  return (
    <span
      {...rest}
      className={classes('ds-tag', `ds-tag--${tone}`, monospace && 'ds-tag--monospace', className)}
    >
      {children}
    </span>
  )
}

/** Read-only value chrome for property rows; unlike a disabled input, its text stays selectable. */
export function DsReadonlyValue(
  props: HTMLAttributes<HTMLSpanElement> & {
    as?: 'span' | 'div'
    monospace?: boolean
  },
) {
  const { as: Element = 'span', monospace = false, className, ...rest } = props
  return (
    <Element
      {...rest}
      className={classes(
        'ds-readonly-value',
        monospace && 'ds-readonly-value--monospace',
        className,
      )}
    />
  )
}

export function DsTooltip(props: { label: string; shortcut?: string; children: ReactNode }) {
  const tooltipId = useId()
  const anchorRef = useRef<HTMLSpanElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const pointerInitiatedFocus = useRef(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const open = !dismissed && (hovered || focused)
  const description = props.shortcut ? `${props.label} · ${props.shortcut}` : props.label
  const child = isValidElement<{ 'aria-describedby'?: string }>(props.children)
    ? cloneElement(props.children, {
        'aria-describedby': classes(props.children.props['aria-describedby'], tooltipId),
      })
    : props.children

  useEffect(() => {
    if (!open) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setDismissed(true)
    }
    document.addEventListener('keydown', dismissOnEscape)
    return () => document.removeEventListener('keydown', dismissOnEscape)
  }, [open])

  return (
    <>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: wrapper only delegates hover/focus from the wrapped native control; it is not a separate interaction target. */}
      <span
        ref={anchorRef}
        className="ds-tooltip"
        onMouseEnter={() => {
          setDismissed(false)
          setHovered(true)
        }}
        onMouseLeave={() => setHovered(false)}
        onPointerDownCapture={() => {
          pointerInitiatedFocus.current = true
          setDismissed(true)
          setHovered(false)
          setFocused(false)
        }}
        onFocusCapture={() => {
          if (pointerInitiatedFocus.current) return
          setDismissed(false)
          setFocused(true)
        }}
        onBlurCapture={() => {
          pointerInitiatedFocus.current = false
          setFocused(false)
        }}
      >
        {child}
        <span id={tooltipId} role="tooltip" className="ds-visually-hidden">
          {description}
        </span>
      </span>
      <DsFloatingLayer
        open={open}
        anchorRef={anchorRef}
        layerRef={layerRef}
        className="ds-tooltip__bubble"
        width="content"
        align="center"
        maxHeight={280}
        gap={6}
        dismissOnPointerDown={false}
        ariaHidden
        onDismiss={() => setDismissed(true)}
      >
        {description}
      </DsFloatingLayer>
    </>
  )
}

/**
 * Low-frequency conceptual help. Current state, validation, blocking reasons and next actions
 * must remain visible content instead of being hidden behind this control.
 */
export function DsHelpTip(props: { label: string; children: ReactNode }) {
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const [dismissed, setDismissed] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const open = !dismissed && (hovered || focused)

  useEffect(() => {
    if (!open) return
    const dismissOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      event.preventDefault()
      setDismissed(true)
    }
    document.addEventListener('keydown', dismissOnEscape)
    return () => document.removeEventListener('keydown', dismissOnEscape)
  }, [open])

  return (
    <>
      <span className={`ds-help-tip${open ? ' is-open' : ''}`}>
        <button
          ref={buttonRef}
          type="button"
          aria-label={`${props.label}说明`}
          aria-describedby={tooltipId}
          onMouseEnter={() => {
            setHovered(true)
            setDismissed(false)
          }}
          onMouseLeave={() => setHovered(false)}
          onFocus={() => {
            setFocused(true)
            setDismissed(false)
          }}
          onBlur={() => setFocused(false)}
        >
          <span aria-hidden="true">?</span>
        </button>
        <span id={tooltipId} role="tooltip" className="ds-visually-hidden">
          {props.children}
        </span>
      </span>
      <DsFloatingLayer
        open={open}
        anchorRef={buttonRef}
        layerRef={tooltipRef}
        className="ds-help-tooltip is-open"
        width="content"
        align="center"
        maxHeight={360}
        gap={7}
        dismissOnPointerDown={false}
        ariaHidden
        onDismiss={() => setDismissed(true)}
      >
        {props.children}
      </DsFloatingLayer>
    </>
  )
}

export const DsIconButton = forwardRef<
  HTMLButtonElement,
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children' | 'aria-label'> & {
    label: string
    icon: DsIconName
    shortcut?: string
    variant?: Extract<DsButtonVariant, 'secondary' | 'quiet' | 'danger'>
    size?: DsControlSize
  }
>(function DsIconButton(props, ref) {
  const {
    label,
    icon,
    shortcut,
    variant = 'quiet',
    size = 'default',
    className,
    ...buttonProps
  } = props
  return (
    <DsTooltip label={label} shortcut={shortcut}>
      <button
        ref={ref}
        type="button"
        {...buttonProps}
        className={classes(
          'ds-icon-button',
          `ds-icon-button--${variant}`,
          size === 'compact' && 'ds-icon-button--compact',
          className,
        )}
        aria-label={label}
      >
        <DsIcon name={icon} />
      </button>
    </DsTooltip>
  )
})

/** 由领域动作按钮触发的隐藏文件选择器；统一隔离原生 file input。 */
export const DsFileInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DsFileInput(props, ref) {
    return <input {...props} ref={ref} type="file" hidden />
  },
)

/** Visible, keyboard-focusable file picker. Product pages own only the file semantics. */
export const DsFilePicker = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'hidden' | 'className' | 'children'> & {
    label: ReactNode
    description?: ReactNode
    className?: string
  }
>(function DsFilePicker({ label, description, className, disabled, ...inputProps }, ref) {
  return (
    <label className={classes('ds-file-picker', disabled && 'is-disabled', className)}>
      <span className="ds-file-picker__label">{label}</span>
      {description ? <small className="ds-file-picker__description">{description}</small> : null}
      <input {...inputProps} ref={ref} type="file" disabled={disabled} />
    </label>
  )
})

/** 时间轴、缩放等连续数值控件的 canonical range 边界。 */
export const DsRangeInput = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function DsRangeInput({ className, ...props }, ref) {
    return (
      <input {...props} ref={ref} className={classes('ds-range-input', className)} type="range" />
    )
  },
)

/** 浏览器原生取色语义的 canonical 外观；业务页只提供颜色值与离散 change 回调。 */
export const DsColorInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style'>
>(function DsColorInput({ className, ...props }, ref) {
  return (
    <input {...props} ref={ref} className={classes('ds-color-input', className)} type="color" />
  )
})

export function DsField(props: {
  id?: string
  label: string
  layout?: 'stacked' | 'inline'
  required?: boolean
  help?: string
  error?: string
  children: ReactNode | ((control: DsFieldControlProps) => ReactNode)
  className?: string
}) {
  const generatedId = useId()
  const id = props.id ?? generatedId
  const descriptionId = props.error || props.help ? `${id}-description` : undefined
  return (
    <div
      className={classes(
        'ds-field',
        props.layout === 'inline' && 'ds-field--inline',
        props.className,
      )}
      data-field-id={id}
    >
      <label className="ds-field__label" htmlFor={id}>
        {props.label}
        {props.required ? (
          <span className="ds-field__required" aria-hidden="true">
            *
          </span>
        ) : null}
      </label>
      <div data-ds-control-id={id} data-ds-description-id={descriptionId}>
        {typeof props.children === 'function'
          ? props.children({
              id,
              'aria-describedby': descriptionId,
              'aria-invalid': props.error ? true : undefined,
            })
          : props.children}
      </div>
      {props.error ? (
        <div id={descriptionId} className="ds-field__error" role="alert">
          {props.error}
        </div>
      ) : props.help ? (
        <div id={descriptionId} className="ds-field__help">
          {props.help}
        </div>
      ) : null}
    </div>
  )
}

export interface DsFieldControlProps {
  id: string
  'aria-describedby'?: string
  'aria-invalid'?: true
}

type DsFieldChromeProps = {
  id?: string
  label: string
  layout?: 'stacked' | 'inline'
  required?: boolean
  help?: string
  error?: string
  fieldClassName?: string
}

function describedBy(...ids: Array<string | undefined>): string | undefined {
  const value = ids.filter(Boolean).join(' ')
  return value || undefined
}

/** One canonical form shell: a fluid control with optional leading content and trailing actions. */
export function DsControlGroup(props: {
  control: ReactNode
  leading?: ReactNode
  actions?: ReactNode
  className?: string
}) {
  return (
    <span className={classes('ds-control-group', props.className)}>
      {props.leading ? <span className="ds-control-group__leading">{props.leading}</span> : null}
      <span className="ds-control-group__control">{props.control}</span>
      {props.actions ? <span className="ds-control-group__actions">{props.actions}</span> : null}
    </span>
  )
}

type DsFormControlAppearance = {
  invalid?: boolean
  size?: DsControlSize
  monospace?: boolean
}

export const DsTextInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'style' | 'size'> & DsFormControlAppearance
>(function DsTextInput(props, ref) {
  const {
    className,
    invalid,
    size = 'default',
    monospace = false,
    'aria-invalid': ariaInvalid,
    ...rest
  } = props
  return (
    <input
      {...rest}
      ref={ref}
      className={classes(
        'ds-input',
        size === 'compact' && 'ds-input--compact',
        monospace && 'ds-control--monospace',
        className,
      )}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  )
})

type DsDraftInputState = {
  source: string
  value: string
  error?: string
}

type DsDraftInputContract = {
  /** Stable object + field identity. Changing it cancels the previous object's draft. */
  draftKey: string
  /** Optional external transaction version used to resync after undo/redo. */
  syncToken?: string | number
  validate?: (value: string) => string | undefined
  /** Return false when the canonical mutation was rejected so the draft resyncs. */
  onCommit: (value: string) => void | boolean
  onCancel?: () => void
}

type DsDraftTextInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  | 'className'
  | 'style'
  | 'size'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'onKeyDown'
  | 'onCompositionStart'
  | 'onCompositionEnd'
> &
  DsFormControlAppearance &
  DsDraftInputContract & {
    value: string
    inputRef?: Ref<HTMLInputElement>
  }

function draftSource(draftKey: string, syncToken: string | number | undefined, value: string) {
  return `${draftKey}\0${syncToken ?? ''}\0${value}`
}

/**
 * Canonical continuous-text transaction boundary.
 * Input and IME composition stay local; blur/Enter commit once, Escape cancels, and
 * identity/canonical changes discard stale drafts.
 */
export function DsDraftTextInput(props: DsDraftTextInputProps) {
  const {
    draftKey,
    syncToken,
    value: canonicalValue,
    validate,
    onCommit,
    onCancel,
    invalid,
    inputRef,
    title,
    ...controlProps
  } = props
  const controller = useDsDraftController({
    draftKey,
    syncToken,
    value: canonicalValue,
    validate,
    onCommit,
    onCancel,
  })
  return (
    <DsTextInput
      {...controlProps}
      ref={inputRef}
      value={controller.value}
      invalid={invalid || Boolean(controller.error)}
      title={controller.error ?? title}
      data-ds-draft-commit={controlProps.type === 'number' ? 'number' : 'text'}
      onChange={(event) => controller.change(event.target.value)}
      onBlur={controller.blur}
      onKeyDown={controller.keyDown}
      onCompositionStart={controller.compositionStart}
      onCompositionEnd={(event) => controller.compositionEnd(event.currentTarget.value)}
    />
  )
}

function useDsDraftController(props: DsDraftInputContract & { value: string }): {
  value: string
  error?: string
  change(value: string): void
  blur(): void
  keyDown(event: ReactKeyboardEvent<HTMLInputElement | HTMLTextAreaElement>): void
  compositionStart(): void
  compositionEnd(value: string): void
} {
  const { draftKey, syncToken, value: canonicalValue, validate, onCommit, onCancel } = props
  const source = draftSource(draftKey, syncToken, canonicalValue)
  const [draft, setDraft] = useState<DsDraftInputState>({ source, value: canonicalValue })
  const current = draft.source === source ? draft : { source, value: canonicalValue }
  const currentRef = useRef<DsDraftInputState>(current)
  const composingRef = useRef(false)
  const blurredWhileComposingRef = useRef(false)
  const committedRef = useRef<string | undefined>(undefined)

  // Keep event handlers on the current object even before the synchronization effect runs.
  currentRef.current = current

  useEffect(() => {
    if (draft.source !== source) setDraft({ source, value: canonicalValue })
  }, [canonicalValue, draft.source, source])

  const commit = useCallback((): boolean => {
    const next = currentRef.current
    if (next.source !== source) return true
    const signature = `${source}\0${next.value}`
    if (committedRef.current === signature) return true
    const error = validate?.(next.value)
    if (error) {
      const invalidDraft = { ...next, error }
      currentRef.current = invalidDraft
      setDraft(invalidDraft)
      return false
    }
    const accepted = next.value === canonicalValue ? true : onCommit(next.value)
    if (accepted === false) {
      committedRef.current = undefined
      const cleanDraft = { source, value: canonicalValue }
      currentRef.current = cleanDraft
      setDraft(cleanDraft)
      return false
    }
    committedRef.current = signature
    const cleanDraft = { source, value: next.value }
    currentRef.current = cleanDraft
    setDraft(cleanDraft)
    return true
  }, [canonicalValue, onCommit, source, validate])

  return {
    value: current.value,
    error: current.error,
    change: (value) => {
      const next = { source, value }
      committedRef.current = undefined
      currentRef.current = next
      setDraft(next)
    },
    blur: () => {
      if (composingRef.current) {
        blurredWhileComposingRef.current = true
        return
      }
      commit()
    },
    keyDown: (event) => {
      if (
        (event.key === 'Enter' || event.key === 'Escape') &&
        (composingRef.current || event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229)
      )
        return
      if (event.key === 'Enter') {
        event.preventDefault()
        if (commit()) event.currentTarget.blur()
        return
      }
      if (event.key !== 'Escape') return
      event.preventDefault()
      blurredWhileComposingRef.current = false
      committedRef.current = undefined
      const cleanDraft = { source, value: canonicalValue }
      currentRef.current = cleanDraft
      setDraft(cleanDraft)
      onCancel?.()
      event.currentTarget.blur()
    },
    compositionStart: () => {
      composingRef.current = true
    },
    compositionEnd: (value) => {
      composingRef.current = false
      const next = { source, value }
      currentRef.current = next
      setDraft(next)
      if (blurredWhileComposingRef.current) {
        blurredWhileComposingRef.current = false
        queueMicrotask(commit)
      }
    },
  }
}

type DsDraftNumberInputProps = Omit<
  DsDraftTextInputProps,
  'type' | 'inputMode' | 'value' | 'validate' | 'onCommit'
> & {
  value: number | undefined
  allowEmpty?: boolean
  enforceRange?: boolean
  integer?: boolean
  normalize?: (value: number) => number
  validate?: (value: number) => string | undefined
  onCommit: (value: number | undefined) => void | boolean
}

/** Number adapter for the shared draft boundary; empty/non-finite/out-of-range drafts never commit. */
export function DsDraftNumberInput(props: DsDraftNumberInputProps) {
  const {
    value,
    allowEmpty = false,
    enforceRange = true,
    integer = false,
    min,
    max,
    validate,
    normalize = (candidate) => candidate,
    onCommit,
    monospace = true,
    ...controlProps
  } = props
  const parse = (draft: string): number | undefined => {
    if (!draft.trim()) return undefined
    const parsed = Number(draft)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return (
    <DsDraftTextInput
      {...controlProps}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      monospace={monospace}
      value={value === undefined ? '' : String(value)}
      validate={(draft) => {
        const parsed = parse(draft)
        if (allowEmpty && parsed === undefined && !draft.trim()) return undefined
        if (parsed === undefined) return '请输入有效数字。'
        const normalized = normalize(parsed)
        if (!Number.isFinite(normalized)) return '请输入有效数字。'
        if (integer && !Number.isInteger(normalized)) return '请输入整数。'
        if (enforceRange && min !== undefined && normalized < Number(min))
          return `不能小于 ${min}。`
        if (enforceRange && max !== undefined && normalized > Number(max))
          return `不能大于 ${max}。`
        return validate?.(normalized)
      }}
      onCommit={(draft) => {
        const parsed = parse(draft)
        if (parsed !== undefined) {
          const normalized = normalize(parsed)
          return normalized === value ? false : onCommit(normalized)
        }
        if (allowEmpty && !draft.trim()) return value === undefined ? false : onCommit(undefined)
        return false
      }}
    />
  )
}

type DsDraftTextAreaProps = Omit<
  TextareaHTMLAttributes<HTMLTextAreaElement>,
  | 'className'
  | 'style'
  | 'value'
  | 'defaultValue'
  | 'onChange'
  | 'onBlur'
  | 'onKeyDown'
  | 'onCompositionStart'
  | 'onCompositionEnd'
> &
  DsFormControlAppearance &
  DsDraftInputContract & {
    value: string
  }

/** Multiline adapter for the same draft transaction boundary; Enter remains a newline. */
export function DsDraftTextArea(props: DsDraftTextAreaProps) {
  const {
    draftKey,
    syncToken,
    value,
    validate,
    onCommit,
    onCancel,
    invalid,
    title,
    ...controlProps
  } = props
  const controller = useDsDraftController({
    draftKey,
    syncToken,
    value,
    validate,
    onCommit,
    onCancel,
  })
  return (
    <DsTextArea
      {...controlProps}
      value={controller.value}
      invalid={invalid || Boolean(controller.error)}
      title={controller.error ?? title}
      data-ds-draft-commit="textarea"
      onChange={(event) => controller.change(event.target.value)}
      onBlur={controller.blur}
      onKeyDown={(event) => {
        if (event.key === 'Enter' && !event.metaKey && !event.ctrlKey) return
        controller.keyDown(event)
      }}
      onCompositionStart={controller.compositionStart}
      onCompositionEnd={(event) => controller.compositionEnd(event.currentTarget.value)}
    />
  )
}

export function DsTextField(
  props: DsFieldChromeProps &
    Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'style' | 'size'> &
    DsFormControlAppearance,
) {
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
        <DsTextInput
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

export function DsDraftTextField(props: DsFieldChromeProps & DsDraftTextInputProps) {
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
        <DsDraftTextInput
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

export const DsNumberInput = forwardRef<
  HTMLInputElement,
  Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style' | 'size'> & DsFormControlAppearance
>(function DsNumberInput(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'style' | 'size'> &
    DsFormControlAppearance,
  ref,
) {
  return (
    <DsTextInput
      {...props}
      ref={ref}
      type="number"
      inputMode="decimal"
      monospace={props.monospace ?? true}
    />
  )
})

export function DsNumberField(
  props: DsFieldChromeProps &
    Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style' | 'size'> &
    DsFormControlAppearance,
) {
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
        <DsNumberInput
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

export function DsDraftNumberField(props: DsFieldChromeProps & DsDraftNumberInputProps) {
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
        <DsDraftNumberInput
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

export const DsTextArea = forwardRef<
  HTMLTextAreaElement,
  Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & DsFormControlAppearance
>(function DsTextArea(
  props: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'style'> & DsFormControlAppearance,
  ref,
) {
  const {
    className,
    invalid,
    size = 'default',
    monospace = false,
    'aria-invalid': ariaInvalid,
    ...rest
  } = props
  return (
    <textarea
      {...rest}
      ref={ref}
      className={classes(
        'ds-textarea',
        size === 'compact' && 'ds-textarea--compact',
        monospace && 'ds-control--monospace',
        className,
      )}
      aria-invalid={invalid || ariaInvalid || undefined}
    />
  )
})

export function DsTextAreaField(
  props: DsFieldChromeProps &
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'className' | 'style'> &
    DsFormControlAppearance,
) {
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
        <DsTextArea
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

export function DsDraftTextAreaField(props: DsFieldChromeProps & DsDraftTextAreaProps) {
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
        <DsDraftTextArea
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

  return (
    <>
      <button
        {...buttonProps}
        ref={setTriggerNode}
        id={controlId}
        type="button"
        role={hasSearch && open ? undefined : 'combobox'}
        className={classes(
          'ds-select',
          size === 'compact' && 'ds-select--compact',
          monospace && 'ds-control--monospace',
        )}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-activedescendant={!hasSearch && open ? activeOptionId : undefined}
        aria-invalid={invalid || undefined}
        aria-required={required || undefined}
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
                const nextOptions = filterDsCollection(
                  indexedOptions,
                  nextQuery,
                  ({ option }) => [option.label, option.value, option.description],
                )
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

export function DsCheckbox(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style' | 'size'> & {
    label: ReactNode
    indeterminate?: boolean
    size?: DsControlSize
    className?: string
  },
) {
  const { label, indeterminate = false, size = 'default', className, ...inputProps } = props
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate
  }, [indeterminate])
  return (
    <label
      className={classes(
        'ds-check-label',
        size === 'compact' && 'ds-check-label--compact',
        className,
      )}
    >
      <input
        {...inputProps}
        ref={ref}
        type="checkbox"
        className="ds-check-control"
        aria-checked={indeterminate ? 'mixed' : inputProps.checked}
      />
      <span>{label}</span>
    </label>
  )
}

export function DsRadioGroup(props: {
  name: string
  label: string
  options: readonly DsOption[]
  value?: string
  disabled?: boolean
  onChange?: (value: string) => void
}) {
  return (
    <fieldset className="ds-radio-group">
      <legend className="ds-field__label">{props.label}</legend>
      {props.options.map((option) => (
        <label className="ds-radio-label" key={option.value}>
          <input
            className="ds-radio-control"
            type="radio"
            name={props.name}
            value={option.value}
            checked={props.value === option.value}
            disabled={props.disabled || option.disabled}
            onChange={() => props.onChange?.(option.value)}
          />
          <span>{option.label}</span>
        </label>
      ))}
    </fieldset>
  )
}

export function DsSwitch(
  props: Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'className' | 'style'> & {
    label: ReactNode
  },
) {
  const { label, ...inputProps } = props
  return (
    <label className="ds-switch-label">
      <input
        {...inputProps}
        type="checkbox"
        role="switch"
        aria-checked={inputProps.checked ?? inputProps.defaultChecked ?? false}
      />
      <span className="ds-switch-control" aria-hidden="true" />
      <span>{label}</span>
    </label>
  )
}

export function DsCard(props: {
  title?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={classes('ds-card', props.className)}>
      {props.title || props.actions ? (
        <header className="ds-card__header">
          {props.title ? <h2 className="ds-card__title">{props.title}</h2> : null}
          <span className="ds-spacer" />
          {props.actions}
        </header>
      ) : null}
      {props.children}
    </section>
  )
}

export interface DsListHeaderAction {
  id: string
  label: string
  icon: DsIconName
  onClick: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  buttonRef?: Ref<HTMLButtonElement>
}

export interface DsListHeaderMenuItem {
  id: string
  label: string
  title?: string
  onClick: MouseEventHandler<HTMLButtonElement>
  disabled?: boolean
  danger?: boolean
}

export function DsListHeader(props: {
  title: string
  count: number
  unit: string
  help?: { label: string; content: ReactNode }
  actions?: readonly DsListHeaderAction[]
  overflowActions?: readonly DsListHeaderMenuItem[]
}) {
  const actions = props.actions ?? []
  const overflowActions = props.overflowActions ?? []
  return (
    <header className="ds-list-header">
      <h2 className="ds-list-header__title">{props.title}</h2>
      {props.help ? <DsHelpTip label={props.help.label}>{props.help.content}</DsHelpTip> : null}
      <span className="ds-list-header__count">
        {props.count} {props.unit}
      </span>
      <span className="ds-spacer" />
      {actions.length > 0 || overflowActions.length > 0 ? (
        <span className="ds-list-header__actions">
          {actions.map((action) => (
            <DsIconButton
              key={action.id}
              ref={action.buttonRef}
              className="ds-list-header__action"
              size="compact"
              variant="secondary"
              label={action.label}
              icon={action.icon}
              disabled={action.disabled}
              onClick={action.onClick}
            />
          ))}
          {overflowActions.length > 0 ? (
            <details className="ds-list-header__menu">
              <summary className="ds-list-header__action" aria-label="更多操作" title="更多操作">
                <DsIcon name="more" />
              </summary>
              <div className="ds-list-header__menu-popup">
                {overflowActions.map((action) => (
                  <button
                    key={action.id}
                    type="button"
                    className={action.danger ? 'danger' : undefined}
                    disabled={action.disabled}
                    title={action.title}
                    onClick={(event) => {
                      event.currentTarget.closest('details')?.removeAttribute('open')
                      action.onClick(event)
                    }}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </details>
          ) : null}
        </span>
      ) : null}
    </header>
  )
}

export interface DsTabItem {
  id: string
  label: string
  /** Optional numeric metadata rendered as a visually separate shared badge. */
  count?: number
  disabled?: boolean
}

export function DsTabs(props: {
  label: string
  items: readonly DsTabItem[]
  activeId: string
  onChange: (id: string) => void
  size?: DsControlSize
  variant?: 'line' | 'inspector'
  idPrefix?: string
}) {
  const refs = useRef(new Map<string, HTMLButtonElement>())
  function move(currentId: string, direction: -1 | 1 | 'first' | 'last'): void {
    const enabled = props.items.filter((item) => !item.disabled)
    if (enabled.length === 0) return
    const currentIndex = enabled.findIndex((item) => item.id === currentId)
    const target =
      direction === 'first'
        ? enabled[0]
        : direction === 'last'
          ? enabled[enabled.length - 1]
          : enabled[(currentIndex + direction + enabled.length) % enabled.length]
    if (!target) return
    props.onChange(target.id)
    refs.current.get(target.id)?.focus()
  }
  return (
    <div
      className={classes(
        'ds-tabs',
        props.size === 'compact' && 'ds-tabs--compact',
        props.variant === 'inspector' && 'ds-tabs--inspector',
      )}
      role="tablist"
      aria-label={props.label}
    >
      {props.items.map((item) => {
        const tabId = props.idPrefix ? `${props.idPrefix}-tab-${item.id}` : undefined
        const panelId = props.idPrefix ? `${props.idPrefix}-panel-${item.id}` : undefined
        return (
          <button
            key={item.id}
            ref={(node) => {
              if (node) refs.current.set(item.id, node)
              else refs.current.delete(item.id)
            }}
            id={tabId}
            type="button"
            role="tab"
            className={classes(
              'ds-tab',
              props.size === 'compact' && 'ds-tab--compact',
              props.variant === 'inspector' && 'ds-tab--inspector',
            )}
            aria-selected={item.id === props.activeId}
            aria-controls={panelId}
            tabIndex={item.id === props.activeId ? 0 : -1}
            disabled={item.disabled}
            onClick={() => props.onChange(item.id)}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') move(item.id, -1)
              else if (event.key === 'ArrowRight') move(item.id, 1)
              else if (event.key === 'Home') move(item.id, 'first')
              else if (event.key === 'End') move(item.id, 'last')
              else return
              event.preventDefault()
            }}
          >
            <span className="ds-tab__label">{item.label}</span>
            {typeof item.count === 'number' ? (
              <>
                {' '}
                <span className="ds-tab__count">{item.count}</span>
              </>
            ) : null}
          </button>
        )
      })}
    </div>
  )
}

export function DsStatus(props: {
  tone?: 'neutral' | 'success' | 'warning' | 'error'
  children: ReactNode
  action?: ReactNode
}) {
  const tone = props.tone ?? 'neutral'
  return (
    <div
      className={classes('ds-status', tone !== 'neutral' && `ds-status--${tone}`)}
      role={tone === 'error' ? 'alert' : 'status'}
    >
      <span>{props.children}</span>
      {props.action}
    </div>
  )
}

export function DsEmptyState(props: {
  title: string
  description: string
  action?: ReactNode
  layout?: 'card' | 'embedded'
}) {
  const layout = props.layout ?? 'card'
  return (
    <section
      className={classes('ds-empty-state', layout === 'embedded' && 'ds-empty-state--embedded')}
      data-layout={layout}
    >
      {layout === 'embedded' ? (
        <h4 className="ds-card__title ds-empty-state__title">{props.title}</h4>
      ) : (
        <h2 className="ds-card__title ds-empty-state__title">{props.title}</h2>
      )}
      <p>{props.description}</p>
      {props.action}
    </section>
  )
}

export { classes as dsClasses }
