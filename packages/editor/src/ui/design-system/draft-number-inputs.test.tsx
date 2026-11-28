// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsDraftNumberField, DsDraftNumberInput } from './index.js'

let host: HTMLDivElement
let root: Root
let restoreActEnvironment: () => void

beforeEach(() => {
  restoreActEnvironment = installReactActEnvironment()
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  try {
    await act(async () => root.unmount())
  } finally {
    host.remove()
    vi.useRealTimers()
    restoreActEnvironment()
  }
})

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

async function keyDown(
  element: HTMLElement,
  key: string,
  init: Omit<KeyboardEventInit, 'key'> = {},
): Promise<void> {
  await act(async () =>
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true, ...init }),
    ),
  )
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function blur(element: HTMLInputElement): Promise<void> {
  await act(async () => element.blur())
}

async function pointerDown(element: HTMLElement): Promise<boolean> {
  const event = new MouseEvent('pointerdown', { bubbles: true, cancelable: true })
  await act(async () => element.dispatchEvent(event))
  return event.defaultPrevented
}

test('keeps wheel scrolling non-blocking without committing a focused numeric draft', async () => {
  const commits = vi.fn()
  vi.useFakeTimers()
  await act(async () =>
    root.render(
      <DsDraftNumberInput
        aria-label="等级"
        draftKey="enemy:level"
        value={1}
        integer
        onCommit={commits}
      />,
    ),
  )
  const field = host.querySelector<HTMLInputElement>('input')!
  await act(async () => field.focus())
  await input(field, '9')
  const wheel = new WheelEvent('wheel', { bubbles: true, cancelable: true, deltaY: 80 })
  await act(async () => field.dispatchEvent(wheel))

  expect(wheel.defaultPrevented).toBe(false)
  expect(document.activeElement).toBe(field)
  expect(field.value).toBe('9')
  expect(field.readOnly).toBe(true)
  expect(commits).not.toHaveBeenCalled()
  await act(async () => vi.runOnlyPendingTimers())
  expect(field.readOnly).toBe(false)
})

test('number fields own a bounded accessible stepper and commit a visible draft once', async () => {
  const commits = vi.fn()
  await act(async () =>
    root.render(
      <DsDraftNumberField
        label="数量"
        draftKey="inventory:potion:count"
        value={1}
        min={1}
        max={3}
        integer
        onCommit={commits}
      />,
    ),
  )
  const field = host.querySelector<HTMLInputElement>('input')!
  const decrement = host.querySelector<HTMLButtonElement>('[aria-label="减少数量"]')!
  const increment = host.querySelector<HTMLButtonElement>('[aria-label="增加数量"]')!

  expect(field.inputMode).toBe('numeric')
  expect(field.closest('[data-ds-number-stepper]')).not.toBeNull()
  expect(field.closest('.ds-number-field')).not.toBeNull()
  expect(field.labels?.[0]?.textContent).toBe('数量')
  expect(increment.getAttribute('aria-controls')).toBe(field.id)
  expect(decrement.disabled).toBe(true)
  expect(increment.disabled).toBe(false)

  await act(async () => field.focus())
  await input(field, '2')
  expect(await pointerDown(increment)).toBe(true)
  expect(document.activeElement).toBe(field)
  await click(increment)
  await blur(field)

  expect(commits).toHaveBeenCalledTimes(1)
  expect(commits).toHaveBeenCalledWith(3)
  expect(increment.disabled).toBe(true)
  await click(increment)
  expect(commits).toHaveBeenCalledTimes(1)
})

