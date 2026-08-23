import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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
  const [scrollTop, setScrollTop] = useState(0)
  const [activeIndex, setActiveIndex] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(props.height)
  const rootRef = useRef<HTMLDivElement>(null)
  const overscan = Math.max(1, props.overscan ?? 4)
  const range = useMemo(() => {
    const visible = Math.ceil(viewportHeight / props.itemHeight)
    const start = Math.max(0, Math.floor(scrollTop / props.itemHeight) - overscan)
    const end = Math.min(props.items.length, start + visible + overscan * 2)
    return { start, end }
  }, [overscan, props.itemHeight, props.items.length, scrollTop, viewportHeight])
  const visible = props.items.slice(range.start, range.end)
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
    if (!props.fill) {
      setViewportHeight(props.height)
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
  }, [props.fill, props.height])

  useEffect(() => {
    const maximum = Math.max(0, props.items.length * props.itemHeight - viewportHeight)
    if (scrollTop <= maximum) return
    const root = rootRef.current
    if (root) root.scrollTop = maximum
    setScrollTop(maximum)
  }, [props.itemHeight, props.items.length, scrollTop, viewportHeight])

  useEffect(() => {
    if (selectedIndex < 0) return
    const root = rootRef.current
    if (!root) return
    const top = selectedIndex * props.itemHeight
    const bottom = top + props.itemHeight
    if (top < root.scrollTop) root.scrollTo({ top })
    else if (bottom > root.scrollTop + viewportHeight)
      root.scrollTo({ top: bottom - viewportHeight })
  }, [props.itemHeight, selectedIndex, viewportHeight])

  const activate = (nextIndex: number, select: boolean, focus = true): void => {
    if (!props.items.length) return
    const index = Math.max(0, Math.min(props.items.length - 1, nextIndex))
    setActiveIndex(index)
    const root = rootRef.current
    const top = index * props.itemHeight
    const bottom = top + props.itemHeight
    if (root) {
      if (top < root.scrollTop) root.scrollTo({ top })
      else if (bottom > root.scrollTop + viewportHeight)
        root.scrollTo({ top: bottom - viewportHeight })
      if (focus) {
        const schedule =
          typeof requestAnimationFrame === 'function'
            ? requestAnimationFrame
            : (callback: FrameRequestCallback) => window.setTimeout(callback, 0)
        schedule(() =>
          root
            .querySelector<HTMLElement>(`[data-virtual-index="${index}"] button`)
            ?.focus(),
        )
      }
    }
    if (select) props.onSelect?.(props.items[index]!, index)
  }

  return (
    <div
      ref={rootRef}
      className="ds-virtual-list"
      role="list"
      aria-label={props.label}
      tabIndex={props.onSelect ? -1 : 0}
      style={props.fill ? undefined : { height: props.height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
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
          const index = range.start + offset
          return (
            <div
              key={props.getKey(item)}
              className="ds-virtual-list__item"
              role="listitem"
              aria-posinset={index + 1}
              aria-setsize={props.items.length}
              data-active={index === activeIndex || undefined}
              data-virtual-index={index}
              style={{ height: props.itemHeight, transform: `translateY(${index * props.itemHeight}px)` }}
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
