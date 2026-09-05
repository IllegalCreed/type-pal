import {
  type ReactNode,
  type RefObject,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react'

interface DsVirtualWindowOptions {
  count: number
  itemHeight: number
  height: number
  fill?: boolean
  overscan?: number
  /** Collections at or below this size are rendered in full. Omit to always virtualize. */
  virtualizeAbove?: number
}

function useDsVirtualWindow(
  options: DsVirtualWindowOptions,
  rootRef: RefObject<HTMLDivElement | null>,
) {
  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(options.height)
  const overscan = Math.max(1, options.overscan ?? 4)
  const virtual = options.virtualizeAbove === undefined || options.count > options.virtualizeAbove
  const maximumScrollTop = Math.max(0, options.count * options.itemHeight - viewportHeight)
  const effectiveScrollTop = Math.min(scrollTop, maximumScrollTop)
  const range = useMemo(() => {
    if (!virtual) return { start: 0, end: options.count }
    const visible = Math.ceil(viewportHeight / options.itemHeight)
    const start = Math.max(0, Math.floor(effectiveScrollTop / options.itemHeight) - overscan)
    const end = Math.min(options.count, start + visible + overscan * 2)
    return { start, end }
  }, [effectiveScrollTop, options.count, options.itemHeight, overscan, viewportHeight, virtual])

  useEffect(() => {
    if (!options.fill) {
      setViewportHeight(options.height)
      return
    }
    const root = rootRef.current
    if (!root || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entry]) => {
      const height = entry?.contentRect.height ?? 0
      if (height > 0) setViewportHeight(height)
    })
    observer.observe(root)
    return () => observer.disconnect()
  }, [options.fill, options.height, rootRef])

  useEffect(() => {
    const maximum = Math.max(0, options.count * options.itemHeight - viewportHeight)
    if (scrollTop <= maximum) return
    const root = rootRef.current
    if (root) root.scrollTop = maximum
    setScrollTop(maximum)
  }, [options.count, options.itemHeight, rootRef, scrollTop, viewportHeight])

  const ensureIndexVisible = useCallback(
    (index: number): boolean => {
      const root = rootRef.current
      if (!root || index < 0) return false
      const top = index * options.itemHeight
      const bottom = top + options.itemHeight
      let nextScrollTop = root.scrollTop
      if (top < nextScrollTop) nextScrollTop = top
      else if (bottom > nextScrollTop + viewportHeight) nextScrollTop = bottom - viewportHeight
      const changed = root.scrollTop !== nextScrollTop
      if (changed) root.scrollTo({ top: nextScrollTop })
      setScrollTop(nextScrollTop)
      return changed
    },
    [options.itemHeight, rootRef, viewportHeight],
  )

  return {
    range,
    viewportHeight,
    virtual,
    ensureIndexVisible,
    onScroll: (nextScrollTop: number) => setScrollTop(nextScrollTop),
  }
}