test('steps negative and fractional drafts precisely and disables step any', async () => {
  const negativeCommits = vi.fn()
  const decimalCommits = vi.fn()
  await act(async () =>
    root.render(
      <>
        <DsDraftNumberField
          label="防御"
          draftKey="enemy:defense"
          value={-6}
          integer
          onCommit={negativeCommits}
        />
        <DsDraftNumberField
          label="倍率"
          draftKey="skill:ratio"
          value={0.2}
          step={0.1}
          onCommit={decimalCommits}
        />
        <DsDraftNumberField
          label="任意精度"
          draftKey="any-step"
          value={2}
          step="any"
          onCommit={() => undefined}
        />
      </>,
    ),
  )

  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加防御"]')!)
  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加倍率"]')!)
  expect(negativeCommits).toHaveBeenCalledWith(-5)
  expect(decimalCommits).toHaveBeenCalledWith(0.3)
  expect(host.querySelector<HTMLButtonElement>('[aria-label="减少任意精度"]')?.disabled).toBe(true)
  expect(host.querySelector<HTMLButtonElement>('[aria-label="增加任意精度"]')?.disabled).toBe(true)
})

test('optional bounded number fields step between empty and their minimum', async () => {
  const commits = vi.fn()
  function OptionalNumberField() {
    const [value, setValue] = useState<number | undefined>(1)
    return (
      <DsDraftNumberField
        label="前置震屏帧"
        draftKey="skill:pre-shake-frames"
        value={value}
        allowEmpty
        min={1}
        integer
        placeholder="关闭"
        onCommit={(next) => {
          commits(next)
          setValue(next)
        }}
      />
    )
  }
  await act(async () => root.render(<OptionalNumberField />))

  await click(host.querySelector<HTMLButtonElement>('[aria-label="减少前置震屏帧"]')!)
  expect(commits).toHaveBeenLastCalledWith(undefined)
  expect(host.querySelector<HTMLInputElement>('input')?.value).toBe('')

  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加前置震屏帧"]')!)
  expect(commits).toHaveBeenLastCalledWith(1)
  expect(commits).toHaveBeenCalledTimes(2)
})

test('normalizes legacy domain values before integer and range validation', async () => {
  const commits = vi.fn()
  await act(async () =>
    root.render(
      <DsDraftNumberInput
        aria-label="价格"
        draftKey="item:price"
        value={10}
        min={0}
        integer
        normalize={(value) => Math.max(0, Math.floor(value))}
        onCommit={commits}
      />,
    ),
  )
  const field = host.querySelector<HTMLInputElement>('input')!
  await act(async () => field.focus())
  await input(field, '-1.7')
  await blur(field)
  expect(commits).toHaveBeenCalledOnce()
  expect(commits).toHaveBeenCalledWith(0)
})

test('resyncs the canonical value when a mutation rejects the commit', async () => {
  let accepted = false
  const commits = vi.fn(() => accepted)
  await act(async () =>
    root.render(
      <DsDraftNumberInput
        aria-label="动作帧"
        draftKey="enemy:a:idle.count"
        value={3}
        integer
        onCommit={commits}
      />,
    ),
  )
  const field = host.querySelector<HTMLInputElement>('input')!
  await act(async () => field.focus())
  await input(field, '9')
  await blur(field)
  expect(commits).toHaveBeenCalledWith(9)
  expect(field.value).toBe('3')

  accepted = true
  await act(async () => field.focus())
  await input(field, '8')
  await keyDown(field, 'Enter')
  await blur(field)
  expect(commits).toHaveBeenCalledTimes(2)
  expect(commits).toHaveBeenLastCalledWith(8)
  expect(field.value).toBe('8')
})

function numberInput(): HTMLInputElement {
  const field = host.querySelector<HTMLInputElement>('input[type="number"]')
  expect(field).not.toBeNull()
  return field!
}

async function typeNumber(value: string): Promise<void> {
  const field = numberInput()
  await act(async () => field.focus())
  await input(field, value)
}

