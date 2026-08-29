// @vitest-environment jsdom
import { act, StrictMode, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import {
  DsReorderCollection,
  DsReorderItem,
  DsReorderMoveButton,
  reorderDsItems,
  sameDsSerializableValue,
  type DsReorderIntent,
  useDsReorderKeys,
} from './reorder.js'

const entries = [
  { key: 'a', label: '甲' },
  { key: 'b', label: '乙' },
  { key: 'c', label: '丙' },
]

function Harness(props: {
  onReorder(intent: DsReorderIntent): void
  revision?: number
  disabledKey?: string
  dropDisabledKey?: string
  disabled?: boolean
  scopeKey?: string
  fallback?: boolean
  canReorder?(intent: DsReorderIntent): boolean
  orientation?: 'vertical' | 'horizontal'
  strategy?: 'insert' | 'swap'
}) {
  return (
    <DsReorderCollection
      adoptionId="test/list"
      scopeKey={props.scopeKey ?? 'test-list'}
      entries={entries.map((entry) => ({
        ...entry,
        disabled: entry.key === props.disabledKey,
        dropDisabled: entry.key === props.dropDisabledKey,
      }))}
      revision={props.revision ?? 1}
      disabled={props.disabled}
      onReorder={props.onReorder}
      canReorder={props.canReorder}
      orientation={props.orientation}
      strategy={props.strategy}
    >
      <div data-test-reorder-wrapper="true">
        {entries.map((entry) => (
          <DsReorderItem itemKey={entry.key} key={entry.key}>
            <div data-content={entry.key}>{entry.label}内容</div>
            {props.fallback ? (
              <DsReorderMoveButton itemKey={entry.key} direction="forward" />
            ) : null}
          </DsReorderItem>
        ))}
      </div>
    </DsReorderCollection>
  )
}

function StatefulHarness(props: { onReorder(intent: DsReorderIntent): void }) {
  const [items, setItems] = useState(entries)
  return (
    <DsReorderCollection
      adoptionId="test/stateful"
      scopeKey="test-stateful"
      entries={items}
      revision={items.map((item) => item.key).join('|')}
      onReorder={(intent) => {
        props.onReorder(intent)
        setItems((current) => [...reorderDsItems(current, intent)])
      }}
    >
      {items.map((entry) => (
        <DsReorderItem itemKey={entry.key} key={entry.key}>
          <div data-content={entry.key}>{entry.label}内容</div>
        </DsReorderItem>
      ))}
    </DsReorderCollection>
  )
}

interface TokenItem {
  occurrence: string
  value: string
}

function moveAt<T>(items: readonly T[], fromIndex: number, toIndex: number): T[] {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  if (moved !== undefined) next.splice(toIndex, 0, moved)
  return next
}

function TokenHarness() {
  const [items, setItems] = useState<TokenItem[]>([
    { occurrence: 'first-a', value: 'a' },
    { occurrence: 'second-a', value: 'a' },
    { occurrence: 'b', value: 'b' },
  ])
  const tokens = useDsReorderKeys(items, (item) => item.value)
  return (
    <>
      <button
        type="button"
        data-clone="true"
        onClick={() => setItems((current) => current.map((item) => ({ ...item })))}
      >
        clone
      </button>
      <button
        type="button"
        data-insert="true"
        onClick={() =>
          setItems((current) => [{ occurrence: 'inserted', value: 'inserted' }, ...current])
        }
      >
        insert
      </button>
      <button
        type="button"
        data-remove-inserted="true"
        onClick={() =>
          setItems((current) => current.filter((item) => item.occurrence !== 'inserted'))
        }
      >
        remove inserted
      </button>
      <button
        type="button"
        data-edit-first="true"
        onClick={() =>
          setItems((current) =>
            current.map((item, index) => ({
              ...item,
              value: index === 0 ? 'edited' : item.value,
            })),
          )
        }
      >
        edit first
      </button>
      <button
        type="button"
        data-remove-first="true"
        onClick={() => {
          tokens.remove(0)
          setItems((current) => current.slice(1))
        }}
      >
        remove first
      </button>
      <button
        type="button"
        data-retain-second="true"
        onClick={() => {
          tokens.retain(1)
          setItems((current) => (current[1] ? [{ ...current[1] }] : []))
        }}
      >
        retain second
      </button>
      <button type="button" data-reset="true" onClick={tokens.reset}>
        reset tokens
      </button>
      <DsReorderCollection
        adoptionId="test/repeated-token"
        scopeKey="repeat"
        entries={items.map((item, index) => ({ key: tokens.keys[index]!, label: item.occurrence }))}
        revision={items.map((item) => item.occurrence).join('|')}
        onReorder={(intent) => {
          tokens.move(intent)
          setItems((current) =>
            moveAt(current, intent.fromIndex, intent.toIndex).map((item) => ({ ...item })),
          )
        }}
      >
        {items.map((item, index) => (
          <DsReorderItem itemKey={tokens.keys[index]!} key={tokens.keys[index]!}>
            <span data-occurrence={item.occurrence}>{item.value}</span>
            <DsReorderMoveButton itemKey={tokens.keys[index]!} direction="last" />
          </DsReorderItem>
        ))}
      </DsReorderCollection>
    </>
  )
}

function pointerEvent(
  type: string,
  options: { x: number; y: number; pointerId?: number; pointerType?: string },
): Event {
  const event = new MouseEvent(type, {
    bubbles: true,
    cancelable: true,
    button: 0,
    clientX: options.x,
    clientY: options.y,
  })
  Object.defineProperties(event, {
    pointerId: { value: options.pointerId ?? 7 },
    pointerType: { value: options.pointerType ?? 'mouse' },
    isPrimary: { value: true },
  })
  return event
}

describe('DsReorderCollection', () => {
  let root: Root
  let host: HTMLDivElement
  let elementFromPoint: typeof document.elementFromPoint
  let pointerCaptureDescriptors: Array<[string, PropertyDescriptor | undefined]>

  beforeEach(() => {
    ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
    host = document.createElement('div')
    document.body.append(host)
    root = createRoot(host)
    elementFromPoint = document.elementFromPoint
    pointerCaptureDescriptors = [
      [
        'setPointerCapture',
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'setPointerCapture'),
      ],
      [
        'releasePointerCapture',
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'releasePointerCapture'),
      ],
      [
        'hasPointerCapture',
        Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'hasPointerCapture'),
      ],
    ]
    HTMLElement.prototype.setPointerCapture = vi.fn()
    HTMLElement.prototype.releasePointerCapture = vi.fn()
    HTMLElement.prototype.hasPointerCapture = vi.fn(() => true)
  })

  afterEach(async () => {
    document.elementFromPoint = elementFromPoint
    for (const [name, descriptor] of pointerCaptureDescriptors) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor)
      else delete (HTMLElement.prototype as unknown as Record<string, unknown>)[name]
    }
    await act(async () => root.unmount())
    host.remove()
  })

  test('renders one first-slot handle per item inside the item boundary without nesting controls', async () => {
    await act(async () => root.render(<Harness onReorder={() => {}} />))
    const rows = host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')
    expect(rows).toHaveLength(3)
    for (const row of rows) {
      expect(row.firstElementChild?.getAttribute('data-ds-reorder-rail')).toBe('true')
      expect(row.querySelector('[data-ds-reorder-handle]')?.closest('[data-content]')).toBeNull()
    }
    expect(host.querySelector('[data-reorder-key="a"]')?.getAttribute('aria-label')).toBe(
      '调整甲顺序，第 1 项，共 3 项',
    )
  })

  test('keyboard pick, move, Home/End, drop and cancel commit at most once with live feedback', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!

    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
    })
    expect(handle.getAttribute('aria-pressed')).toBe('true')
    expect(onReorder).not.toHaveBeenCalled()
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('第 3 项，共 3 项')

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
      handle.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true, repeat: true }),
      )
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(onReorder.mock.calls[0]?.[0]).toMatchObject({
      sourceKey: 'a',
      targetKey: 'c',
      fromIndex: 0,
      toIndex: 2,
      input: 'keyboard',
    })
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('已移动甲到第 3 项')
    expect(handle.getAttribute('aria-pressed')).toBe('false')

    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(handle.getAttribute('aria-pressed')).toBe('false')

    const lastHandle = host.querySelector<HTMLButtonElement>('[data-reorder-key="c"]')!
    await act(async () => {
      lastHandle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      lastHandle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true }))
      lastHandle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
    })
    expect(onReorder).toHaveBeenCalledTimes(2)
    expect(onReorder.mock.calls[1]?.[0]).toMatchObject({
      sourceKey: 'c',
      targetKey: 'a',
      fromIndex: 2,
      toIndex: 0,
      input: 'keyboard',
    })
  })

  test('domain-level canonical no-op returns false, announces unchanged and skips settle motion', async () => {
    const onReorder = vi.fn(() => false)
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain('甲顺序未改变')
    expect(host.querySelector('[data-reorder-settling]')).toBeNull()
    expect(host.querySelector('[data-picked="true"]')).toBeNull()
  })

  test('horizontal keys, disabled targets, canReorder and fallback buttons share target resolution', async () => {
    const onReorder = vi.fn()
    const canReorder = vi.fn((_intent: DsReorderIntent) => false)
    await act(async () =>
      root.render(
        <Harness
          onReorder={onReorder}
          orientation="horizontal"
          dropDisabledKey="b"
          fallback
          canReorder={canReorder}
        />,
      ),
    )
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    await act(async () => {
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(canReorder).toHaveBeenCalledOnce()
    expect(canReorder.mock.calls[0]?.[0]).toMatchObject({ fromIndex: 0, toIndex: 2 })
    expect(onReorder).not.toHaveBeenCalled()

    const move = host.querySelector<HTMLButtonElement>('[aria-label="下移甲"]')!
    expect(move.disabled).toBe(false)
    expect(move.classList).toContain('ds-icon-button--secondary')
    await act(async () => move.click())
    expect(canReorder).toHaveBeenCalledTimes(2)
    expect(canReorder.mock.calls[1]?.[0]).toMatchObject({ fromIndex: 0, toIndex: 2 })
    expect(onReorder).not.toHaveBeenCalled()
  })

  test.each([
    'mouse',
    'touch',
    'pen',
  ])('%s pointer hover stays local and valid drop commits once', async (pointerType) => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const target = host.querySelector<HTMLElement>('[data-ds-reorder-item][data-item-key="c"]')!
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 80,
      top: 80,
      left: 0,
      right: 300,
      bottom: 120,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    document.elementFromPoint = vi.fn(() => target)

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10, pointerType }))
    })
    expect(HTMLElement.prototype.setPointerCapture).toHaveBeenCalledWith(7)
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 12, y: 12, pointerType }))
      for (let index = 0; index < 20; index += 1)
        handle.dispatchEvent(pointerEvent('pointermove', { x: 20 + index, y: 110, pointerType }))
    })
    expect(onReorder).not.toHaveBeenCalled()
    expect(handle.getAttribute('data-dragging')).toBe('true')

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 40, y: 110, pointerType }))
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(onReorder.mock.calls[0]?.[0]).toMatchObject({
      sourceKey: 'a',
      targetKey: 'c',
      fromIndex: 0,
      toIndex: 2,
      input: 'pointer',
    })
    expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalledWith(7)
  })

  test('one live insertion gap stays stable while peers reflow, scroll shifts it, and no-op stays dark', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="c"]')!
    const first = host.querySelector<HTMLElement>('[data-item-key="a"]')!
    const second = host.querySelector<HTMLElement>('[data-item-key="b"]')!
    const last = host.querySelector<HTMLElement>('[data-item-key="c"]')!
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 40,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    vi.spyOn(second, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 60,
      top: 60,
      left: 0,
      right: 300,
      bottom: 100,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    vi.spyOn(last, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 120,
      top: 120,
      left: 0,
      right: 300,
      bottom: 160,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    // display:contents gaps hit the visual parent, not either adjacent item.
    const wrapper = host.querySelector<HTMLElement>('[data-test-reorder-wrapper]')!
    document.elementFromPoint = vi.fn(() => wrapper)

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 130 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 35 }))
    })
    const firstBoundary = document.body.querySelector<HTMLElement>('.ds-reorder-indicator')!
    expect(firstBoundary.style.top).toBe('49px')
    expect(document.body.querySelectorAll('.ds-reorder-indicator')).toHaveLength(1)
    expect(second.style.transform).toBe('translate3d(0px, 60px, 0)')
    expect(last.style.transform).toBe('translate3d(10px, -95px, 0)')
    expect(second.dataset.reorderPreview).toBe('true')
    expect(last.dataset.dragPreview).toBe('true')
    expect(onReorder).not.toHaveBeenCalled()

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 65 }))
    })
    const sameBoundary = document.body.querySelector<HTMLElement>('.ds-reorder-indicator')!
    expect(sameBoundary.style.top).toBe('49px')
    expect(document.body.querySelectorAll('.ds-reorder-indicator')).toHaveLength(1)
    expect(second.style.transform).toBe('translate3d(0px, 60px, 0)')
    expect(last.style.transform).toBe('translate3d(10px, -65px, 0)')
    expect(onReorder).not.toHaveBeenCalled()

    host.scrollTop = 10
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 65 }))
    })
    expect(document.body.querySelector<HTMLElement>('.ds-reorder-indicator')!.style.top).toBe(
      '39px',
    )
    expect(second.style.transform).toBe('translate3d(0px, 60px, 0)')
    expect(last.style.transform).toBe('translate3d(10px, -55px, 0)')
    expect(onReorder).not.toHaveBeenCalled()

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointercancel', { x: 20, y: 65 }))
    })
    host.scrollTop = 0
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 130 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 150 }))
    })
    expect(document.body.querySelector('.ds-reorder-indicator')).toBeNull()
    expect(first.dataset.reorderPreview).toBeUndefined()
    expect(second.dataset.reorderPreview).toBeUndefined()
    expect(last.style.transform).toBe('translate3d(10px, 20px, 0)')
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 150 }))
    })
    expect(onReorder).not.toHaveBeenCalled()
  })

  test('swap preview moves only the source and exchanged peer before one final commit', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} strategy="swap" />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const first = host.querySelector<HTMLElement>('[data-item-key="a"]')!
    const second = host.querySelector<HTMLElement>('[data-item-key="b"]')!
    const last = host.querySelector<HTMLElement>('[data-item-key="c"]')!
    for (const [element, top] of [
      [first, 0],
      [second, 60],
      [last, 120],
    ] as const) {
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: top,
        top,
        left: 0,
        right: 300,
        bottom: top + 40,
        width: 300,
        height: 40,
        toJSON: () => ({}),
      })
    }
    const wrapper = host.querySelector<HTMLElement>('[data-test-reorder-wrapper]')!
    document.elementFromPoint = vi.fn(() => wrapper)

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 130 }))
    })

    expect(first.style.transform).toBe('translate3d(10px, 120px, 0)')
    expect(second.style.transform).toBe('translate3d(0px, 0px, 0)')
    expect(last.style.transform).toBe('translate3d(0px, -120px, 0)')
    expect(onReorder).not.toHaveBeenCalled()

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 130 }))
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(onReorder.mock.calls[0]?.[0]).toMatchObject({
      sourceKey: 'a',
      targetKey: 'c',
      fromIndex: 0,
      toIndex: 2,
      input: 'pointer',
    })
  })

  test('lost capture, blur, hidden, active disable and unmount cancel with zero commands', async () => {
    const onReorder = vi.fn()
    const start = async (): Promise<HTMLButtonElement> => {
      await act(async () => root.render(<Harness onReorder={onReorder} />))
      const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
      const target = host.querySelector<HTMLElement>('[data-item-key="c"]')!
      vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 80,
        top: 80,
        left: 0,
        right: 300,
        bottom: 120,
        width: 300,
        height: 40,
        toJSON: () => ({}),
      })
      document.elementFromPoint = vi.fn(() => target)
      await act(async () => {
        handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
      })
      await act(async () => {
        handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 110 }))
      })
      expect(handle.getAttribute('data-dragging')).toBe('true')
      return handle
    }

    let handle = await start()
    await act(async () => {
      handle.dispatchEvent(pointerEvent('lostpointercapture', { x: 20, y: 110 }))
    })
    expect(handle.getAttribute('data-dragging')).toBeNull()

    handle = await start()
    await act(async () => window.dispatchEvent(new Event('blur')))
    expect(handle.getAttribute('data-dragging')).toBeNull()

    handle = await start()
    const hiddenDescriptor = Object.getOwnPropertyDescriptor(document, 'hidden')
    Object.defineProperty(document, 'hidden', { configurable: true, value: true })
    await act(async () => document.dispatchEvent(new Event('visibilitychange')))
    if (hiddenDescriptor) Object.defineProperty(document, 'hidden', hiddenDescriptor)
    else delete (document as unknown as { hidden?: boolean }).hidden
    expect(handle.getAttribute('data-dragging')).toBeNull()

    handle = await start()
    await act(async () => root.render(<Harness onReorder={onReorder} disabledKey="a" />))
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 110 }))
    })
    expect(onReorder).not.toHaveBeenCalled()

    await start()
    await act(async () => root.render(null))
    expect(onReorder).not.toHaveBeenCalled()
    expect(HTMLElement.prototype.releasePointerCapture).toHaveBeenCalled()
  })

  test('real rerender restores focus and scrolls the same logical handle into view', async () => {
    const onReorder = vi.fn()
    const frameDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        callback(0)
        return 1
      },
    })
    await act(async () => root.render(<StatefulHarness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    handle.scrollIntoView = vi.fn()
    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }))
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }))
    })
    expect(onReorder).toHaveBeenCalledOnce()
    expect(document.activeElement).toBe(handle)
    expect(handle.scrollIntoView).toHaveBeenCalledWith({
      block: 'nearest',
      inline: 'nearest',
      behavior: 'auto',
    })
    expect(
      [...host.querySelectorAll('[data-item-key]')].map((item) =>
        item.getAttribute('data-item-key'),
      ),
    ).toEqual(['b', 'c', 'a'])
    if (frameDescriptor) Object.defineProperty(globalThis, 'requestAnimationFrame', frameDescriptor)
    else
      delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
        .requestAnimationFrame
  })

  test('threshold, no-op, disabled, cancel and revision changes produce zero commands', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const first = host.querySelector<HTMLElement>('[data-ds-reorder-item][data-item-key="a"]')!
    vi.spyOn(first, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 40,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    document.elementFromPoint = vi.fn(() => first)

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
      handle.dispatchEvent(pointerEvent('pointermove', { x: 14, y: 14 }))
      handle.dispatchEvent(pointerEvent('pointerup', { x: 14, y: 14 }))
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
      handle.dispatchEvent(pointerEvent('pointermove', { x: 30, y: 20 }))
      handle.dispatchEvent(pointerEvent('pointercancel', { x: 30, y: 20 }))
    })
    expect(onReorder).not.toHaveBeenCalled()

    const escape = new KeyboardEvent('keydown', {
      key: 'Escape',
      bubbles: true,
      cancelable: true,
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
      handle.dispatchEvent(pointerEvent('pointermove', { x: 30, y: 20 }))
      window.dispatchEvent(escape)
    })
    expect(escape.defaultPrevented).toBe(true)
    expect(handle.getAttribute('data-dragging')).toBeNull()
    expect(onReorder).not.toHaveBeenCalled()

    await act(async () => root.render(<Harness onReorder={onReorder} disabledKey="a" />))
    expect(host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')?.disabled).toBe(true)

    await act(async () => root.render(<Harness onReorder={onReorder} revision={1} />))
    const active = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    await act(async () => {
      active.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => {
      active.dispatchEvent(pointerEvent('pointermove', { x: 30, y: 20 }))
    })
    await act(async () => root.render(<Harness onReorder={onReorder} revision={2} />))
    await act(async () => {
      active.dispatchEvent(pointerEvent('pointerup', { x: 30, y: 20 }))
    })
    expect(onReorder).not.toHaveBeenCalled()
  })

  test('leaving the collection or entering a disabled target clears the last valid projection', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} dropDisabledKey="b" />))
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const blocked = host.querySelector<HTMLElement>('[data-item-key="b"]')!
    const valid = host.querySelector<HTMLElement>('[data-item-key="c"]')!
    for (const [element, top] of [
      [blocked, 40],
      [valid, 80],
    ] as const) {
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: top,
        top,
        left: 0,
        right: 300,
        bottom: top + 40,
        width: 300,
        height: 40,
        toJSON: () => ({}),
      })
    }
    document.elementFromPoint = vi.fn((_x, y) => (y > 100 ? valid : y > 50 ? blocked : null))

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 110 }))
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 70 }))
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 70 }))
    })
    expect(onReorder).not.toHaveBeenCalled()

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 110 }))
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 20 }))
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 20 }))
    })
    expect(onReorder).not.toHaveBeenCalled()
  })

  test('auto-scroll uses the nearest modal owner and never escapes to the outer page', async () => {
    const onReorder = vi.fn()
    const scheduled: FrameRequestCallback[] = []
    const frameDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'requestAnimationFrame')
    const cancelDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'cancelAnimationFrame')
    Object.defineProperty(globalThis, 'requestAnimationFrame', {
      configurable: true,
      value: (callback: FrameRequestCallback) => {
        scheduled.push(callback)
        return scheduled.length
      },
    })
    Object.defineProperty(globalThis, 'cancelAnimationFrame', {
      configurable: true,
      value: vi.fn(),
    })
    await act(async () =>
      root.render(
        <div data-outer-scroll="true" style={{ overflowY: 'auto' }}>
          <div role="dialog" aria-modal="true">
            <div data-modal-scroll="true" style={{ overflowY: 'auto' }}>
              <Harness onReorder={onReorder} />
            </div>
          </div>
        </div>,
      ),
    )
    const outer = host.querySelector<HTMLElement>('[data-outer-scroll]')!
    const modal = host.querySelector<HTMLElement>('[data-modal-scroll]')!
    for (const element of [outer, modal]) {
      Object.defineProperties(element, {
        scrollHeight: { configurable: true, value: 300 },
        clientHeight: { configurable: true, value: 100 },
      })
      vi.spyOn(element, 'getBoundingClientRect').mockReturnValue({
        x: 0,
        y: 0,
        top: 0,
        left: 0,
        right: 300,
        bottom: 100,
        width: 300,
        height: 100,
        toJSON: () => ({}),
      })
    }
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const target = host.querySelector<HTMLElement>('[data-item-key="c"]')!
    vi.spyOn(target, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 60,
      top: 60,
      left: 0,
      right: 300,
      bottom: 100,
      width: 300,
      height: 40,
      toJSON: () => ({}),
    })
    document.elementFromPoint = vi.fn(() => target)
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 95 }))
    })
    expect(scheduled).toHaveLength(1)
    await act(async () => scheduled.shift()?.(1))
    expect(modal.scrollTop).toBe(14)
    expect(outer.scrollTop).toBe(0)
    expect(
      host.querySelector('.ds-reorder-indicator')?.closest('[aria-modal="true"]'),
    ).not.toBeNull()
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointercancel', { x: 20, y: 95 }))
    })
    expect(onReorder).not.toHaveBeenCalled()
    if (frameDescriptor) Object.defineProperty(globalThis, 'requestAnimationFrame', frameDescriptor)
    else
      delete (globalThis as { requestAnimationFrame?: typeof requestAnimationFrame })
        .requestAnimationFrame
    if (cancelDescriptor)
      Object.defineProperty(globalThis, 'cancelAnimationFrame', cancelDescriptor)
    else
      delete (globalThis as { cancelAnimationFrame?: typeof cancelAnimationFrame })
        .cancelAnimationFrame
  })

  test('composition blocks pointer capture and leaves the field interaction owner untouched', async () => {
    const onReorder = vi.fn()
    await act(async () => root.render(<Harness onReorder={onReorder} />))
    const collection = host.querySelector<HTMLElement>('[data-ds-reorder-scope]')!
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    await act(async () => {
      collection.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true }))
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
      collection.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true }))
    })
    expect(HTMLElement.prototype.setPointerCapture).not.toHaveBeenCalled()
    expect(onReorder).not.toHaveBeenCalled()
  })

  test('collection disabled, keyboard blur, scope change and shared fallback stay on one owner', async () => {
    const onReorder = vi.fn()
    const canReorder = vi.fn(() => true)
    await act(async () =>
      root.render(<Harness onReorder={onReorder} disabled fallback canReorder={canReorder} />),
    )
    expect(host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')?.disabled).toBe(true)

    await act(async () =>
      root.render(<Harness onReorder={onReorder} fallback canReorder={canReorder} />),
    )
    const moveButton = host.querySelector<HTMLButtonElement>('[aria-label="下移甲"]')!
    await act(async () => moveButton.click())
    expect(canReorder).toHaveBeenCalledOnce()
    expect(onReorder).toHaveBeenCalledOnce()
    expect(onReorder.mock.calls[0]?.[0]).toMatchObject({
      adoptionId: 'test/list',
      scopeKey: 'test-list',
      fromIndex: 0,
      toIndex: 1,
      input: 'button',
    })

    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="a"]')!
    const outside = document.createElement('button')
    document.body.append(outside)
    await act(async () => {
      handle.focus()
      handle.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }))
      outside.focus()
    })
    expect(handle.getAttribute('aria-pressed')).toBe('false')
    expect(onReorder).toHaveBeenCalledOnce()
    outside.remove()

    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 10 }))
    })
    await act(async () => root.render(<Harness onReorder={onReorder} scopeKey="next-object" />))
    expect(host.querySelector('[data-dragging="true"]')).toBeNull()
    expect(onReorder).toHaveBeenCalledOnce()
  })

  test('outer collection resolves its own item through a nested collection', async () => {
    const outerReorder = vi.fn()
    await act(async () =>
      root.render(
        <DsReorderCollection
          adoptionId="test/outer"
          scopeKey="outer"
          entries={[
            { key: 'outer-a', label: '外甲' },
            { key: 'outer-b', label: '外乙' },
          ]}
          revision={1}
          onReorder={outerReorder}
        >
          <DsReorderItem itemKey="outer-a">
            <DsReorderCollection
              adoptionId="test/inner"
              scopeKey="inner"
              entries={[
                { key: 'inner-a', label: '内甲' },
                { key: 'inner-b', label: '内乙' },
              ]}
              revision={1}
              onReorder={() => {}}
            >
              <DsReorderItem itemKey="inner-a">内甲</DsReorderItem>
              <DsReorderItem itemKey="inner-b">内乙</DsReorderItem>
            </DsReorderCollection>
          </DsReorderItem>
          <DsReorderItem itemKey="outer-b">外乙</DsReorderItem>
        </DsReorderCollection>,
      ),
    )
    const handle = host.querySelector<HTMLButtonElement>('[data-reorder-key="outer-b"]')!
    const inner = host.querySelector<HTMLElement>('[data-item-key="inner-a"]')!
    const outer = host.querySelector<HTMLElement>('[data-item-key="outer-a"]')!
    vi.spyOn(outer, 'getBoundingClientRect').mockReturnValue({
      x: 0,
      y: 0,
      top: 0,
      left: 0,
      right: 300,
      bottom: 80,
      width: 300,
      height: 80,
      toJSON: () => ({}),
    })
    document.elementFromPoint = vi.fn(() => inner)
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointerdown', { x: 10, y: 100 }))
    })
    await act(async () => {
      handle.dispatchEvent(pointerEvent('pointermove', { x: 20, y: 10 }))
      handle.dispatchEvent(pointerEvent('pointerup', { x: 20, y: 10 }))
    })
    expect(outerReorder).toHaveBeenCalledOnce()
    expect(outerReorder.mock.calls[0]?.[0]).toMatchObject({ fromIndex: 1, toIndex: 0 })
  })

  test('editor-local tokens survive StrictMode clones and follow a repeated occurrence after move', async () => {
    await act(async () =>
      root.render(
        <StrictMode>
          <TokenHarness />
        </StrictMode>,
      ),
    )
    const firstHandle = host.querySelector<HTMLButtonElement>('[data-reorder-key]')!
    const firstToken = firstHandle.dataset.reorderKey
    await act(async () => host.querySelector<HTMLButtonElement>('[data-clone="true"]')!.click())
    expect(host.querySelector<HTMLButtonElement>('[data-reorder-key]')?.dataset.reorderKey).toBe(
      firstToken,
    )
    const moveLast = firstHandle
      .closest('[data-ds-reorder-item]')!
      .querySelector<HTMLButtonElement>('[aria-label^="将first-a移到最后"]')!
    await act(async () => moveLast.click())
    const rows = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(rows.at(-1)?.dataset.itemKey).toBe(firstToken)
    expect(rows.at(-1)?.querySelector('[data-occurrence]')?.getAttribute('data-occurrence')).toBe(
      'first-a',
    )
  })

  test('insertion and deletion do not steal tokens from surviving object identities', async () => {
    await act(async () => root.render(<TokenHarness />))
    const before = new Map(
      [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map((row) => [
        row.querySelector('[data-occurrence]')?.getAttribute('data-occurrence'),
        row.dataset.itemKey,
      ]),
    )
    await act(async () => host.querySelector<HTMLButtonElement>('[data-insert="true"]')!.click())
    let rows = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(rows[1]?.dataset.itemKey).toBe(before.get('first-a'))
    expect(rows[2]?.dataset.itemKey).toBe(before.get('second-a'))
    expect(rows[3]?.dataset.itemKey).toBe(before.get('b'))
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-remove-inserted="true"]')!.click(),
    )
    rows = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(rows.map((row) => row.dataset.itemKey)).toEqual([
      before.get('first-a'),
      before.get('second-a'),
      before.get('b'),
    ])
  })

  test('editing one cloned duplicate keeps every occurrence token at its logical position', async () => {
    await act(async () => root.render(<TokenHarness />))
    const before = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map(
      (row) => row.dataset.itemKey,
    )
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-edit-first="true"]')!.click(),
    )
    const after = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(after.map((row) => row.dataset.itemKey)).toEqual(before)
    expect(after[0]?.querySelector('[data-occurrence]')?.textContent).toBe('edited')
    expect(after[1]?.querySelector('[data-occurrence]')?.textContent).toBe('a')
  })

  test('explicit duplicate removal preserves the surviving occurrence token', async () => {
    await act(async () => root.render(<TokenHarness />))
    const before = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    const secondToken = before[1]?.dataset.itemKey
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-remove-first="true"]')!.click(),
    )
    const after = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(after[0]?.dataset.itemKey).toBe(secondToken)
    expect(after[0]?.querySelector('[data-occurrence]')?.getAttribute('data-occurrence')).toBe(
      'second-a',
    )
  })

  test('retaining one occurrence preserves that card token across a cloned chain replacement', async () => {
    await act(async () => root.render(<TokenHarness />))
    const before = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    const secondToken = before[1]?.dataset.itemKey
    await act(async () =>
      host.querySelector<HTMLButtonElement>('[data-retain-second="true"]')!.click(),
    )
    const after = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')]
    expect(after).toHaveLength(1)
    expect(after[0]?.dataset.itemKey).toBe(secondToken)
    expect(after[0]?.querySelector('[data-occurrence]')?.getAttribute('data-occurrence')).toBe(
      'second-a',
    )
  })

  test('serializable value equality suppresses empty history and reset drops ambiguous occurrence tokens', async () => {
    const records = [{ value: 'same' }, { value: 'same' }]
    expect(
      reorderDsItems(records, { fromIndex: 0, toIndex: 1 }, 'insert', sameDsSerializableValue),
    ).toBe(records)
    const repeated = ['same', 'same']
    expect(reorderDsItems(repeated, { fromIndex: 0, toIndex: 1 })).toBe(repeated)

    await act(async () => root.render(<TokenHarness />))
    const before = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map(
      (item) => item.dataset.itemKey,
    )
    await act(async () => host.querySelector<HTMLButtonElement>('[data-reset="true"]')!.click())
    const after = [...host.querySelectorAll<HTMLElement>('[data-ds-reorder-item]')].map(
      (item) => item.dataset.itemKey,
    )
    expect(after).not.toEqual(before)
  })
})
