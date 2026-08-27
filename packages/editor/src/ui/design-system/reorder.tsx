import {
  createContext,
  type CSSProperties,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { createPortal } from 'react-dom'
import { dsClasses } from './controls.js'
import { DsIconButton } from './controls.js'
import { resolveDsPortalHost } from './floating-layer.js'
import { DsIcon } from './icons.js'

export interface DsReorderEntry {
  key: string
  label: string
  disabled?: boolean
  dropDisabled?: boolean
}

export interface DsReorderIntent {
  adoptionId: string
  scopeKey: string
  sourceKey: string
  targetKey: string
  fromIndex: number
  toIndex: number
  placement: 'before' | 'after'
  input: 'pointer' | 'keyboard' | 'button'
}

export interface DsReorderKeysController {
  keys: string[]
  move(intent: Pick<DsReorderIntent, 'fromIndex' | 'toIndex'>, strategy?: DsReorderStrategy): void
  remove(index: number): void
  /** Drop every occurrence token after an external history/object replacement makes identity unknowable. */
  reset(): void
}

export function reorderDsItems<T>(
  items: readonly T[],
  intent: Pick<DsReorderIntent, 'fromIndex' | 'toIndex'>,
  strategy: DsReorderStrategy = 'insert',
  equal: (left: T, right: T) => boolean = Object.is,
): readonly T[] {
  if (
    intent.fromIndex === intent.toIndex ||
    intent.fromIndex < 0 ||
    intent.toIndex < 0 ||
    intent.fromIndex >= items.length ||
    intent.toIndex >= items.length
  )
    return items
  const next = [...items]
  if (strategy === 'swap') {
    ;[next[intent.fromIndex], next[intent.toIndex]] = [
      next[intent.toIndex]!,
      next[intent.fromIndex]!,
    ]
    return next.every((item, index) => equal(item, items[index]!)) ? items : next
  }
  const [moved] = next.splice(intent.fromIndex, 1)
  if (moved === undefined) return items
  next.splice(intent.toIndex, 0, moved)
  return next.every((item, index) => equal(item, items[index]!)) ? items : next
}

/** Equality for persisted JSON-shaped editor values. Never use it for File/Blob/DOM transfer values. */
export function sameDsSerializableValue<T>(left: T, right: T): boolean {
  return JSON.stringify(left) === JSON.stringify(right)
}

type DsReorderRevision = unknown
type DsReorderOrientation = 'vertical' | 'horizontal'
export type DsReorderStrategy = 'insert' | 'swap'

function moveTargetIndex(
  entries: readonly DsReorderEntry[],
  fromIndex: number,
  direction: DsReorderMoveDirection,
): number {
  let target =
    direction === 'first'
      ? 0
      : direction === 'last'
        ? entries.length - 1
        : fromIndex + (direction === 'backward' ? -1 : 1)
  target = Math.max(0, Math.min(entries.length - 1, target))
  const step =
    direction === 'backward' ? -1 : direction === 'forward' ? 1 : direction === 'first' ? 1 : -1
  while (
    target !== fromIndex &&
    target >= 0 &&
    target < entries.length &&
    entries[target]?.dropDisabled
  )
    target += step
  return target >= 0 && target < entries.length ? target : fromIndex
}

interface ReorderSnapshot {
  scopeKey: string
  sourceKey: string
  sourceLabel: string
  keys: string[]
  revision: DsReorderRevision
  fromIndex: number
  projectedIndex: number
  targetKey: string
  placement: 'before' | 'after'
  layouts: Readonly<Record<string, ReorderItemLayout>>
  viewportOrigin: ReorderViewportOrigin
}

interface ReorderItemLayout {
  left: number
  top: number
  width: number
  height: number
}

interface ReorderPreviewOffset {
  x: number
  y: number
}

interface ReorderPreviewPlaceholder extends ReorderItemLayout {
  gapBefore: number
}

interface ReorderPreviewProjection {
  offsets: Readonly<Record<string, ReorderPreviewOffset>>
  placeholder?: ReorderPreviewPlaceholder
}

interface ReorderScrollOrigin {
  owner: HTMLElement
  left: number
  top: number
}

interface ReorderViewportOrigin {
  windowX: number
  windowY: number
  scrollOwners: readonly ReorderScrollOrigin[]
}

interface ReorderBaseline {
  scopeKey: string
  revision: DsReorderRevision
  keys: string[]
}

interface PointerSession {
  sourceKey: string
  pointerId: number
  pointerType: string
  startX: number
  startY: number
  handle: HTMLButtonElement
  baseline?: ReorderBaseline
  snapshot?: ReorderSnapshot
  validTarget: boolean
  lastClientX: number
  lastClientY: number
  scrollOwners: HTMLElement[]
  scrollAnchor?: HTMLElement
}

interface ReorderView {
  sourceKey: string
  projectedIndex: number
  input: 'pointer' | 'keyboard'
  offsets: Readonly<Record<string, ReorderPreviewOffset>>
}

interface IndicatorLayout {
  host: Element
  style: CSSProperties
}

interface RegisteredItem {
  item: HTMLElement
  handle: HTMLButtonElement
}

interface ReorderContextValue {
  entries: readonly DsReorderEntry[]
  view: ReorderView | null
  disabled: boolean
  orientation: DsReorderOrientation
  instructionsId: string
  register(key: string, item: HTMLElement | null, handle: HTMLButtonElement | null): void
  pointerDown(key: string, event: ReactPointerEvent<HTMLButtonElement>): void
  pointerMove(event: ReactPointerEvent<HTMLButtonElement>): void
  pointerUp(event: ReactPointerEvent<HTMLButtonElement>): void
  pointerCancel(event: ReactPointerEvent<HTMLButtonElement>): void
  lostPointerCapture(event: ReactPointerEvent<HTMLButtonElement>): void
  keyDown(key: string, event: ReactKeyboardEvent<HTMLButtonElement>): void
  blur(key: string): void
  move(key: string, direction: DsReorderMoveDirection): void
}

export type DsReorderMoveDirection = 'backward' | 'forward' | 'first' | 'last'

const ReorderContext = createContext<ReorderContextValue | null>(null)
const POINTER_THRESHOLD_PX = 6
const AUTO_SCROLL_EDGE_PX = 36
const AUTO_SCROLL_STEP_PX = 14

function projectReorderPreview(
  snapshot: ReorderSnapshot,
  strategy: DsReorderStrategy,
  orientation: DsReorderOrientation,
  toIndex: number,
  pointerDelta?: ReorderPreviewOffset,
  viewportShift: ReorderPreviewOffset = { x: 0, y: 0 },
): ReorderPreviewProjection {
  const projectedIndex = Math.max(0, Math.min(snapshot.keys.length - 1, toIndex))
  const projectedKeys = [...snapshot.keys]
  if (strategy === 'swap') {
    ;[projectedKeys[snapshot.fromIndex], projectedKeys[projectedIndex]] = [
      projectedKeys[projectedIndex]!,
      projectedKeys[snapshot.fromIndex]!,
    ]
  } else {
    const [sourceKey] = projectedKeys.splice(snapshot.fromIndex, 1)
    if (sourceKey) projectedKeys.splice(projectedIndex, 0, sourceKey)
  }

  const first = snapshot.layouts[snapshot.keys[0]!]
  if (!first) {
    return {
      offsets: pointerDelta ? { [snapshot.sourceKey]: pointerDelta } : {},
    }
  }
  const axisStart =
    orientation === 'vertical' ? first.top + viewportShift.y : first.left + viewportShift.x
  const positionalGaps = snapshot.keys.slice(0, -1).map((key, index) => {
    const current = snapshot.layouts[key]
    const next = snapshot.layouts[snapshot.keys[index + 1]!]
    if (!current || !next) return 0
    const gap =
      orientation === 'vertical'
        ? next.top - (current.top + current.height)
        : next.left - (current.left + current.width)
    return Number.isFinite(gap) ? Math.max(0, gap) : 0
  })
  const offsets: Record<string, ReorderPreviewOffset> = {}
  let cursor = axisStart
  let placeholder: ReorderPreviewPlaceholder | undefined
  for (const [slot, key] of projectedKeys.entries()) {
    const layout = snapshot.layouts[key]
    if (!layout) continue
    const originalStart =
      orientation === 'vertical' ? layout.top + viewportShift.y : layout.left + viewportShift.x
    const delta = cursor - originalStart
    offsets[key] = orientation === 'vertical' ? { x: 0, y: delta } : { x: delta, y: 0 }
    if (key === snapshot.sourceKey) {
      placeholder = {
        left: layout.left + viewportShift.x + (orientation === 'horizontal' ? delta : 0),
        top: layout.top + viewportShift.y + (orientation === 'vertical' ? delta : 0),
        width: layout.width,
        height: layout.height,
        gapBefore: slot > 0 ? (positionalGaps[slot - 1] ?? 0) : 0,
      }
    }
    cursor +=
      (orientation === 'vertical' ? layout.height : layout.width) + (positionalGaps[slot] ?? 0)
  }
  if (pointerDelta)
    offsets[snapshot.sourceKey] = {
      x: pointerDelta.x - viewportShift.x,
      y: pointerDelta.y - viewportShift.y,
    }
  return { offsets, ...(placeholder ? { placeholder } : {}) }
}

function captureViewportOrigin(item: HTMLElement): ReorderViewportOrigin {
  const scrollOwners: ReorderScrollOrigin[] = []
  let current = item.parentElement
  while (current && current !== document.body && current !== document.documentElement) {
    scrollOwners.push({ owner: current, left: current.scrollLeft, top: current.scrollTop })
    current = current.parentElement
  }
  return {
    windowX: typeof window === 'undefined' ? 0 : window.scrollX,
    windowY: typeof window === 'undefined' ? 0 : window.scrollY,
    scrollOwners,
  }
}

function currentViewportShift(origin: ReorderViewportOrigin): ReorderPreviewOffset {
  let x = -(typeof window === 'undefined' ? 0 : window.scrollX - origin.windowX)
  let y = -(typeof window === 'undefined' ? 0 : window.scrollY - origin.windowY)
  for (const scroll of origin.scrollOwners) {
    x -= scroll.owner.scrollLeft - scroll.left
    y -= scroll.owner.scrollTop - scroll.top
  }
  return { x, y }
}

function snapshotContainsPoint(
  snapshot: ReorderSnapshot,
  orientation: DsReorderOrientation,
  clientX: number,
  clientY: number,
  viewportShift: ReorderPreviewOffset,
): boolean {
  const layouts = Object.values(snapshot.layouts)
  if (layouts.length === 0) return false
  const left = Math.min(...layouts.map((layout) => layout.left)) + viewportShift.x
  const right = Math.max(...layouts.map((layout) => layout.left + layout.width)) + viewportShift.x
  const top = Math.min(...layouts.map((layout) => layout.top)) + viewportShift.y
  const bottom = Math.max(...layouts.map((layout) => layout.top + layout.height)) + viewportShift.y
  return orientation === 'vertical'
    ? clientX >= left && clientX <= right && clientY >= top && clientY <= bottom
    : clientY >= top && clientY <= bottom && clientX >= left && clientX <= right
}

function insertIndexAtCoordinate(
  snapshot: ReorderSnapshot,
  orientation: DsReorderOrientation,
  coordinate: number,
  viewportShift: ReorderPreviewOffset,
): number {
  const currentProjection = projectReorderPreview(
    snapshot,
    'insert',
    orientation,
    snapshot.projectedIndex,
    undefined,
    viewportShift,
  )
  let index = 0
  for (const key of snapshot.keys) {
    if (key === snapshot.sourceKey) continue
    const layout = snapshot.layouts[key]
    if (!layout) continue
    const offset = currentProjection.offsets[key] ?? { x: 0, y: 0 }
    const midpoint =
      orientation === 'vertical'
        ? layout.top + viewportShift.y + offset.y + layout.height / 2
        : layout.left + viewportShift.x + offset.x + layout.width / 2
    if (coordinate >= midpoint) index += 1
  }
  return Math.max(0, Math.min(snapshot.keys.length - 1, index))
}

function swapIndexAtCoordinate(
  snapshot: ReorderSnapshot,
  orientation: DsReorderOrientation,
  coordinate: number,
  viewportShift: ReorderPreviewOffset,
): number {
  let closest = snapshot.fromIndex
  let closestDistance = Number.POSITIVE_INFINITY
  snapshot.keys.forEach((key, index) => {
    const layout = snapshot.layouts[key]
    if (!layout) return
    const midpoint =
      orientation === 'vertical'
        ? layout.top + viewportShift.y + layout.height / 2
        : layout.left + viewportShift.x + layout.width / 2
    const distance = Math.abs(coordinate - midpoint)
    if (distance < closestDistance) {
      closest = index
      closestDistance = distance
    }
  })
  return closest
}

function scrollOwners(
  start: Element | null,
  orientation: DsReorderOrientation,
  scopeRoot: HTMLElement | null,
): HTMLElement[] {
  const owners: HTMLElement[] = []
  const dialogBoundary =
    scopeRoot?.closest(
      'dialog[open], [role="dialog"][aria-modal="true"], [role="alertdialog"][aria-modal="true"]',
    ) ?? null
  let current = start?.parentElement ?? null
  while (current && current !== document.body && current !== document.documentElement) {
    const style = getComputedStyle(current)
    const overflow = orientation === 'vertical' ? style.overflowY : style.overflowX
    const scrollable =
      orientation === 'vertical'
        ? current.scrollHeight > current.clientHeight
        : current.scrollWidth > current.clientWidth
    if (scrollable && /auto|scroll/.test(overflow)) owners.push(current)
    if (current === dialogBoundary) break
    current = current.parentElement
  }
  return owners
}

function ownedItemAtPoint(hit: Element | null, scopeRoot: HTMLElement | null): HTMLElement | null {
  let item = hit?.closest<HTMLElement>('[data-ds-reorder-item]') ?? null
  while (item) {
    if (item.closest('[data-ds-reorder-scope]') === scopeRoot) return item
    item = item.parentElement?.closest<HTMLElement>('[data-ds-reorder-item]') ?? null
  }
  return null
}

export function DsReorderCollection(props: {
  adoptionId: string
  scopeKey: string
  entries: readonly DsReorderEntry[]
  revision: DsReorderRevision
  children: ReactNode
  /** Return false when the domain adapter proves the projected order is a canonical no-op. */
  onReorder(intent: DsReorderIntent): boolean | void
  orientation?: DsReorderOrientation
  strategy?: DsReorderStrategy
  disabled?: boolean
  autoScroll?: boolean
  canReorder?(intent: DsReorderIntent): boolean
}) {
  const orientation = props.orientation ?? 'vertical'
  const strategy = props.strategy ?? 'insert'
  const instructionsId = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const registryRef = useRef(new Map<string, RegisteredItem>())
  const entriesRef = useRef(props.entries)
  const revisionRef = useRef(props.revision)
  const scopeKeyRef = useRef(props.scopeKey)
  const disabledRef = useRef(Boolean(props.disabled))
  const onReorderRef = useRef(props.onReorder)
  const canReorderRef = useRef(props.canReorder)
  const pointerRef = useRef<PointerSession | null>(null)
  const keyboardRef = useRef<ReorderSnapshot | null>(null)
  const autoScrollFrameRef = useRef<number | null>(null)
  const settleFrameRef = useRef<number | null>(null)
  const composingRef = useRef(false)
  const mountedRef = useRef(true)
  const projectPointerRef = useRef<
    (session: PointerSession, clientX: number, clientY: number) => void
  >(() => {})
  const [view, setView] = useState<ReorderView | null>(null)
  const [announcement, setAnnouncement] = useState('')
  const [indicator, setIndicator] = useState<IndicatorLayout | null>(null)
  const [settling, setSettling] = useState(false)

  entriesRef.current = props.entries
  revisionRef.current = props.revision
  scopeKeyRef.current = props.scopeKey
  disabledRef.current = Boolean(props.disabled)
  onReorderRef.current = props.onReorder
  canReorderRef.current = props.canReorder

  const duplicateKeys = new Set<string>()
  for (const entry of props.entries) {
    if (duplicateKeys.has(entry.key))
      throw new Error(
        `DsReorderCollection(${props.adoptionId}) requires unique item keys: ${entry.key}`,
      )
    duplicateKeys.add(entry.key)
  }

  const stopAutoScroll = useCallback(() => {
    if (autoScrollFrameRef.current !== null && typeof cancelAnimationFrame !== 'undefined')
      cancelAnimationFrame(autoScrollFrameRef.current)
    autoScrollFrameRef.current = null
  }, [])

  const endSettling = useCallback((updateView = true) => {
    if (settleFrameRef.current !== null && typeof cancelAnimationFrame !== 'undefined')
      cancelAnimationFrame(settleFrameRef.current)
    settleFrameRef.current = null
    if (updateView && mountedRef.current) setSettling(false)
  }, [])

  const beginSettling = useCallback(() => {
    endSettling(false)
    setSettling(true)
    const finish = () => {
      settleFrameRef.current = null
      if (mountedRef.current) setSettling(false)
    }
    if (typeof requestAnimationFrame === 'undefined') {
      queueMicrotask(() => queueMicrotask(finish))
      return
    }
    settleFrameRef.current = requestAnimationFrame(() => {
      settleFrameRef.current = requestAnimationFrame(finish)
    })
  }, [endSettling])

  const releasePointer = useCallback((session: PointerSession | null) => {
    if (!session) return
    try {
      if (session.handle.hasPointerCapture?.(session.pointerId))
        session.handle.releasePointerCapture?.(session.pointerId)
    } catch {
      // The browser may have already released capture after node removal or native cancellation.
    }
  }, [])

  const cancel = useCallback(
    (message?: string, updateView = true) => {
      const pointer = pointerRef.current
      pointerRef.current = null
      keyboardRef.current = null
      releasePointer(pointer)
      stopAutoScroll()
      if (updateView && mountedRef.current) {
        setView(null)
        setIndicator(null)
        if (message) setAnnouncement(message)
      }
    },
    [releasePointer, stopAutoScroll],
  )

  const currentBaseline = useCallback(
    (): ReorderBaseline => ({
      scopeKey: scopeKeyRef.current,
      revision: revisionRef.current,
      keys: entriesRef.current.map((entry) => entry.key),
    }),
    [],
  )

  const sameBaseline = useCallback((baseline: ReorderBaseline) => {
    if (
      baseline.scopeKey !== scopeKeyRef.current ||
      !Object.is(baseline.revision, revisionRef.current)
    )
      return false
    const keys = entriesRef.current.map((entry) => entry.key)
    return (
      keys.length === baseline.keys.length &&
      keys.every((key, index) => key === baseline.keys[index])
    )
  }, [])

  const createSnapshot = useCallback(
    (sourceKey: string, baseline: ReorderBaseline = currentBaseline()): ReorderSnapshot | null => {
      if (!sameBaseline(baseline)) return null
      const entries = entriesRef.current
      const fromIndex = entries.findIndex((entry) => entry.key === sourceKey)
      const source = entries[fromIndex]
      if (!source || source.disabled || disabledRef.current || entries.length < 2) return null
      const sourceItem = registryRef.current.get(sourceKey)?.item
      if (!sourceItem) return null
      const layouts: Record<string, ReorderItemLayout> = {}
      for (const key of baseline.keys) {
        const item = registryRef.current.get(key)?.item
        if (!item) continue
        const rect = item.getBoundingClientRect()
        layouts[key] = {
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
        }
      }
      return {
        scopeKey: baseline.scopeKey,
        sourceKey,
        sourceLabel: source.label,
        keys: baseline.keys,
        revision: baseline.revision,
        fromIndex,
        projectedIndex: fromIndex,
        targetKey: sourceKey,
        placement: 'before',
        layouts,
        viewportOrigin: captureViewportOrigin(sourceItem),
      }
    },
    [currentBaseline, sameBaseline],
  )

  const sameSnapshot = useCallback((snapshot: ReorderSnapshot) => {
    if (
      snapshot.scopeKey !== scopeKeyRef.current ||
      !Object.is(snapshot.revision, revisionRef.current)
    )
      return false
    const currentKeys = entriesRef.current.map((entry) => entry.key)
    return (
      currentKeys.length === snapshot.keys.length &&
      currentKeys.every((key, index) => key === snapshot.keys[index])
    )
  }, [])

  const focusLogicalItem = useCallback((sourceKey: string, toIndex: number) => {
    const restore = () => {
      const byKey = registryRef.current.get(sourceKey)?.handle
      const fallbackKey = entriesRef.current[toIndex]?.key
      const fallback = fallbackKey ? registryRef.current.get(fallbackKey)?.handle : undefined
      const target = byKey ?? fallback
      target?.focus({ preventScroll: true })
      target?.scrollIntoView?.({ block: 'nearest', inline: 'nearest', behavior: 'auto' })
    }
    if (typeof requestAnimationFrame === 'undefined') queueMicrotask(restore)
    else requestAnimationFrame(restore)
  }, [])

  const projectionIndicator = useCallback(
    (snapshot: ReorderSnapshot, preview: ReorderPreviewProjection): IndicatorLayout | null => {
      if (snapshot.projectedIndex === snapshot.fromIndex) return null
      const placeholder = preview.placeholder
      const anchor = registryRef.current.get(snapshot.sourceKey)?.item
      if (!placeholder || !anchor) return null
      const gapOffset = placeholder.gapBefore / 2
      return {
        host: resolveDsPortalHost(anchor),
        style:
          orientation === 'vertical'
            ? {
                position: 'fixed',
                top: placeholder.top - gapOffset - 1,
                left: placeholder.left,
                width: placeholder.width,
                height: 2,
              }
            : {
                position: 'fixed',
                top: placeholder.top,
                left: placeholder.left - gapOffset - 1,
                width: 2,
                height: placeholder.height,
              },
      }
    },
    [orientation],
  )

  const commit = useCallback(
    (snapshot: ReorderSnapshot, input: 'pointer' | 'keyboard' | 'button') => {
      if (!sameSnapshot(snapshot)) {
        cancel('排序已取消：列表已更新。')
        return
      }
      const source = entriesRef.current.find((entry) => entry.key === snapshot.sourceKey)
      if (disabledRef.current || !source || source.disabled) {
        cancel('排序已取消：列表不可编辑。')
        return
      }
      const targetKey = snapshot.targetKey
      if (!targetKey || snapshot.projectedIndex === snapshot.fromIndex) {
        cancel()
        return
      }
      const target = entriesRef.current.find((entry) => entry.key === targetKey)
      if (!target || target.dropDisabled) {
        cancel('排序已取消：目标不可用。')
        return
      }
      const intent: DsReorderIntent = {
        adoptionId: props.adoptionId,
        scopeKey: snapshot.scopeKey,
        sourceKey: snapshot.sourceKey,
        targetKey,
        fromIndex: snapshot.fromIndex,
        toIndex: snapshot.projectedIndex,
        placement: snapshot.placement,
        input,
      }
      if (canReorderRef.current && !canReorderRef.current(intent)) {
        cancel('排序已取消：不能移动到该位置。')
        return
      }
      pointerRef.current = null
      keyboardRef.current = null
      stopAutoScroll()
      const accepted = onReorderRef.current(intent)
      if (accepted === false) {
        setView(null)
        setIndicator(null)
        setAnnouncement(`${snapshot.sourceLabel}顺序未改变。`)
        focusLogicalItem(snapshot.sourceKey, snapshot.fromIndex)
        return
      }
      beginSettling()
      setView(null)
      setIndicator(null)
      setAnnouncement(
        `已移动${snapshot.sourceLabel}到第 ${snapshot.projectedIndex + 1} 项，共 ${snapshot.keys.length} 项。`,
      )
      focusLogicalItem(snapshot.sourceKey, snapshot.projectedIndex)
    },
    [beginSettling, cancel, focusLogicalItem, sameSnapshot, stopAutoScroll],
  )

  const runAutoScroll = useCallback(() => {
    autoScrollFrameRef.current = null
    const session = pointerRef.current
    if (
      !session?.snapshot ||
      !session.validTarget ||
      props.autoScroll === false ||
      typeof requestAnimationFrame === 'undefined'
    )
      return
    const coordinate = orientation === 'vertical' ? session.lastClientY : session.lastClientX
    let selected: { owner: HTMLElement; direction: -1 | 1 } | null = null
    for (const owner of session.scrollOwners) {
      const rect = owner.getBoundingClientRect()
      const start = orientation === 'vertical' ? rect.top : rect.left
      const end = orientation === 'vertical' ? rect.bottom : rect.right
      const direction: -1 | 0 | 1 =
        coordinate - start < AUTO_SCROLL_EDGE_PX
          ? -1
          : end - coordinate < AUTO_SCROLL_EDGE_PX
            ? 1
            : 0
      if (!direction) continue
      const position = orientation === 'vertical' ? owner.scrollTop : owner.scrollLeft
      const extent = orientation === 'vertical' ? owner.scrollHeight : owner.scrollWidth
      const viewport = orientation === 'vertical' ? owner.clientHeight : owner.clientWidth
      if ((direction < 0 && position > 0) || (direction > 0 && position < extent - viewport)) {
        selected = { owner, direction }
        break
      }
    }
    if (!selected) return
    if (orientation === 'vertical')
      selected.owner.scrollTop += selected.direction * AUTO_SCROLL_STEP_PX
    else selected.owner.scrollLeft += selected.direction * AUTO_SCROLL_STEP_PX
    projectPointerRef.current(session, session.lastClientX, session.lastClientY)
  }, [orientation, props.autoScroll])

  const scheduleAutoScroll = useCallback(() => {
    if (
      autoScrollFrameRef.current === null &&
      props.autoScroll !== false &&
      typeof requestAnimationFrame !== 'undefined'
    )
      autoScrollFrameRef.current = requestAnimationFrame(runAutoScroll)
  }, [props.autoScroll, runAutoScroll])

  const projectPointer = useCallback(
    (session: PointerSession, clientX: number, clientY: number) => {
      const snapshot = session.snapshot
      if (!snapshot || typeof document.elementFromPoint !== 'function') return
      session.lastClientX = clientX
      session.lastClientY = clientY
      const pointerDelta = {
        x: clientX - session.startX,
        y: clientY - session.startY,
      }
      const viewportShift = currentViewportShift(snapshot.viewportOrigin)
      const hit = document.elementFromPoint(clientX, clientY)
      const scopeRoot = rootRef.current
      const visualParent = scopeRoot?.parentElement
      const ownedItem = ownedItemAtPoint(hit, scopeRoot)
      const hitScope = hit?.closest<HTMLElement>('[data-ds-reorder-scope]')
      const ownedVisualPoint = Boolean(
        hit &&
          scopeRoot &&
          (ownedItem || hit === scopeRoot || hit === visualParent || hitScope === scopeRoot),
      )
      const validGeometry = snapshotContainsPoint(
        snapshot,
        orientation,
        clientX,
        clientY,
        viewportShift,
      )
      const invalidate = () => {
        snapshot.projectedIndex = snapshot.fromIndex
        snapshot.targetKey = snapshot.sourceKey
        snapshot.placement = 'before'
        session.validTarget = false
        session.scrollAnchor = undefined
        session.scrollOwners = []
        stopAutoScroll()
        const preview = projectReorderPreview(
          snapshot,
          strategy,
          orientation,
          snapshot.fromIndex,
          pointerDelta,
          viewportShift,
        )
        setView({
          sourceKey: snapshot.sourceKey,
          projectedIndex: -1,
          input: 'pointer',
          offsets: preview.offsets,
        })
        setIndicator(null)
      }
      if (!ownedVisualPoint || !validGeometry) {
        invalidate()
        return
      }
      const coordinate = orientation === 'vertical' ? clientY : clientX
      const projectedIndex =
        strategy === 'swap'
          ? swapIndexAtCoordinate(snapshot, orientation, coordinate, viewportShift)
          : insertIndexAtCoordinate(snapshot, orientation, coordinate, viewportShift)
      const targetKey = snapshot.keys[projectedIndex] ?? snapshot.sourceKey
      const targetEntry = entriesRef.current[projectedIndex]
      if (projectedIndex !== snapshot.fromIndex && targetEntry?.dropDisabled) {
        invalidate()
        return
      }
      const placement = projectedIndex > snapshot.fromIndex ? 'after' : 'before'
      snapshot.projectedIndex = projectedIndex
      snapshot.targetKey = targetKey
      snapshot.placement = placement
      session.validTarget = true
      const targetItem = registryRef.current.get(targetKey)?.item
      if (targetItem && session.scrollAnchor !== targetItem) {
        session.scrollAnchor = targetItem
        session.scrollOwners = scrollOwners(targetItem, orientation, scopeRoot)
      }
      const preview = projectReorderPreview(
        snapshot,
        strategy,
        orientation,
        projectedIndex,
        pointerDelta,
        viewportShift,
      )
      setView({
        sourceKey: snapshot.sourceKey,
        projectedIndex,
        input: 'pointer',
        offsets: preview.offsets,
      })
      setIndicator(projectionIndicator(snapshot, preview))
      scheduleAutoScroll()
    },
    [orientation, projectionIndicator, scheduleAutoScroll, stopAutoScroll, strategy],
  )

  projectPointerRef.current = projectPointer

  const pointerDown = useCallback(
    (key: string, event: ReactPointerEvent<HTMLButtonElement>) => {
      const entry = entriesRef.current.find((candidate) => candidate.key === key)
      if (
        event.button !== 0 ||
        event.isPrimary === false ||
        disabledRef.current ||
        entry?.disabled ||
        entriesRef.current.length < 2
      )
        return
      if (composingRef.current) {
        event.preventDefault()
        return
      }
      cancel()
      endSettling()
      const session: PointerSession = {
        sourceKey: key,
        pointerId: event.pointerId,
        pointerType: event.pointerType,
        startX: event.clientX,
        startY: event.clientY,
        handle: event.currentTarget,
        validTarget: false,
        lastClientX: event.clientX,
        lastClientY: event.clientY,
        scrollOwners: [],
      }
      pointerRef.current = session
      event.currentTarget.focus({ preventScroll: true })
      try {
        event.currentTarget.setPointerCapture?.(event.pointerId)
      } catch {
        cancel('排序已取消：无法捕获指针。')
        return
      }
      queueMicrotask(() => {
        if (pointerRef.current !== session) return
        session.baseline = currentBaseline()
        if (!session.baseline.keys.includes(session.sourceKey)) cancel('排序已取消：列表已更新。')
      })
    },
    [cancel, currentBaseline, endSettling],
  )

  const pointerMove = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = pointerRef.current
      if (!session || session.pointerId !== event.pointerId) return
      if (!session.snapshot) {
        const distance = Math.hypot(event.clientX - session.startX, event.clientY - session.startY)
        if (distance < POINTER_THRESHOLD_PX) return
        if (!session.baseline) return
        const snapshot = createSnapshot(session.sourceKey, session.baseline)
        if (!snapshot) {
          cancel()
          return
        }
        session.snapshot = snapshot
        setView({
          sourceKey: snapshot.sourceKey,
          projectedIndex: snapshot.fromIndex,
          input: 'pointer',
          offsets: {},
        })
      }
      event.preventDefault()
      projectPointer(session, event.clientX, event.clientY)
    },
    [cancel, createSnapshot, projectPointer],
  )

  const pointerUp = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      const session = pointerRef.current
      if (!session || session.pointerId !== event.pointerId) return
      if (session.snapshot) projectPointer(session, event.clientX, event.clientY)
      const snapshot = session.snapshot
      pointerRef.current = null
      releasePointer(session)
      if (snapshot && session.validTarget) commit(snapshot, 'pointer')
      else cancel()
    },
    [cancel, commit, projectPointer, releasePointer],
  )

  const pointerCancel = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (pointerRef.current?.pointerId === event.pointerId) cancel('排序已取消。')
    },
    [cancel],
  )

  const lostPointerCapture = useCallback(
    (event: ReactPointerEvent<HTMLButtonElement>) => {
      if (pointerRef.current?.pointerId === event.pointerId) cancel('排序已取消。')
    },
    [cancel],
  )

  const showKeyboardTarget = useCallback(
    (snapshot: ReorderSnapshot) => {
      const viewportShift = currentViewportShift(snapshot.viewportOrigin)
      const preview = projectReorderPreview(
        snapshot,
        strategy,
        orientation,
        snapshot.projectedIndex,
        undefined,
        viewportShift,
      )
      setView({
        sourceKey: snapshot.sourceKey,
        projectedIndex: snapshot.projectedIndex,
        input: 'keyboard',
        offsets: preview.offsets,
      })
      setIndicator(projectionIndicator(snapshot, preview))
      setAnnouncement(
        `${snapshot.sourceLabel}将移动到第 ${snapshot.projectedIndex + 1} 项，共 ${snapshot.keys.length} 项。`,
      )
    },
    [orientation, projectionIndicator, strategy],
  )

  const keyDown = useCallback(
    (key: string, event: ReactKeyboardEvent<HTMLButtonElement>) => {
      if ((event.key === 'Enter' || event.key === ' ') && event.repeat) {
        event.preventDefault()
        return
      }
      const active = keyboardRef.current
      if (!active) {
        if (event.key !== 'Enter' && event.key !== ' ') return
        const snapshot = createSnapshot(key)
        if (!snapshot) return
        event.preventDefault()
        cancel()
        keyboardRef.current = snapshot
        showKeyboardTarget(snapshot)
        return
      }
      if (active.sourceKey !== key) {
        cancel('排序已取消。')
        return
      }
      if (event.key === 'Escape') {
        event.preventDefault()
        cancel('排序已取消。')
        return
      }
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        commit(active, 'keyboard')
        return
      }
      const backward = orientation === 'vertical' ? 'ArrowUp' : 'ArrowLeft'
      const forward = orientation === 'vertical' ? 'ArrowDown' : 'ArrowRight'
      let next = active.projectedIndex
      if (event.key === backward)
        next = moveTargetIndex(entriesRef.current, active.projectedIndex, 'backward')
      else if (event.key === forward)
        next = moveTargetIndex(entriesRef.current, active.projectedIndex, 'forward')
      else if (event.key === 'Home')
        next = moveTargetIndex(entriesRef.current, active.projectedIndex, 'first')
      else if (event.key === 'End')
        next = moveTargetIndex(entriesRef.current, active.projectedIndex, 'last')
      else return
      event.preventDefault()
      active.projectedIndex = Math.max(0, Math.min(active.keys.length - 1, next))
      active.targetKey = active.keys[active.projectedIndex] ?? active.sourceKey
      active.placement = active.projectedIndex > active.fromIndex ? 'after' : 'before'
      showKeyboardTarget(active)
    },
    [cancel, commit, createSnapshot, orientation, showKeyboardTarget],
  )

  const blur = useCallback(
    (key: string) => {
      if (keyboardRef.current?.sourceKey === key) cancel('排序已取消。')
    },
    [cancel],
  )

  const move = useCallback(
    (key: string, direction: DsReorderMoveDirection) => {
      const snapshot = createSnapshot(key)
      if (!snapshot) return
      const next = moveTargetIndex(entriesRef.current, snapshot.fromIndex, direction)
      if (next === snapshot.fromIndex) return
      snapshot.projectedIndex = next
      snapshot.targetKey = snapshot.keys[next] ?? snapshot.sourceKey
      snapshot.placement = next > snapshot.fromIndex ? 'after' : 'before'
      commit(snapshot, 'button')
    },
    [commit, createSnapshot],
  )

  const register = useCallback(
    (key: string, item: HTMLElement | null, handle: HTMLButtonElement | null) => {
      if (item && handle) registryRef.current.set(key, { item, handle })
      else registryRef.current.delete(key)
    },
    [],
  )

  const signature = props.entries.map((entry) => entry.key).join('\u0000')
  useEffect(() => {
    const pointer = pointerRef.current
    const snapshot = pointer?.snapshot ?? keyboardRef.current
    if (
      (pointer?.baseline && !sameBaseline(pointer.baseline)) ||
      (snapshot && !sameSnapshot(snapshot))
    )
      cancel('排序已取消：列表已更新。')
  }, [cancel, props.revision, sameBaseline, sameSnapshot, signature])

  const previousScopeRef = useRef(props.scopeKey)
  useEffect(() => {
    if (previousScopeRef.current !== props.scopeKey) {
      previousScopeRef.current = props.scopeKey
      cancel('排序已取消：已切换对象。')
    }
  }, [cancel, props.scopeKey])

  useEffect(() => {
    if (props.disabled && (pointerRef.current || keyboardRef.current))
      cancel('排序已取消：列表不可编辑。')
  }, [cancel, props.disabled])

  useEffect(() => {
    mountedRef.current = true
    const onBlur = () => {
      if (pointerRef.current || keyboardRef.current) cancel('排序已取消。')
    }
    const onVisibility = () => {
      if (document.hidden && (pointerRef.current || keyboardRef.current)) cancel('排序已取消。')
    }
    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && (pointerRef.current || keyboardRef.current)) {
        event.preventDefault()
        event.stopPropagation()
        cancel('排序已取消。')
      }
    }
    window.addEventListener('blur', onBlur)
    window.addEventListener('keydown', onEscape, true)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('blur', onBlur)
      window.removeEventListener('keydown', onEscape, true)
      document.removeEventListener('visibilitychange', onVisibility)
      mountedRef.current = false
      endSettling(false)
      cancel(undefined, false)
    }
  }, [cancel, endSettling])

  const context: ReorderContextValue = {
    entries: props.entries,
    view,
    disabled: Boolean(props.disabled),
    orientation,
    instructionsId,
    register,
    pointerDown,
    pointerMove,
    pointerUp,
    pointerCancel,
    lostPointerCapture,
    keyDown,
    blur,
    move,
  }

  return (
    <ReorderContext.Provider value={context}>
      <div
        ref={rootRef}
        className="ds-reorder-collection"
        data-ds-reorder-adoption={props.adoptionId}
        data-ds-reorder-scope={props.scopeKey}
        data-orientation={orientation}
        data-reorder-settling={settling || undefined}
        onCompositionStartCapture={() => {
          composingRef.current = true
        }}
        onCompositionEndCapture={() => {
          composingRef.current = false
        }}
      >
        {props.children}
        <span id={instructionsId} className="ds-reorder-live">
          按空格或回车拿起；用方向键、Home 或 End 移动；再次按空格或回车放下；按 Escape 取消。
        </span>
        <span className="ds-reorder-live" aria-live="polite" aria-atomic="true">
          {announcement}
        </span>
      </div>
      {indicator && typeof document !== 'undefined'
        ? createPortal(
            <div
              className="ds-reorder-indicator"
              data-orientation={orientation}
              aria-hidden="true"
              style={indicator.style}
            />,
            indicator.host,
          )
        : null}
    </ReorderContext.Provider>
  )
}

