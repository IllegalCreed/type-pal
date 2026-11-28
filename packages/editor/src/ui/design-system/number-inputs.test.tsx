// @vitest-environment jsdom
import { act, createRef, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { installReactActEnvironment } from '../../__tests__/react-io-wait.js'
import { DsDraftNumberField, DsDraftNumberInput, DsNumberField, DsNumberInput } from './index.js'

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

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function click(element: HTMLElement): Promise<void> {
  await act(async () => element.click())
}

test('derives numeric input modes without overriding an explicit caller choice', async () => {
  await act(async () =>
    root.render(
      <>
        <DsDraftNumberInput
          aria-label="整数"
          draftKey="integer"
          value={1}
          integer
          onCommit={() => undefined}
        />
        <DsDraftNumberInput
          aria-label="显式小数键盘"
          draftKey="explicit"
          value={1}
          integer
          inputMode="decimal"
          onCommit={() => undefined}
        />
        <DsNumberInput aria-label="直接整数" integer defaultValue={2} />
        <DsNumberInput aria-label="显式电话键盘" integer inputMode="tel" defaultValue={3} />
      </>,
    ),
  )

  expect(host.querySelector<HTMLInputElement>('[aria-label="整数"]')?.inputMode).toBe('numeric')
  expect(host.querySelector<HTMLInputElement>('[aria-label="显式小数键盘"]')?.inputMode).toBe(
    'decimal',
  )
  expect(host.querySelector<HTMLInputElement>('[aria-label="直接整数"]')?.inputMode).toBe('numeric')
  expect(host.querySelector<HTMLInputElement>('[aria-label="显式电话键盘"]')?.inputMode).toBe('tel')
  expect(
    host.querySelector<HTMLInputElement>('[aria-label="直接整数"]')?.getAttribute('integer'),
  ).toBeNull()
})

test('plain number field forwards its real input and emits one native change per step', async () => {
  const inputRef = createRef<HTMLInputElement>()
  const changes = vi.fn()
  await act(async () =>
    root.render(
      <DsNumberField
        inputRef={inputRef}
        label="回合"
        defaultValue={1}
        max={2}
        integer
        onChange={changes}
      />,
    ),
  )
  const field = host.querySelector<HTMLInputElement>('input')!
  expect(inputRef.current).toBe(field)
  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加回合"]')!)
  expect(field.value).toBe('2')
  expect(changes).toHaveBeenCalledTimes(1)
  expect(host.querySelector<HTMLButtonElement>('[aria-label="增加回合"]')?.disabled).toBe(true)
})

test('number field stepper follows disabled and readonly semantics', async () => {
  await act(async () =>
    root.render(
      <>
        <DsNumberField label="禁用数值" value={1} disabled onChange={() => undefined} />
        <DsDraftNumberField
          label="只读数值"
          draftKey="readonly"
          value={2}
          readOnly
          onCommit={() => undefined}
        />
      </>,
    ),
  )
  expect(
    [...host.querySelectorAll<HTMLButtonElement>('[data-ds-number-stepper] button')].every(
      (button) => button.disabled,
    ),
  ).toBe(true)
  const inputs = [...host.querySelectorAll<HTMLInputElement>('input')]
  expect(inputs[0]?.disabled).toBe(true)
  expect(inputs[0]?.readOnly).toBe(false)
  expect(inputs[1]?.disabled).toBe(false)
  expect(inputs[1]?.readOnly).toBe(true)
})

test('native stepper steps the controlled value, fires one change and stops at bounds', async () => {
  const committed: number[] = []
  function Harness(): React.ReactNode {
    const [value, setValue] = useState(4)
    return (
      <DsNumberField
        label="尺寸"
        min={0}
        max={10}
        step={2}
        value={value}
        onChange={(event) => {
          const next = Number(event.currentTarget.value)
          committed.push(next)
          setValue(next)
        }}
      />
    )
  }
  await act(async () => root.render(<Harness />))
  const field = host.querySelector<HTMLInputElement>('input')!

  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加尺寸"]')!)
  expect(committed).toEqual([6])
  expect(field.value).toBe('6')

  await click(host.querySelector<HTMLButtonElement>('[aria-label="减少尺寸"]')!)
  expect(committed).toEqual([6, 4])
  expect(field.value).toBe('4')

  await input(field, '10')
  expect(host.querySelector<HTMLButtonElement>('[aria-label="增加尺寸"]')?.disabled).toBe(true)
  await click(host.querySelector<HTMLButtonElement>('[aria-label="增加尺寸"]')!)
  expect(committed).toEqual([6, 4, 10])
  expect(field.value).toBe('10')
})

test.each([
  ['直接更新', <DsNumberField key="direct" label="回合" error="上限为十。" defaultValue={2} />],
  [
    '事务更新',
    <DsDraftNumberField
      key="draft"
      label="回合"
      error="上限为十。"
      draftKey="encounter:turns"
      value={2}
      onCommit={() => false}
    />,
  ],
])('%s associates the actual number field with its label, error and controls', async (_mode, view) => {
  await act(async () => root.render(view))
  const field = host.querySelector<HTMLInputElement>('input')!
  expect(field.labels?.[0]?.textContent).toBe('回合')
  expect(field.labels?.[0]?.control).toBe(field)
  expect(field.getAttribute('aria-invalid')).toBe('true')
  const errorId = field.getAttribute('aria-describedby')
  expect(errorId && document.getElementById(errorId)?.textContent).toBe('上限为十。')
  expect(host.querySelector('[aria-label="增加回合"]')?.getAttribute('aria-controls')).toBe(
    field.id,
  )
})
