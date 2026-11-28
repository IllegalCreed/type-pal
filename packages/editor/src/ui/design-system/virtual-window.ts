import { type RefObject, useCallback, useEffect, useMemo, useState } from 'react'

interface DsVirtualWindowOptions {
  count: number
  itemHeight: number
  height: number
  fill?: boolean
  overscan?: number
  /** Collections at or below this size are rendered in full. Omit to always virtualize. */
  virtualizeAbove?: number
}

export function useDsVirtualWindow(
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
