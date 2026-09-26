// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import * as controls from './controls.js'
import { DsDraftTextInput } from './draft-text-inputs.js'

let host: HTMLDivElement
let root: ReturnType<typeof createRoot>

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.append(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
})

async function keyDown(
  element: HTMLElement,
  key: string,
  options: { isComposing?: boolean } = {},
): Promise<void> {
  const event = new KeyboardEvent('keydown', { key, bubbles: true, cancelable: true })
  if (options.isComposing) Object.defineProperty(event, 'isComposing', { value: true })
  await act(async () => element.dispatchEvent(event))
}

async function input(element: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  await act(async () => {
    element.focus()
    setter?.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

describe('U06 draft text inputs', () => {
  test('keeps draft text input identity with Enter commit and Escape cancel', async () => {
    expect(controls.DsDraftTextInput).toBe(DsDraftTextInput)
    const onCommit = vi.fn(() => true)
    const onCancel = vi.fn()
    await act(async () =>
      root.render(
        <DsDraftTextInput
          draftKey="name"
          value="旧值"
          aria-label="名称"
          onCommit={onCommit}
          onCancel={onCancel}
        />,
      ),
    )
    const field = host.querySelector<HTMLInputElement>('input')!
    expect(field.value).toBe('旧值')
    expect(field.getAttribute('data-ds-draft-commit')).toBe('text')

    await input(field, '新值')
    await keyDown(field, 'Enter')
    expect(onCommit).toHaveBeenCalledWith('新值')

    await input(field, '草稿')
    await keyDown(field, 'Escape')
    expect(onCancel).toHaveBeenCalled()
    expect(field.value).toBe('旧值')
  })
})
