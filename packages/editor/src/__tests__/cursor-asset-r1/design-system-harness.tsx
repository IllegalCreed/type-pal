/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 C10：design-system jsdom 宿主（仅 cursor-r1 测试导入）。
 */
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { expect } from 'vitest'

export interface DsMountedHost {
  host: HTMLDivElement
  root: Root
}

export function installDsDialogStub(): void {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute('open', '')
    },
  })
  Object.defineProperty(HTMLDialogElement.prototype, 'close', {
    configurable: true,
    value(this: HTMLDialogElement) {
      if (!this.hasAttribute('open')) return
      this.removeAttribute('open')
      this.dispatchEvent(new Event('close'))
    },
  })
}

export function uninstallDsDialogStub(): void {
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
}

export function installDsScrollToStub(): void {
  Object.defineProperty(HTMLElement.prototype, 'scrollTo', {
    configurable: true,
    value(this: HTMLElement, options: ScrollToOptions) {
      this.scrollTop = options.top ?? 0
      this.dispatchEvent(new Event('scroll'))
    },
  })
}

export function uninstallDsScrollToStub(): void {
  delete (HTMLElement.prototype as { scrollTo?: unknown }).scrollTo
}

export function installDsRafStub(
  vi: Pick<typeof import('vitest')['vi'], 'stubGlobal'>,
  sync = true,
): void {
  vi.stubGlobal(
    'requestAnimationFrame',
    sync
      ? (callback: FrameRequestCallback) => {
          callback(0)
          return 1
        }
      : (callback: FrameRequestCallback) => {
          queueMicrotask(() => callback(0))
          return 1
        },
  )
}

export function createDsHost(): DsMountedHost {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')
  document.body.append(host)
  return { host, root: createRoot(host) }
}

export async function unmountDsHost(mounted: DsMountedHost): Promise<void> {
  await act(async () => mounted.root.unmount())
  mounted.host.remove()
}

export async function dsClick(element: HTMLElement): Promise<void> {
  await act(async () => {
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

export async function dsKey(element: Element, keyName: string): Promise<void> {
  await act(async () => {
    element.dispatchEvent(
      new KeyboardEvent('keydown', { key: keyName, bubbles: true, cancelable: true }),
    )
  })
}

export async function dsSetInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export function dsExpectButton(host: ParentNode, label: string): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.getAttribute('aria-label') === label ||
      candidate.textContent?.trim() === label ||
      candidate.title === label,
  )
  expect(hit, `button ${label}`).toBeDefined()
  return hit!
}
