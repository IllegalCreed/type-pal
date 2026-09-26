import {
  type MouseEventHandler,
  type ReactNode,
  type Ref,
  useRef,
  useState,
} from 'react'
import { DsFloatingLayer } from './floating-layer.js'
import { DsHelpTip } from './help-tips.js'
import { DsIconButton } from './icon-button.js'
import type { DsIconName } from './icons.js'

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
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowTriggerRef = useRef<HTMLButtonElement>(null)
  const overflowLayerRef = useRef<HTMLDivElement>(null)
  const focusFirstOverflowAction = (): void => {
    requestAnimationFrame(() => {
      overflowLayerRef.current
        ?.querySelector<HTMLButtonElement>('[role="menuitem"]:not(:disabled)')
        ?.focus()
    })
  }
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
            <>
              <DsIconButton
                ref={overflowTriggerRef}
                className="ds-list-header__action ds-list-header__menu-trigger"
                size="compact"
                variant="secondary"
                label="更多操作"
                icon="more"
                aria-haspopup="menu"
                aria-expanded={overflowOpen}
                onClick={() => {
                  setOverflowOpen((open) => {
                    const next = !open
                    if (next) focusFirstOverflowAction()
                    return next
                  })
                }}
                onKeyDown={(event) => {
                  if (!['ArrowDown', 'Enter', ' '].includes(event.key)) return
                  event.preventDefault()
                  setOverflowOpen(true)
                  focusFirstOverflowAction()
                }}
              />
              <DsFloatingLayer
                open={overflowOpen}
                anchorRef={overflowTriggerRef}
                layerRef={overflowLayerRef}
                className="ds-list-header__menu-layer"
                width="content"
                align="end"
                gap={8}
                maxHeight={360}
                onDismiss={() => {
                  setOverflowOpen(false)
                  overflowTriggerRef.current?.focus()
                }}
              >
                <div
                  className="ds-list-header__menu-popup"
                  role="menu"
                  aria-label="更多操作"
                  onKeyDown={(event) => {
                    const items = [
                      ...(overflowLayerRef.current?.querySelectorAll<HTMLButtonElement>(
                        '[role="menuitem"]:not(:disabled)',
                      ) ?? []),
                    ]
                    const current = items.indexOf(document.activeElement as HTMLButtonElement)
                    if (event.key === 'Escape') {
                      setOverflowOpen(false)
                      overflowTriggerRef.current?.focus()
                    } else if (event.key === 'ArrowDown') {
                      items[(current + 1 + items.length) % items.length]?.focus()
                    } else if (event.key === 'ArrowUp') {
                      items[(current - 1 + items.length) % items.length]?.focus()
                    } else if (event.key === 'Home') items[0]?.focus()
                    else if (event.key === 'End') items[items.length - 1]?.focus()
                    else return
                    event.preventDefault()
                  }}
                >
                  {overflowActions.map((action) => (
                    <button
                      key={action.id}
                      type="button"
                      role="menuitem"
                      className={action.danger ? 'danger' : undefined}
                      disabled={action.disabled}
                      title={action.title}
                      onClick={(event) => {
                        setOverflowOpen(false)
                        action.onClick(event)
                      }}
                    >
                      {action.label}
                    </button>
                  ))}
                </div>
              </DsFloatingLayer>
            </>
          ) : null}
        </span>
      ) : null}
    </header>
  )
}