export function DsReorderItem(props: {
  itemKey: string
  children: ReactNode
  className?: string
  contentClassName?: string
  handleClassName?: string
  layout?: 'inline' | 'overlay'
  as?: 'div' | 'li'
  role?: string
}) {
  const context = useContext(ReorderContext)
  if (!context) throw new Error('DsReorderItem must be rendered inside DsReorderCollection')
  const itemRef = useRef<HTMLElement>(null)
  const handleRef = useRef<HTMLButtonElement>(null)
  const entryIndex = context.entries.findIndex((entry) => entry.key === props.itemKey)
  const entry = context.entries[entryIndex]
  if (!entry)
    throw new Error(`DsReorderItem key is not registered in its collection: ${props.itemKey}`)
  const active = context.view?.sourceKey === props.itemKey
  const target = context.view?.projectedIndex === entryIndex
  const disabled = Boolean(context.disabled || entry.disabled || context.entries.length < 2)
  const previewOffset = context.view?.offsets[props.itemKey]
  const previewMoving = Boolean(
    previewOffset && (Math.abs(previewOffset.x) > 0.01 || Math.abs(previewOffset.y) > 0.01),
  )
  const pointerSource = Boolean(active && context.view?.input === 'pointer')

  const register = context.register
  useLayoutEffect(() => {
    register(props.itemKey, itemRef.current, handleRef.current)
    return () => register(props.itemKey, null, null)
  }, [props.itemKey, register])

  const Item = props.as ?? 'div'

  return (
    <Item
      ref={(node: (HTMLDivElement & HTMLLIElement) | null) => {
        itemRef.current = node
      }}
      role={props.role}
      className={dsClasses('ds-reorder-item', props.className)}
      data-ds-reorder-item="true"
      data-item-key={props.itemKey}
      data-layout={props.layout ?? 'inline'}
      data-picked={active || undefined}
      data-drop-target={target || undefined}
      data-reorder-preview={previewMoving || undefined}
      data-drag-preview={pointerSource || undefined}
      style={
        previewOffset
          ? { transform: `translate3d(${previewOffset.x}px, ${previewOffset.y}px, 0)` }
          : undefined
      }
    >
      <span className="ds-reorder-item__rail" data-ds-reorder-rail="true">
        <button
          ref={handleRef}
          type="button"
          className={dsClasses('ds-reorder-handle', props.handleClassName)}
          data-ds-reorder-handle="true"
          data-reorder-key={props.itemKey}
          data-dragging={active && context.view?.input === 'pointer' ? 'true' : undefined}
          aria-label={`调整${entry.label}顺序，第 ${entryIndex + 1} 项，共 ${context.entries.length} 项`}
          aria-describedby={context.instructionsId}
          aria-roledescription="排序手柄"
          aria-pressed={active}
          disabled={disabled}
          onPointerDown={(event) => context.pointerDown(props.itemKey, event)}
          onPointerMove={context.pointerMove}
          onPointerUp={context.pointerUp}
          onPointerCancel={context.pointerCancel}
          onLostPointerCapture={context.lostPointerCapture}
          onKeyDown={(event) => context.keyDown(props.itemKey, event)}
          onBlur={() => context.blur(props.itemKey)}
        >
          <DsIcon name="grip" />
        </button>
      </span>
      <div className={dsClasses('ds-reorder-item__content', props.contentClassName)}>
        {props.children}
      </div>
    </Item>
  )
}