export function DsVirtualList<T>(props: {
  label: string
  items: readonly T[]
  itemHeight: number
  height: number
  fill?: boolean
  overscan?: number
  getKey: (item: T) => React.Key
  renderItem: (
    item: T,
    index: number,
    control: { active: boolean; tabIndex: 0 | -1; onFocus: () => void },
  ) => ReactNode
  selectedKey?: React.Key
  onSelect?: (item: T, index: number) => void
  selectionFollowsFocus?: boolean
}) {
  const [activeIndex, setActiveIndex] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const virtualWindow = useDsVirtualWindow(
    {
      count: props.items.length,
      itemHeight: props.itemHeight,
      height: props.height,
      fill: props.fill,
      overscan: props.overscan,
    },
    rootRef,
  )
  const visible = props.items.slice(virtualWindow.range.start, virtualWindow.range.end)
  const selectedIndex = useMemo(
    () =>
      props.selectedKey === undefined
        ? -1
        : props.items.findIndex((item) => props.getKey(item) === props.selectedKey),
    [props.getKey, props.items, props.selectedKey],
  )

  useEffect(() => {
    if (selectedIndex >= 0) setActiveIndex(selectedIndex)
    else
      setActiveIndex((current) =>
        current >= props.items.length ? Math.max(0, props.items.length - 1) : current,
      )
  }, [props.items.length, selectedIndex])

  useEffect(() => {
    if (selectedIndex >= 0) virtualWindow.ensureIndexVisible(selectedIndex)
  }, [selectedIndex, virtualWindow.ensureIndexVisible])

  const activate = (nextIndex: number, select: boolean, focus = true): void => {
    if (!props.items.length) return
    const index = Math.max(0, Math.min(props.items.length - 1, nextIndex))
    setActiveIndex(index)
    virtualWindow.ensureIndexVisible(index)
    if (focus) {
      const schedule =
        typeof requestAnimationFrame === 'function'
          ? requestAnimationFrame
          : (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
      schedule(() =>
        rootRef.current
          ?.querySelector<HTMLElement>(`[data-virtual-index="${index}"] button`)
          ?.focus(),
      )
    }
    if (select) props.onSelect?.(props.items[index]!, index)
  }

  return (
    // biome-ignore lint/a11y/useSemanticElements: Virtual list geometry requires a spacer; explicit list/listitem roles preserve the hierarchy without invalid ul/div markup.
    <div
      ref={rootRef}
      className="ds-virtual-list"
      data-fill={props.fill || undefined}
      data-ds-scroll-scope="catalog"
      data-ds-scroll-owner="catalog"
      data-ds-scroll-axis="y"
      role="list"
      aria-label={props.label}
      tabIndex={props.onSelect ? -1 : 0}
      style={props.fill ? undefined : { height: props.height }}
      onScroll={(event) => virtualWindow.onScroll(event.currentTarget.scrollTop)}
      onKeyDown={(event) => {
        const followsFocus = props.selectionFollowsFocus ?? false
        if (event.key === 'ArrowUp') activate(activeIndex - 1, followsFocus)
        else if (event.key === 'ArrowDown') activate(activeIndex + 1, followsFocus)
        else if (event.key === 'Home') activate(0, followsFocus)
        else if (event.key === 'End') activate(props.items.length - 1, followsFocus)
        else if (event.key === 'Enter' || event.key === ' ') activate(activeIndex, true, false)
        else return
        event.preventDefault()
      }}
    >
      <div
        className="ds-virtual-list__spacer"
        style={{ height: props.items.length * props.itemHeight }}
      >
        {visible.map((item, offset) => {
          const index = virtualWindow.range.start + offset
          return (
            // biome-ignore lint/a11y/useSemanticElements: Virtual list geometry requires a spacer; explicit list/listitem roles preserve the hierarchy without invalid ul/div markup.
            <div
              key={props.getKey(item)}
              className="ds-virtual-list__item"
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={props.items.length}
              data-active={index === activeIndex || undefined}
              data-virtual-index={index}
              style={{
                height: props.itemHeight,
                transform: `translateY(${index * props.itemHeight}px)`,
              }}
              onPointerMove={() => setActiveIndex(index)}
            >
              {props.renderItem(item, index, {
                active: index === activeIndex,
                tabIndex: index === activeIndex ? 0 : -1,
                onFocus: () => setActiveIndex(index),
              })}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function findEnabledIndex<T>(
  items: readonly T[],
  getDisabled: ((item: T) => boolean) | undefined,
  fromEnd = false,
): number {
  if (fromEnd) {
    for (let index = items.length - 1; index >= 0; index -= 1)
      if (!getDisabled?.(items[index]!)) return index
    return -1
  }
  return items.findIndex((item) => !getDisabled?.(item))
}

function nextEnabledIndex<T>(
  items: readonly T[],
  current: number,
  delta: -1 | 1,
  getDisabled?: (item: T) => boolean,
): number {
  let index = current
  for (let visited = 0; visited < items.length; visited += 1) {
    index = Math.max(0, Math.min(items.length - 1, index + delta))
    if (!getDisabled?.(items[index]!)) return index
    if (index === 0 || index === items.length - 1) break
  }
  return current
}

export function DsVirtualListbox<T>(props: {
  id?: string
  label: string
  items: readonly T[]
  itemHeight: number
  height: number
  fill?: boolean
  overscan?: number
  virtualizeAbove?: number
  viewportRef?: RefObject<HTMLDivElement | null>
  /** When provided, keyboard navigation and aria-activedescendant stay on this focus owner. */
  keyboardOwnerRef?: RefObject<HTMLElement | null>
  getKey: (item: T) => React.Key
  getDisabled?: (item: T) => boolean
  renderItem: (
    item: T,
    index: number,
    control: { active: boolean; selected: boolean; disabled: boolean },
  ) => ReactNode
  selectedKey?: React.Key | null
  onSelect: (item: T, index: number) => void
}) {
  const generatedId = useId().replace(/:/g, '')
  const listboxId = props.id ?? `ds-virtual-listbox-${generatedId}`
  const internalRef = useRef<HTMLDivElement>(null)
  const rootRef = props.viewportRef ?? internalRef
  const selectedIndex =
    props.selectedKey == null
      ? -1
      : props.items.findIndex((item) => props.getKey(item) === props.selectedKey)
  const [activeKey, setActiveKey] = useState<React.Key | null>(() => {
    const first = findEnabledIndex(props.items, props.getDisabled)
    return first >= 0 ? props.getKey(props.items[first]!) : null
  })
  const activeSuspendedRef = useRef(false)
  const programmaticScrollTargetRef = useRef<number | null>(null)
  const activeIndex = props.items.findIndex((item) => props.getKey(item) === activeKey)
  const virtualWindow = useDsVirtualWindow(
    {
      count: props.items.length,
      itemHeight: props.itemHeight,
      height: props.height,
      fill: props.fill,
      overscan: props.overscan,
      virtualizeAbove: props.virtualizeAbove,
    },
    rootRef,
  )
  const visible = props.items.slice(virtualWindow.range.start, virtualWindow.range.end)

  const activate = useCallback(
    (index: number) => {
      const item = props.items[index]
      if (!item || props.getDisabled?.(item)) return
      activeSuspendedRef.current = false
      setActiveKey(props.getKey(item))
      programmaticScrollTargetRef.current = index
      if (!virtualWindow.ensureIndexVisible(index)) programmaticScrollTargetRef.current = null
    },
    [props.getDisabled, props.getKey, props.items, virtualWindow.ensureIndexVisible],
  )

  useEffect(() => {
    if (selectedIndex >= 0 && !props.getDisabled?.(props.items[selectedIndex]!)) {
      activate(selectedIndex)
      return
    }
    if (activeSuspendedRef.current) return
    if (activeIndex >= 0 && !props.getDisabled?.(props.items[activeIndex]!)) {
      virtualWindow.ensureIndexVisible(activeIndex)
      return
    }
    const first = findEnabledIndex(props.items, props.getDisabled)
    setActiveKey(first >= 0 ? props.getKey(props.items[first]!) : null)
  }, [
    activeIndex,
    activate,
    props.getDisabled,
    props.getKey,
    props.items,
    selectedIndex,
    virtualWindow.ensureIndexVisible,
  ])

  const optionId = useCallback((index: number) => `${listboxId}-option-${index}`, [listboxId])
  const selectActive = useCallback(() => {
    const item = props.items[activeIndex]
    if (!item || props.getDisabled?.(item)) return
    props.onSelect(item, activeIndex)
  }, [activeIndex, props.getDisabled, props.items, props.onSelect])

  const handleNavigation = useCallback(
    (
      event: {
        key: string
        isComposing?: boolean
        keyCode?: number
        preventDefault: () => void
      },
      editableOwner = false,
    ) => {
      if (event.isComposing || event.keyCode === 229) return
      if (editableOwner && (event.key === ' ' || event.key === 'Home' || event.key === 'End'))
        return
      if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
        const fallback = findEnabledIndex(props.items, props.getDisabled, event.key === 'ArrowUp')
        const next =
          activeIndex < 0
            ? fallback
            : nextEnabledIndex(
                props.items,
                activeIndex,
                event.key === 'ArrowUp' ? -1 : 1,
                props.getDisabled,
              )
        if (next >= 0) activate(next)
      } else if (event.key === 'Home' || event.key === 'End') {
        const next = findEnabledIndex(props.items, props.getDisabled, event.key === 'End')
        if (next >= 0) activate(next)
      } else if (event.key === 'Enter' || event.key === ' ') selectActive()
      else return
      event.preventDefault()
    },
    [activate, activeIndex, props.getDisabled, props.items, selectActive],
  )

  useEffect(() => {
    const owner = props.keyboardOwnerRef?.current
    if (!owner) return
    const listener = (event: KeyboardEvent) => handleNavigation(event, true)
    owner.addEventListener('keydown', listener)
    return () => owner.removeEventListener('keydown', listener)
  }, [handleNavigation, props.keyboardOwnerRef])

  useEffect(() => {
    const owner = props.keyboardOwnerRef?.current
    if (!owner) return
    const previousControls = owner.getAttribute('aria-controls')
    const previousActive = owner.getAttribute('aria-activedescendant')
    owner.setAttribute('aria-controls', listboxId)
    if (activeIndex >= 0) owner.setAttribute('aria-activedescendant', optionId(activeIndex))
    else owner.removeAttribute('aria-activedescendant')
    return () => {
      if (previousControls == null) owner.removeAttribute('aria-controls')
      else owner.setAttribute('aria-controls', previousControls)
      if (previousActive == null) owner.removeAttribute('aria-activedescendant')
      else owner.setAttribute('aria-activedescendant', previousActive)
    }
  }, [activeIndex, listboxId, optionId, props.keyboardOwnerRef])

  return (
    <div
      ref={rootRef}
      id={listboxId}
      className="ds-virtual-list ds-virtual-listbox"
      data-fill={props.fill || undefined}
      data-virtual={virtualWindow.virtual || undefined}
      role="listbox"
      aria-label={props.label}
      aria-activedescendant={
        !props.keyboardOwnerRef && activeIndex >= 0 ? optionId(activeIndex) : undefined
      }
      tabIndex={props.keyboardOwnerRef ? -1 : 0}
      style={props.fill ? undefined : { height: props.height }}
      onScroll={(event) => {
        const nextScrollTop = event.currentTarget.scrollTop
        virtualWindow.onScroll(nextScrollTop)
        if (programmaticScrollTargetRef.current != null) {
          programmaticScrollTargetRef.current = null
          return
        }
        if (!virtualWindow.virtual || !props.items.length) return
        const firstVisible = Math.min(
          props.items.length - 1,
          Math.max(0, Math.floor(nextScrollTop / props.itemHeight)),
        )
        const lastVisible = Math.min(
          props.items.length - 1,
          firstVisible +
            Math.max(1, Math.floor(virtualWindow.viewportHeight / props.itemHeight)) -
            1,
        )
        if (activeIndex >= firstVisible && activeIndex <= lastVisible) return
        let nextActiveKey: React.Key | null = null
        for (let index = firstVisible; index <= lastVisible; index += 1) {
          const item = props.items[index]!
          if (props.getDisabled?.(item)) continue
          nextActiveKey = props.getKey(item)
          break
        }
        activeSuspendedRef.current = nextActiveKey == null
        setActiveKey(nextActiveKey)
      }}
      onKeyDown={(event) =>
        handleNavigation({
          key: event.key,
          isComposing: event.nativeEvent.isComposing,
          keyCode: event.nativeEvent.keyCode,
          preventDefault: () => event.preventDefault(),
        })
      }
    >
      <div
        className="ds-virtual-list__spacer"
        style={{ height: props.items.length * props.itemHeight }}
      >
        {visible.map((item, offset) => {
          const index = virtualWindow.range.start + offset
          const key = props.getKey(item)
          const disabled = props.getDisabled?.(item) ?? false
          const selected = key === props.selectedKey
          const active = index === activeIndex
          return (
            // biome-ignore lint/a11y/useKeyWithClickEvents lint/a11y/useFocusableInteractive: APG active-descendant focus stays with the listbox/keyboard owner, which handles keyboard selection.
            <div
              key={key}
              id={optionId(index)}
              className="ds-virtual-list__item ds-virtual-listbox__option"
              role="option"
              aria-selected={selected}
              aria-disabled={disabled || undefined}
              aria-posinset={index + 1}
              aria-setsize={props.items.length}
              data-active={active || undefined}
              data-selected={selected || undefined}
              data-disabled={disabled || undefined}
              data-virtual-index={index}
              style={{
                height: props.itemHeight,
                transform: `translateY(${index * props.itemHeight}px)`,
              }}
              onPointerMove={() => {
                if (!disabled) {
                  activeSuspendedRef.current = false
                  setActiveKey(key)
                }
              }}
              onClick={() => {
                if (!disabled) props.onSelect(item, index)
              }}
            >
              {props.renderItem(item, index, { active, selected, disabled })}
            </div>
          )
        })}
      </div>
    </div>
  )
}
