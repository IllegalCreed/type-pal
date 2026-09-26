import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { describedBy } from './control-utils.js'
import {
  DsDraftTextArea,
  DsDraftTextInput,
  type DsDraftTextAreaProps,
  type DsDraftTextInputProps,
} from './draft-text-inputs.js'
import { DsField, type DsFieldChromeProps } from './field-layout.js'
import { DsTextArea, DsTextInput, type DsFormControlAppearance } from './text-inputs.js'

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