export function DsReorderMoveButton(props: {
  itemKey: string
  direction: DsReorderMoveDirection
  label?: string
  className?: string
}) {
  const context = useContext(ReorderContext)
  if (!context) throw new Error('DsReorderMoveButton must be rendered inside DsReorderCollection')
  const index = context.entries.findIndex((entry) => entry.key === props.itemKey)
  const entry = context.entries[index]
  if (!entry)
    throw new Error(`DsReorderMoveButton key is not registered in its collection: ${props.itemKey}`)
  const targetIndex = moveTargetIndex(context.entries, index, props.direction)
  const target = context.entries[targetIndex]
  const disabled = Boolean(
    context.disabled ||
      entry.disabled ||
      index < 0 ||
      targetIndex < 0 ||
      targetIndex >= context.entries.length ||
      targetIndex === index ||
      target?.dropDisabled,
  )
  const isBackward = props.direction === 'backward' || props.direction === 'first'
  const label =
    props.label ??
    (props.direction === 'first'
      ? `将${entry.label}移到最前`
      : props.direction === 'last'
        ? `将${entry.label}移到最后`
        : `${isBackward ? '上移' : '下移'}${entry.label}`)
  return (
    <DsIconButton
      className={props.className}
      size="compact"
      variant="secondary"
      label={label}
      icon={
        context.orientation === 'horizontal'
          ? isBackward
            ? 'chevron-left'
            : 'chevron-right'
          : isBackward
            ? 'chevron-up'
            : 'chevron-down'
      }
      disabled={disabled}
      onClick={() => context.move(props.itemKey, props.direction)}
    />
  )
}

