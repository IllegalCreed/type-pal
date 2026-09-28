// @vitest-environment jsdom
import { act, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import { DsDraftNumberField, DsDraftNumberInput, DsNumberField } from './number-inputs.js'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.restoreAllMocks()
})

function numberInput(): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>('input[type="number"]')
  expect(input).not.toBeNull()
  return input!
}

async function type(value: string): Promise<void> {
  const input = numberInput()
  const setValue = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    setValue.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

async function press(keyName: string): Promise<void> {
  await act(async () => {
    numberInput().dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

async function blur(): Promise<void> {
  await act(async () => {
    numberInput().dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

async function clickButton(label: string): Promise<void> {
  const button = host.querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)
  expect(button).not.toBeNull()
  await act(async () => button?.click())
}

describe('DsDraftNumberInput 剩余合同', () => {
  test('Enter and blur commit canonical values; Escape cancels; same value never recommits', async () => {
    const onCommit = vi.fn((_next?: number | undefined) => true)
    const onCancel = vi.fn()
    function Harness(): React.ReactNode {
      const [value, setValue] = useState<number | undefined>(2)
      return (
        <DsDraftNumberInput
          aria-label="数量"
          draftKey="数量"
          value={value}
          min={0}
          max={10}
          integer
          onCommit={(next) => {
            if (onCommit(next)) setValue(next)
            return true
          }}
          onCancel={onCancel}
        />
      )
    }
    await act(async () => root.render(<Harness />))
    expect(numberInput().value).toBe('2')

    await type('5')
    await press('Enter')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(5)
    expect(numberInput().value).toBe('5')

    await type('3')
    await press('Escape')
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(numberInput().value).toBe('5')

    await press('Enter')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(numberInput().value).toBe('5')

    await type('5.0')
    await press('Enter')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(numberInput().value).toBe('5')

    await type('7')
    await blur()
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(onCommit).toHaveBeenLastCalledWith(7)
    expect(numberInput().value).toBe('7')
  })

  test('rejected commits resync the draft to the canonical value', async () => {
    const onCommit = vi.fn(() => false)
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
    await type('8')
    await press('Enter')
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(8)
    expect(numberInput().value).toBe('2')
  })

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
    await type('-1')
    await blur()
    expect(numberInput().getAttribute('title')).toBe('不能小于 0。')
    expect(numberInput().getAttribute('aria-invalid')).toBe('true')
    expect(onCommit).not.toHaveBeenCalled()

    await type('11')
    await blur()
    expect(numberInput().getAttribute('title')).toBe('不能大于 10。')
    expect(onCommit).not.toHaveBeenCalled()

    await type('2.5')
    await blur()
    expect(numberInput().getAttribute('title')).toBe('请输入整数。')
    expect(onCommit).not.toHaveBeenCalled()

    await type('')
    await blur()
    expect(numberInput().getAttribute('title')).toBe('请输入有效数字。')
    expect(onCommit).not.toHaveBeenCalled()
    expect(numberInput().value).toBe('')

    await type('6')
    await blur()
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
    await type('')
    await blur()
    expect(onCommit).toHaveBeenCalledTimes(1)
    expect(onCommit).toHaveBeenCalledWith(undefined)
    expect(numberInput().value).toBe('')

    await type('2.34')
    await blur()
    expect(onCommit).toHaveBeenCalledTimes(2)
    expect(onCommit).toHaveBeenLastCalledWith(2.3)
  })

  test('stepper commits stepped drafts, honors bounds and clears to empty at the minimum', async () => {
    const onCommit = vi.fn((_next?: number | undefined) => true)
    function Harness(): React.ReactNode {
      const [value, setValue] = useState<number | undefined>(4)
      return (
        <DsDraftNumberField
          label="数量"
          draftKey="数量"
          value={value}
          min={0}
          max={10}
          step={2}
          allowEmpty
          onCommit={(next) => {
            if (onCommit(next)) setValue(next)
            return true
          }}
        />
      )
    }
    await act(async () => root.render(<Harness />))
    await clickButton('增加数量')
    expect(onCommit).toHaveBeenLastCalledWith(6)
    await clickButton('增加数量')
    expect(onCommit).toHaveBeenLastCalledWith(8)

    await type('10')
    await press('Enter')
    expect(numberInput().value).toBe('10')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加数量"]')?.disabled).toBe(true)
    await clickButton('减少数量')
    expect(onCommit).toHaveBeenLastCalledWith(8)

    await type('0')
    await press('Enter')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="减少数量"]')?.disabled).toBe(false)
    await clickButton('减少数量')
    expect(onCommit).toHaveBeenLastCalledWith(undefined)
    expect(numberInput().value).toBe('')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="减少数量"]')?.disabled).toBe(true)
  })
})

describe('DsNumberInput 剩余合同', () => {
  test('native stepper steps the controlled value, fires one change and stops at bounds', async () => {
    const onChange = vi.fn()
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
            onChange(next)
            setValue(next)
          }}
        />
      )
    }
    await act(async () => root.render(<Harness />))
    const input = numberInput()

    await clickButton('增加尺寸')
    expect(committed).toEqual([6])
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(input.value).toBe('6')

    await clickButton('减少尺寸')
    expect(committed).toEqual([6, 4])
    expect(input.value).toBe('4')

    await type('10')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加尺寸"]')?.disabled).toBe(true)
    committed.length = 0
    await clickButton('增加尺寸')
    expect(committed).toEqual([])
    expect(input.value).toBe('10')
  })

  test('field chrome links the label, surfaces errors and derives stepper labels', () => {
    act(() => root.render(<DsNumberField label="尺寸" error="必填" min={0} max={10} value={4} />))
    const input = numberInput()
    const label = host.querySelector('label')!
    expect(label.getAttribute('for')).toBe(input.id)
    expect(input.getAttribute('aria-invalid')).toBe('true')
    expect(host.textContent).toContain('必填')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加尺寸"]')).not.toBeNull()

    act(() =>
      root.render(
        <DsDraftNumberField
          label="权重"
          draftKey="权重"
          error="范围"
          value={2}
          min={0}
          max={10}
          integer
          onCommit={() => undefined}
        />,
      ),
    )
    const draftInput = numberInput()
    expect(host.querySelector('label')?.getAttribute('for')).toBe(draftInput.id)
    expect(draftInput.getAttribute('aria-invalid')).toBe('true')
    expect(host.querySelector<HTMLButtonElement>('[aria-label="增加权重"]')).not.toBeNull()
    expect(host.querySelector<HTMLButtonElement>('[aria-label="减少权重"]')).not.toBeNull()
  })
})
