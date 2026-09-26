import { type ReactNode, useId } from 'react'
import { classes } from './control-utils.js'
import { DsHelpTip } from './help-tips.js'

/**
 * 主工作区相关字段的共享标签轨。字段自身继续持有 label/help/error 与输入事务语义；
 * 本组只负责统一轨道和基于自身容器宽度的 responsive / stacked 布局。
 */
export function DsFieldGroup(props: {
  children: ReactNode
  className?: string
  layout?: 'responsive' | 'stacked'
  labelTrack?: 'default' | 'wide'
}) {
  return (
    <div
      className={classes('ds-field-group', props.className)}
      data-ds-field-group=""
      data-layout={props.layout ?? 'responsive'}
      data-label-track={props.labelTrack ?? 'default'}
    >
      {props.children}
    </div>
  )
}

export type DsFieldHelp = string | { label: string; content: ReactNode }

export function DsField(props: {
  id?: string
  label: string
  layout?: 'stacked' | 'inline'
  required?: boolean
  help?: DsFieldHelp
  error?: string
  children: ReactNode | ((control: DsFieldControlProps) => ReactNode)
  className?: string
}) {
  const generatedId = useId()
  const id = props.id ?? generatedId
  const inlineHelp = typeof props.help === 'string' ? props.help : undefined
  const helpTip = typeof props.help === 'object' ? props.help : undefined
  const descriptionId = props.error || inlineHelp ? `${id}-description` : undefined
  const label = (
    <label className="ds-field__label" htmlFor={id}>
      {props.label}
      {props.required ? (
        <span className="ds-field__required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  )
  return (
    <div
      className={classes(
        'ds-field',
        props.layout === 'inline' && 'ds-field--inline',
        props.className,
      )}
      data-field-id={id}
      data-support={Boolean(props.error || inlineHelp) || undefined}
    >
      {helpTip ? (
        <span className="ds-field__label-group">
          {label}
          <DsHelpTip label={helpTip.label}>{helpTip.content}</DsHelpTip>
        </span>
      ) : (
        label
      )}
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
      ) : inlineHelp ? (
        <div id={descriptionId} className="ds-field__help">
          {inlineHelp}
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

export type DsFieldChromeProps = {
  id?: string
  label: string
  layout?: 'stacked' | 'inline'
  required?: boolean
  help?: DsFieldHelp
  error?: string
  fieldClassName?: string
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