/**
 * Stable editor-local tokens for ordered values that do not own schema IDs.
 * Object identity is preserved across ordinary array moves; an optional identity keeps tokens stable
 * across immutable record replacement. No token is serialized.
 */
export function useDsReorderKeys<T>(
  items: readonly T[],
  identity: (item: T) => string | number | undefined = () => undefined,
): DsReorderKeysController {
  const stateRef = useRef<Array<{ item: T; identity?: string | number; key: string }>>([])
  const nextIdRef = useRef(1)
  const [, setResetVersion] = useState(0)
  const previous = stateRef.current
  const unused = new Set(previous)
  const identityCounts = new Map<string | number, number>()
  const previousIdentityCounts = new Map<string | number, number>()
  const itemIdentities = items.map((item) => identity(item))
  for (const value of itemIdentities) {
    if (value !== undefined) identityCounts.set(value, (identityCounts.get(value) ?? 0) + 1)
  }
  for (const entry of previous) {
    if (entry.identity !== undefined)
      previousIdentityCounts.set(
        entry.identity,
        (previousIdentityCounts.get(entry.identity) ?? 0) + 1,
      )
  }
  const assigned = new Array<(typeof previous)[number] | undefined>(items.length)
  const assign = (itemIndex: number, entry: (typeof previous)[number] | undefined): void => {
    if (!entry || !unused.has(entry)) return
    assigned[itemIndex] = entry
    unused.delete(entry)
  }
  // Reserve every exact object/value match before any positional fallback can steal its token.
  items.forEach((item, itemIndex) =>
    assign(
      itemIndex,
      previous.find((entry) => unused.has(entry) && Object.is(entry.item, item)),
    ),
  )
  // Immutable record replacement can opt into a unique semantic identity.
  items.forEach((_item, itemIndex) => {
    if (assigned[itemIndex]) return
    const itemIdentity = itemIdentities[itemIndex]
    if (
      itemIdentity === undefined ||
      identityCounts.get(itemIdentity) !== 1 ||
      previousIdentityCounts.get(itemIdentity) !== 1
    )
      return
    assign(
      itemIndex,
      previous.find((entry) => unused.has(entry) && entry.identity === itemIdentity),
    )
  })
  // Only genuinely unresolved values fall back to their old position, then remaining order.
  items.forEach((_item, itemIndex) => {
    if (assigned[itemIndex]) return
    assign(itemIndex, previous[itemIndex])
    if (!assigned[itemIndex]) assign(itemIndex, unused.values().next().value)
  })
  const next = items.map((item, itemIndex) => {
    const matched = assigned[itemIndex]
    return {
      item,
      identity: itemIdentities[itemIndex],
      key: matched?.key ?? `reorder-${nextIdRef.current++}`,
    }
  })
  stateRef.current = next
  const move = useCallback(
    (
      intent: Pick<DsReorderIntent, 'fromIndex' | 'toIndex'>,
      strategy: DsReorderStrategy = 'insert',
    ) => {
      const current = [...stateRef.current]
      if (
        intent.fromIndex === intent.toIndex ||
        intent.fromIndex < 0 ||
        intent.toIndex < 0 ||
        intent.fromIndex >= current.length ||
        intent.toIndex >= current.length
      )
        return
      if (strategy === 'swap') {
        ;[current[intent.fromIndex], current[intent.toIndex]] = [
          current[intent.toIndex]!,
          current[intent.fromIndex]!,
        ]
      } else {
        const [moved] = current.splice(intent.fromIndex, 1)
        if (!moved) return
        current.splice(intent.toIndex, 0, moved)
      }
      stateRef.current = current
    },
    [],
  )
  const remove = useCallback((index: number) => {
    if (index < 0 || index >= stateRef.current.length) return
    const current = [...stateRef.current]
    current.splice(index, 1)
    stateRef.current = current
  }, [])
  const reset = useCallback(() => {
    stateRef.current = []
    setResetVersion((version) => version + 1)
  }, [])
  return { keys: next.map((entry) => entry.key), move, remove, reset }
}
