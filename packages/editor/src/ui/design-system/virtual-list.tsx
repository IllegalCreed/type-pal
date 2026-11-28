import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { useDsVirtualWindow } from './virtual-window.js'

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
