import type { ReactNode } from 'react'
import { type DsControlSize, DsTooltip, dsClasses } from './controls.js'
import { DsIcon, type DsIconName } from './icons.js'

export interface DsToolbarCommand {
  id: string
  label: string
  icon: DsIconName
  shortcut?: string
  disabled?: boolean
  disabledReason?: string
  busy?: boolean
  pressed?: boolean
  showLabel?: boolean
  emphasis?: 'primary'
  execute: () => void
}

export function DsToolbar(props: {
  label: string
  groups: readonly (readonly DsToolbarCommand[])[]
  trailing?: ReactNode
  size?: DsControlSize
}) {
  const commandButton = (command: DsToolbarCommand): ReactNode => (
    <DsTooltip
      key={command.id}
      label={command.disabledReason ?? command.label}
      shortcut={command.shortcut}
    >
      <button
        type="button"
        className={dsClasses(
          'ds-toolbar-button',
          props.size === 'compact' && 'ds-toolbar-button--compact',
          command.showLabel && 'ds-button',
          command.emphasis === 'primary' && 'ds-toolbar-button--primary',
        )}
        aria-label={command.label}
        aria-pressed={command.pressed}
        aria-busy={command.busy || undefined}
        disabled={command.disabled || command.busy}
        onClick={command.execute}
      >
        <DsIcon name={command.icon} />
        {command.showLabel ? <span>{command.label}</span> : null}
      </button>
    </DsTooltip>
  )

  return (
    <div
      className={dsClasses('ds-toolbar', props.size === 'compact' && 'ds-toolbar--compact')}
      role="toolbar"
      aria-label={props.label}
    >
      {props.groups.map((group, groupIndex) => (
        <div className="ds-toolbar__group" key={group.map((command) => command.id).join(':')}>
          {groupIndex > 0 ? <span className="ds-toolbar__divider" aria-hidden="true" /> : null}
          {group.map(commandButton)}
        </div>
      ))}
      <span className="ds-spacer" />
      {props.trailing}
    </div>
  )
}
