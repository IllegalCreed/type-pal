import type { InputHTMLAttributes, Ref, TextareaHTMLAttributes } from 'react'
import { type DsDraftInputContract, useDsDraftController } from './draft-input-state.js'
import { type DsFormControlAppearance, DsTextArea, DsTextInput } from './text-inputs.js'

export type DsDraftTextInputProps = Omit<
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

export type DsDraftTextAreaProps = Omit<
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
