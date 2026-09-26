import {
  type ButtonHTMLAttributes,
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type Ref,
  useCallback,
  useRef,
  useState,
} from 'react'
import type { DsControlSize } from './control-types.js'
import { classes, describedBy } from './control-utils.js'
import { useDsDraftController } from './draft-input-state.js'
import type { DsDraftTextInputProps } from './draft-text-inputs.js'
import { DsField, type DsFieldChromeProps } from './field-layout.js'
import { type DsFormControlAppearance, DsTextInput } from './text-inputs.js'

export type DsDraftNumberInputProps = Omit<
  DsDraftTextInputProps,
  'type' | 'value' | 'validate' | 'onCommit' | 'onWheel'
> & {
  value: number | undefined
  allowEmpty?: boolean
  enforceRange?: boolean
  integer?: boolean
  normalize?: (value: number) => number
  validate?: (value: number) => string | undefined
  onCommit:
    | ((value: number | undefined) => boolean | undefined)
    | ((value: number | undefined) => void)
}

type DsNumberDirection = -1 | 1

function numericAttribute(
  value: string | number | readonly string[] | undefined,
): number | undefined {
  if (value === undefined || Array.isArray(value)) return undefined
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function decimalPlaces(value: number): number {
  const text = String(value).toLowerCase()
  if (!text.includes('e')) return text.includes('.') ? (text.split('.')[1]?.length ?? 0) : 0
  const [coefficient, exponentText] = text.split('e')
  const exponent = Number(exponentText)
  const fractionLength = coefficient?.split('.')[1]?.length ?? 0
  return Math.max(0, fractionLength - exponent)
}

function steppedDraft(props: {
  draft: string
  direction: DsNumberDirection
  min?: string | number
  max?: string | number
  step?: string | number
  integer: boolean
  normalize(value: number): number
}): string | undefined {
  const empty = !props.draft.trim()
  const current = empty ? undefined : Number(props.draft)
  if (current !== undefined && !Number.isFinite(current)) return undefined
  if (props.step === 'any') return undefined
  const declaredStep = numericAttribute(props.step)
  const step = declaredStep !== undefined && declaredStep > 0 ? declaredStep : 1
  const min = numericAttribute(props.min)
  const max = numericAttribute(props.max)
  let next: number
  if (current === undefined) {
    if (props.direction === -1 && min !== undefined) return undefined
    next = props.direction === 1 ? (min ?? step) : (max ?? -step)
  } else next = current + props.direction * step
  const precision = Math.min(
    12,
    Math.max(current === undefined ? 0 : decimalPlaces(current), decimalPlaces(step)),
  )
  next = Number(next.toFixed(precision))
  if (min !== undefined) next = Math.max(min, next)
  if (max !== undefined) next = Math.min(max, next)
  next = props.normalize(next)
  if (!Number.isFinite(next) || (props.integer && !Number.isInteger(next)) || next === current)
    return undefined
  return String(next)
}

function DsNumberStepper(props: {
  label: string
  size: DsControlSize
  inputRef: React.RefObject<HTMLInputElement | null>
  input: ReactNode
  decrementDisabled: boolean
  incrementDisabled: boolean
  onStep(direction: DsNumberDirection): void
  controlId?: string
}) {
  const pointerDown: ButtonHTMLAttributes<HTMLButtonElement>['onPointerDown'] = (event) => {
    event.preventDefault()
    props.inputRef.current?.focus()
  }
  return (
    <span className="ds-number-stepper" data-ds-number-stepper="" data-size={props.size}>
      <button
        type="button"
        className="ds-number-stepper__button"
        aria-label={`减少${props.label}`}
        aria-controls={props.controlId}
        disabled={props.decrementDisabled}
        onPointerDown={pointerDown}
        onClick={() => props.onStep(-1)}
      >
        <span aria-hidden="true">−</span>
      </button>
      <span className="ds-number-stepper__input">{props.input}</span>
      <button
        type="button"
        className="ds-number-stepper__button"
        aria-label={`增加${props.label}`}
        aria-controls={props.controlId}
        disabled={props.incrementDisabled}
        onPointerDown={pointerDown}
        onClick={() => props.onStep(1)}
      >
        <span aria-hidden="true">+</span>
      </button>
    </span>
  )
}

function assignRef<T>(ref: Ref<T> | undefined, value: T | null): void {
  if (typeof ref === 'function') ref(value)
  else if (ref) (ref as { current: T | null }).current = value
}

function temporarilyProtectFocusedNumberInput(
  input: HTMLInputElement,
  disabled: boolean,
  readOnly: boolean,
  generationRef: { current: number },
  currentReadOnly: () => boolean,
): void {
  if (disabled || readOnly || document.activeElement !== input) return
  const generation = generationRef.current + 1
  generationRef.current = generation
  input.readOnly = true
  const restore = () => {
    if (input.isConnected && generationRef.current === generation)
      input.readOnly = currentReadOnly()
  }
  setTimeout(restore, 0)
}

type DsDraftNumberControlProps = DsDraftNumberInputProps & { stepperLabel?: string }

/** Number adapter for the shared draft boundary; empty/non-finite/out-of-range drafts never commit. */
function DsDraftNumberControl(props: DsDraftNumberControlProps) {
  const {
    draftKey,
    syncToken,
    value,
    allowEmpty = false,
    enforceRange = true,
    integer = false,
    min,
    max,
    validate,
    normalize = (candidate) => candidate,
    onCommit,
    onCancel,
    monospace = true,
    inputMode,
    inputRef,
    invalid,
    title,
    disabled = false,
    readOnly = false,
    size = 'default',
    stepperLabel,
    ...controlProps
  } = props
  const parse = (draft: string): number | undefined => {
    if (!draft.trim()) return undefined
    const parsed = Number(draft)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  const controller = useDsDraftController({
    draftKey,
    syncToken,
    value: value === undefined ? '' : String(value),
    validate: (draft) => {
      const parsed = parse(draft)
      if (allowEmpty && parsed === undefined && !draft.trim()) return undefined
      if (parsed === undefined) return '请输入有效数字。'
      const normalized = normalize(parsed)
      if (!Number.isFinite(normalized)) return '请输入有效数字。'
      if (integer && !Number.isInteger(normalized)) return '请输入整数。'
      if (enforceRange && min !== undefined && normalized < Number(min)) return `不能小于 ${min}。`
      if (enforceRange && max !== undefined && normalized > Number(max)) return `不能大于 ${max}。`
      return validate?.(normalized)
    },
    onCommit: (draft) => {
      const parsed = parse(draft)
      if (parsed !== undefined) {
        const normalized = normalize(parsed)
        return normalized === value ? false : onCommit(normalized)
      }
      if (allowEmpty && !draft.trim()) return value === undefined ? false : onCommit(undefined)
      return false
    },
    onCancel,
  })
  const localRef = useRef<HTMLInputElement>(null)
  const wheelGenerationRef = useRef(0)
  const readOnlyRef = useRef(readOnly)
  readOnlyRef.current = readOnly
  const setInputRef = useCallback(
    (node: HTMLInputElement | null) => {
      localRef.current = node
      assignRef(inputRef, node)
    },
    [inputRef],
  )
  const nextDraft = (direction: DsNumberDirection) => {
    const current = controller.value.trim() ? Number(controller.value) : undefined
    const minimum = numericAttribute(min)
    if (
      allowEmpty &&
      direction === -1 &&
      current !== undefined &&
      Number.isFinite(current) &&
      minimum !== undefined &&
      current <= minimum
    )
      return ''
    return steppedDraft({
      draft: controller.value,
      direction,
      min,
      max,
      step: controlProps.step,
      integer,
      normalize,
    })
  }
  const input = (
    <DsTextInput
      {...controlProps}
      ref={setInputRef}
      type="number"
      inputMode={inputMode ?? (integer ? 'numeric' : 'decimal')}
      min={min}
      max={max}
      disabled={disabled}
      readOnly={readOnly}
      size={size}
      monospace={monospace}
      value={controller.value}
      invalid={invalid || Boolean(controller.error)}
      title={controller.error ?? title}
      data-ds-draft-commit="number"
      onChange={(event) => controller.change(event.target.value)}
      onBlur={controller.blur}
      onKeyDown={controller.keyDown}
      onCompositionStart={controller.compositionStart}
      onCompositionEnd={(event) => controller.compositionEnd(event.currentTarget.value)}
      onWheel={(event) => {
        temporarilyProtectFocusedNumberInput(
          event.currentTarget,
          disabled,
          readOnly,
          wheelGenerationRef,
          () => readOnlyRef.current,
        )
      }}
    />
  )
  if (!stepperLabel) return input
  const decrementDraft = nextDraft(-1)
  const incrementDraft = nextDraft(1)
  return (
    <DsNumberStepper
      label={stepperLabel}
      size={size}
      inputRef={localRef}
      input={input}
      decrementDisabled={disabled || readOnly || decrementDraft === undefined}
      incrementDisabled={disabled || readOnly || incrementDraft === undefined}
      onStep={(direction) => {
        const next = direction === -1 ? decrementDraft : incrementDraft
        if (next !== undefined) controller.replaceAndCommit(next)
      }}
      controlId={controlProps.id}
    />
  )
}

export function DsDraftNumberInput(props: DsDraftNumberInputProps) {
  return <DsDraftNumberControl {...props} />
}

export type DsNumberInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'type' | 'style' | 'size' | 'onWheel'
> &
  DsFormControlAppearance & { integer?: boolean }

type DsNumberControlProps = DsNumberInputProps & { stepperLabel?: string }

const DsNumberControl = forwardRef<HTMLInputElement, DsNumberControlProps>(
  function DsNumberControl(props, ref) {
    const {
      integer = false,
      inputMode,
      monospace = true,
      disabled = false,
      readOnly = false,
      size = 'default',
      stepperLabel,
      min,
      max,
      step,
      value,
      defaultValue,
      ...controlProps
    } = props
    const localRef = useRef<HTMLInputElement>(null)
    const [, setStepperRevision] = useState(0)
    const wheelGenerationRef = useRef(0)
    const readOnlyRef = useRef(readOnly)
    readOnlyRef.current = readOnly
    const setInputRef = useCallback(
      (node: HTMLInputElement | null) => {
        localRef.current = node
        assignRef(ref, node)
      },
      [ref],
    )
    const currentValue = String(value ?? localRef.current?.value ?? defaultValue ?? '')
    const canStep = (direction: DsNumberDirection) => {
      if (disabled || readOnly) return false
      return (
        steppedDraft({
          draft: currentValue,
          direction,
          min,
          max,
          step,
          integer,
          normalize: (candidate) => candidate,
        }) !== undefined
      )
    }
    const input = (
      <DsTextInput
        {...controlProps}
        ref={setInputRef}
        type="number"
        inputMode={inputMode ?? (integer ? 'numeric' : 'decimal')}
        monospace={monospace}
        disabled={disabled}
        readOnly={readOnly}
        size={size}
        min={min}
        max={max}
        step={step}
        value={value}
        defaultValue={defaultValue}
        onWheel={(event) => {
          temporarilyProtectFocusedNumberInput(
            event.currentTarget,
            disabled,
            readOnly,
            wheelGenerationRef,
            () => readOnlyRef.current,
          )
        }}
      />
    )
    if (!stepperLabel) return input
    return (
      <DsNumberStepper
        label={stepperLabel}
        size={size}
        inputRef={localRef}
        input={input}
        decrementDisabled={!canStep(-1)}
        incrementDisabled={!canStep(1)}
        onStep={(direction) => {
          const node = localRef.current
          if (!node) return
          const before = node.value
          if (direction === -1) node.stepDown()
          else node.stepUp()
          if (node.value === before) return
          node.dispatchEvent(new Event('input', { bubbles: true }))
          node.dispatchEvent(new Event('change', { bubbles: true }))
          setStepperRevision((revision) => revision + 1)
        }}
        controlId={controlProps.id}
      />
    )
  },
)

export const DsNumberInput = forwardRef<HTMLInputElement, DsNumberInputProps>(
  function DsNumberInput(props, ref) {
    return <DsNumberControl {...props} ref={ref} />
  },
)

export function DsNumberField(
  props: DsFieldChromeProps &
    Omit<DsNumberInputProps, 'className'> & { inputRef?: Ref<HTMLInputElement> },
) {
  const {
    id,
    label,
    layout,
    required,
    help,
    error,
    fieldClassName,
    inputRef,
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
      className={classes('ds-number-field', fieldClassName)}
    >
      {(field) => (
        <DsNumberControl
          {...controlProps}
          ref={inputRef}
          stepperLabel={controlProps['aria-label'] ?? label}
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
      className={classes('ds-number-field', fieldClassName)}
    >
      {(field) => (
        <DsDraftNumberControl
          {...controlProps}
          stepperLabel={controlProps['aria-label'] ?? label}
          id={field.id}
          required={required}
          invalid={Boolean(error) || controlProps.invalid}
          aria-describedby={describedBy(ariaDescribedBy, field['aria-describedby'])}
        />
      )}
    </DsField>
  )
}