test('range, integer and empty drafts produce the current validation copy without commits', async () => {
  const onCommit = vi.fn()
  await act(async () =>
    root.render(
      <DsDraftNumberInput
        aria-label="数量"
        draftKey="数量"
        value={2}
        min={0}
        max={10}
        integer
        onCommit={onCommit}
      />,
    ),
  )
  await typeNumber('-1')
  await blur(numberInput())
  expect(numberInput().getAttribute('title')).toBe('不能小于 0。')
  expect(numberInput().getAttribute('aria-invalid')).toBe('true')
  expect(onCommit).not.toHaveBeenCalled()

  await typeNumber('11')
  await blur(numberInput())
  expect(numberInput().getAttribute('title')).toBe('不能大于 10。')
  expect(onCommit).not.toHaveBeenCalled()

  await typeNumber('2.5')
  await blur(numberInput())
  expect(numberInput().getAttribute('title')).toBe('请输入整数。')
  expect(onCommit).not.toHaveBeenCalled()

  await typeNumber('')
  await blur(numberInput())
  expect(numberInput().getAttribute('title')).toBe('请输入有效数字。')
  expect(onCommit).not.toHaveBeenCalled()
  expect(numberInput().value).toBe('')

  await typeNumber('6')
  await blur(numberInput())
  expect(onCommit).toHaveBeenCalledTimes(1)
  expect(onCommit).toHaveBeenCalledWith(6)
})

test('allowEmpty commits undefined and normalize shapes the committed number', async () => {
  const onCommit = vi.fn((_next?: number | undefined) => true)
  function Harness(): React.ReactNode {
    const [value, setValue] = useState<number | undefined>(2)
    return (
      <DsDraftNumberInput
        aria-label="数量"
        draftKey="数量"
        value={value}
        allowEmpty
        normalize={(next) => Math.round(next * 10) / 10}
        onCommit={(next) => {
          if (onCommit(next)) setValue(next)
          return true
        }}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  await typeNumber('')
  await blur(numberInput())
  expect(onCommit).toHaveBeenCalledTimes(1)
  expect(onCommit).toHaveBeenCalledWith(undefined)
  expect(numberInput().value).toBe('')

  await typeNumber('2.34')
  await blur(numberInput())
  expect(onCommit).toHaveBeenCalledTimes(2)
  expect(onCommit).toHaveBeenLastCalledWith(2.3)
})

test('commits one number on Enter and blur, ignores equivalent spelling, and cancels Escape', async () => {
  const commits = vi.fn()
  function Quantity() {
    const [value, setValue] = useState(2)
    return (
      <DsDraftNumberInput
        aria-label="数量"
        draftKey="数量"
        value={value}
        onCommit={(next) => {
          if (next === undefined) return false
          commits(next)
          setValue(next)
          return true
        }}
      />
    )
  }

  await act(async () => root.render(<Quantity />))
  await typeNumber('5')
  await keyDown(numberInput(), 'Enter')
  await blur(numberInput())
  await typeNumber('3')
  await keyDown(numberInput(), 'Escape')
  expect(numberInput().value).toBe('5')
  expect(commits.mock.calls).toEqual([[5]])
  await typeNumber('5.0')
  await keyDown(numberInput(), 'Enter')
  await blur(numberInput())

  expect(commits.mock.calls).toEqual([[5]])
  expect(numberInput().value).toBe('5')
})

test('keeps a draft rejected by the caller validator and commits after correction', async () => {
  const commits = vi.fn()
  await act(async () =>
    root.render(
      <DsDraftNumberField
        label="动作帧"
        draftKey="action:idle:step:frame"
        value={1}
        integer
        min={0}
        validate={(frame) => (frame > 3 ? '精灵只有四帧。' : undefined)}
        onCommit={commits}
      />,
    ),
  )
  const field = numberInput()

  await typeNumber('9')
  await blur(field)
  expect(field.value).toBe('9')
  expect(field.title).toBe('精灵只有四帧。')
  expect(field.getAttribute('aria-invalid')).toBe('true')
  expect(commits).not.toHaveBeenCalled()

  await typeNumber('3')
  await blur(field)
  expect(field.getAttribute('aria-invalid')).not.toBe('true')
  expect(commits.mock.calls).toEqual([[3]])
})
