import { type ReactNode, useMemo, useRef, useState } from 'react'

export function DsVirtualList<T>(props: {
  label: string
  items: readonly T[]
  itemHeight: number
  height: number
  overscan?: number
  getKey: (item: T) => React.Key
  renderItem: (item: T, index: number) => ReactNode
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const overscan = Math.max(1, props.overscan ?? 4)
  const range = useMemo(() => {
    const visible = Math.ceil(props.height / props.itemHeight)
    const start = Math.max(0, Math.floor(scrollTop / props.itemHeight) - overscan)
    const end = Math.min(props.items.length, start + visible + overscan * 2)
    return { start, end }
  }, [overscan, props.height, props.itemHeight, props.items.length, scrollTop])
  const visible = props.items.slice(range.start, range.end)
  return (
    <div
      ref={rootRef}
      className="ds-virtual-list"
      role="listbox"
      aria-label={props.label}
      tabIndex={0}
      style={{ height: props.height }}
      onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
      onKeyDown={(event) => {
        if (event.key === 'Home') rootRef.current?.scrollTo({ top: 0 })
        else if (event.key === 'End')
          rootRef.current?.scrollTo({ top: props.items.length * props.itemHeight })
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
              role="option"
              style={{ height: props.itemHeight, transform: `translateY(${index * props.itemHeight}px)` }}
            >
              {props.renderItem(item, index)}
            </div>
          )
        })}
      </div>
    </div>
  )
}
