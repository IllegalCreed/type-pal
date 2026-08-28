import { type KeyboardEvent, type ReactNode, useEffect, useRef, useState } from 'react'
import { DsIcon, type DsIconName } from './icons.js'
import { type DsControlSize, DsTooltip, dsClasses } from './controls.js'

export interface DsMenuItem {
  id: string
  label: string
  section?: string
  href?: string
  current?: boolean
  checked?: boolean
  disabled?: boolean
  shortcut?: string
  icon?: DsIconName
  onSelect?: () => void
}

export interface DsMenuDefinition {
  id: string
  label: string
  items: readonly DsMenuItem[]
  visibility?: 'all' | 'wide-medium' | 'narrow'
  layout?: 'list' | 'section-grid'
}

function groupMenuItems(items: readonly DsMenuItem[]) {
  const groups: { section?: string; items: { item: DsMenuItem; itemIndex: number }[] }[] = []
  items.forEach((item, itemIndex) => {
    const previous = groups.at(-1)
    if (!previous || previous.section !== item.section) {
      groups.push({ section: item.section, items: [{ item, itemIndex }] })
    } else {
      previous.items.push({ item, itemIndex })
    }
  })
  return groups
}

export function DsMenuBar(props: {
  label: string
  menus: readonly DsMenuDefinition[]
  onNavigate?: (event: React.MouseEvent<HTMLAnchorElement>, item: DsMenuItem) => void
}) {
  const [openId, setOpenId] = useState<string>()
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRefs = useRef(new Map<string, HTMLButtonElement>())
  const itemRefs = useRef(new Map<string, HTMLElement[]>())

  useEffect(() => {
    if (!openId) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpenId(undefined)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [openId])

  function menuIndex(id: string): number {
    return props.menus.findIndex((menu) => menu.id === id)
  }

  function focusMenu(fromId: string, direction: -1 | 1 | 'first' | 'last'): void {
    if (props.menus.length === 0) return
    const current = menuIndex(fromId)
    const index =
      direction === 'first'
        ? 0
        : direction === 'last'
          ? props.menus.length - 1
          : (current + direction + props.menus.length) % props.menus.length
    const target = props.menus[index]
    if (!target) return
    triggerRefs.current.get(target.id)?.focus()
    if (openId) setOpenId(target.id)
  }

  function focusItem(menuId: string, index: number): void {
    const items = itemRefs.current.get(menuId) ?? []
    const enabled = items.filter((item) => item.getAttribute('aria-disabled') !== 'true')
    if (enabled.length === 0) return
    enabled[Math.max(0, Math.min(enabled.length - 1, index))]?.focus()
  }

  return (
    <div ref={rootRef} className="ds-menubar" role="menubar" aria-label={props.label}>
      {props.menus.map((menu) => (
        <div key={menu.id} className="ds-menu" data-menu-visibility={menu.visibility ?? 'all'}>
          <button
            ref={(node) => {
              if (node) triggerRefs.current.set(menu.id, node)
              else triggerRefs.current.delete(menu.id)
            }}
            type="button"
            role="menuitem"
            className="ds-menu-trigger"
            aria-haspopup="menu"
            aria-expanded={openId === menu.id}
            onClick={() => {
              const next = openId === menu.id ? undefined : menu.id
              setOpenId(next)
              if (next) requestAnimationFrame(() => focusItem(menu.id, 0))
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowLeft') focusMenu(menu.id, -1)
              else if (event.key === 'ArrowRight') focusMenu(menu.id, 1)
              else if (event.key === 'Home') focusMenu(menu.id, 'first')
              else if (event.key === 'End') focusMenu(menu.id, 'last')
              else if (['ArrowDown', 'Enter', ' '].includes(event.key)) {
                setOpenId(menu.id)
                requestAnimationFrame(() => focusItem(menu.id, 0))
              } else return
              event.preventDefault()
            }}
          >
            {menu.label}
          </button>
          {openId === menu.id ? (
            <div
              className="ds-menu-popover"
              data-layout={menu.layout ?? 'list'}
              role="menu"
              aria-label={menu.label}
              onKeyDown={(event) => {
                const items = (itemRefs.current.get(menu.id) ?? []).filter(
                  (item) => item.getAttribute('aria-disabled') !== 'true',
                )
                const current = items.indexOf(document.activeElement as HTMLElement)
                if (event.key === 'Escape') {
                  setOpenId(undefined)
                  triggerRefs.current.get(menu.id)?.focus()
                } else if (event.key === 'ArrowDown') {
                  items[(current + 1 + items.length) % items.length]?.focus()
                } else if (event.key === 'ArrowUp') {
                  items[(current - 1 + items.length) % items.length]?.focus()
                } else if (event.key === 'Home') items[0]?.focus()
                else if (event.key === 'End') items[items.length - 1]?.focus()
                else if (event.key === 'ArrowLeft') focusMenu(menu.id, -1)
                else if (event.key === 'ArrowRight') focusMenu(menu.id, 1)
                else return
                event.preventDefault()
              }}
            >
              <div className="ds-menu-group-flow" role="presentation">
                {groupMenuItems(menu.items).map((group) => (
                  <div
                    className="ds-menu-group"
                    role="group"
                    aria-label={group.section}
                    key={`${group.section ?? 'items'}:${group.items[0]?.item.id ?? 'empty'}`}
                  >
                    {group.section ? (
                      <div className="ds-menu-section-title" role="presentation">
                        {group.section}
                      </div>
                    ) : null}
                    {group.items.map(({ item, itemIndex }) => {
                      const common = {
                        className: 'ds-menu-item',
                        role: item.checked === undefined ? 'menuitem' : 'menuitemcheckbox',
                        tabIndex: itemIndex === 0 ? 0 : -1,
                        'aria-disabled': item.disabled || undefined,
                        'aria-current': item.current ? ('page' as const) : undefined,
                        'aria-checked': item.checked,
                        ref: (node: HTMLElement | null) => {
                          const current = itemRefs.current.get(menu.id) ?? []
                          if (node) current[itemIndex] = node
                          else current.splice(itemIndex, 1)
                          itemRefs.current.set(menu.id, current)
                        },
                      }
                      const content = (
                        <>
                          {item.icon ? <DsIcon name={item.icon} /> : null}
                          <span className="ds-menu-item__label">{item.label}</span>
                          <span className="ds-spacer" />
                          {item.shortcut ? (
                            <span className="ds-field__help">{item.shortcut}</span>
                          ) : null}
                          {item.checked ? (
                            <DsIcon className="ds-menu-item__check" name="check" />
                          ) : null}
                        </>
                      )
                      return item.href ? (
                        <a
                          key={item.id}
                          {...common}
                          href={item.disabled ? undefined : item.href}
                          onClick={(event) => {
                            if (item.disabled) {
                              event.preventDefault()
                              return
                            }
                            props.onNavigate?.(event, item)
                            setOpenId(undefined)
                          }}
                        >
                          {content}
                        </a>
                      ) : (
                        <button
                          key={item.id}
                          {...common}
                          type="button"
                          disabled={item.disabled}
                          onClick={() => {
                            item.onSelect?.()
                            setOpenId(undefined)
                          }}
                        >
                          {content}
                        </button>
                      )
                    })}
                  </div>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  )
}

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
  overflowAfter?: number
  size?: DsControlSize
}) {
  const [overflowOpen, setOverflowOpen] = useState(false)
  const overflowRef = useRef<HTMLDivElement>(null)
  const overflowTriggerRef = useRef<HTMLButtonElement>(null)
  const commands = props.groups.flat()
  const overflowAfter = Math.max(0, props.overflowAfter ?? commands.length)
  const displayedGroups =
    props.overflowAfter === undefined ? props.groups : [commands.slice(0, overflowAfter)]
  const overflowCommands = props.overflowAfter === undefined ? [] : commands.slice(overflowAfter)

  useEffect(() => {
    if (!overflowOpen) return
    const close = (event: PointerEvent): void => {
      if (!overflowRef.current?.contains(event.target as Node)) setOverflowOpen(false)
    }
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [overflowOpen])

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
      {displayedGroups.map((group, groupIndex) => (
        <div className="ds-toolbar__group" key={group.map((command) => command.id).join(':')}>
          {groupIndex > 0 ? <span className="ds-toolbar__divider" aria-hidden="true" /> : null}
          {group.map(commandButton)}
        </div>
      ))}
      <span className="ds-spacer" />
      {overflowCommands.length > 0 ? (
        <div ref={overflowRef} className="ds-toolbar__overflow">
          <DsTooltip label="更多工具">
            <button
              ref={overflowTriggerRef}
              type="button"
              className={dsClasses(
                'ds-toolbar-button',
                props.size === 'compact' && 'ds-toolbar-button--compact',
              )}
              aria-label="更多工具"
              aria-haspopup="menu"
              aria-expanded={overflowOpen}
              onClick={() => setOverflowOpen((open) => !open)}
            >
              <DsIcon name="more" />
            </button>
          </DsTooltip>
          {overflowOpen ? (
            <div
              className="ds-toolbar__overflow-menu"
              role="menu"
              aria-label="更多工具"
              onKeyDown={(event) => {
                if (event.key !== 'Escape') return
                event.preventDefault()
                setOverflowOpen(false)
                overflowTriggerRef.current?.focus()
              }}
            >
              {overflowCommands.map((command) => (
                <button
                  key={command.id}
                  type="button"
                  className="ds-menu-item"
                  role={command.pressed === undefined ? 'menuitem' : 'menuitemcheckbox'}
                  aria-checked={command.pressed}
                  disabled={command.disabled || command.busy}
                  title={command.disabledReason}
                  onClick={() => {
                    command.execute()
                    setOverflowOpen(false)
                  }}
                >
                  <DsIcon name={command.icon} />
                  <span>{command.label}</span>
                  <span className="ds-spacer" />
                  {command.shortcut ? (
                    <span className="ds-field__help">{command.shortcut}</span>
                  ) : null}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      {props.trailing}
    </div>
  )
}

export function handleMenuCharacterSearch(
  event: KeyboardEvent<HTMLElement>,
  labels: readonly string[],
): number | undefined {
  if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return undefined
  const needle = event.key.toLocaleLowerCase()
  const index = labels.findIndex((label) => label.toLocaleLowerCase().startsWith(needle))
  return index >= 0 ? index : undefined
}
