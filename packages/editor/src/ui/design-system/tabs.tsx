import { useEffect, useRef } from 'react'
import type { DsControlSize } from './control-types.js'
import { classes } from './control-utils.js'
import { DsIconButton } from './icon-button.js'

export interface DsTabItem {
  id: string
  label: string
  /** Optional numeric metadata rendered as a visually separate shared badge. */
  count?: number
  disabled?: boolean
  /** Optional sibling action; removing a tab never selects it. The caller owns deletion. */
  remove?: { label: string; onRemove: () => void; disabled?: boolean }
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
  const pendingRemovalFocus = useRef<string | undefined>(undefined)
  useEffect(() => {
    const removedId = pendingRemovalFocus.current
    if (!removedId || props.items.some((item) => item.id === removedId)) return
    pendingRemovalFocus.current = undefined
    const target =
      props.items.find((item) => item.id === props.activeId && !item.disabled) ??
      props.items.find((item) => !item.disabled)
    if (target) refs.current.get(target.id)?.focus()
  }, [props.items, props.activeId])
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
        const tab = (
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
        if (!item.remove) return tab
        const remove = item.remove
        return (
          <div
            key={item.id}
            className="ds-tab-with-action"
            data-selected={item.id === props.activeId}
            role="presentation"
          >
            {tab}
            <DsIconButton
              icon="delete"
              variant="danger"
              label={remove.label}
              size="compact"
              disabled={item.disabled || remove.disabled}
              onClick={(event) => {
                if (
                  event.currentTarget === document.activeElement ||
                  refs.current.get(item.id) === document.activeElement
                )
                  pendingRemovalFocus.current = item.id
                remove.onRemove()
              }}
            />
          </div>
        )
      })}
    </div>
  )
}
