/**
 * TEST-GLM-EDITOR-UI-WAVE-1 通用交互测试夹具：jsdom 挂载生命周期、受控输入提交、
 * 组合框/文件输入驱动与延迟 Promise 助手。只放与组件无关的交互工具；
 * 组件级 fixture/harness 在各组测试文件内（沿用同名旧测的现行模式）。不被生产导入。
 */
import { act } from 'react'
import { expect } from 'vitest'

export function useActEnvironment(): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}

export async function setInputValue(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
}

/** DsField 协议：label[for] → 控件 id。 */
export function fieldControlByLabel<T extends HTMLElement>(host: ParentNode, text: string): T {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `field label ${text}`).toBeDefined()
  const control = label!.htmlFor
    ? (document.getElementById(label!.htmlFor) as T | null)
    : label!.querySelector<T>('button, input, textarea')
  if (!control) throw new Error(`field control 未找到：${text}`)
  return control
}

/** 组合框协议：点击触发器，再经 aria-controls 定位 listbox 内的 role=option。 */
export async function chooseComboboxOption(trigger: HTMLElement, label: string): Promise<void> {
  await act(async () => {
    trigger.click()
  })
  const controls = trigger.getAttribute('aria-controls')
  const scope = controls ? (document.getElementById(controls) ?? document) : document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )
  expect(option, `option ${label}`).toBeDefined()
  await act(async () => {
    option!.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

export function comboboxByAriaLabel<T extends HTMLElement>(host: ParentNode, label: string): T {
  const trigger = host.querySelector<T>(`button[role="combobox"][aria-label="${label}"]`)
  expect(trigger, `combobox aria-label ${label}`).not.toBeNull()
  return trigger!
}

/** 复选框：按 label 文本定位并点击。 */
export async function clickCheckboxByLabel(host: ParentNode, text: string): Promise<void> {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `checkbox label ${text}`).toBeDefined()
  const control = label!.htmlFor
    ? (document.getElementById(label!.htmlFor) as HTMLInputElement | null)
    : label!.querySelector('input')
  expect(control, `checkbox control ${text}`).not.toBeNull()
  if (!control) throw new Error(`checkbox control 未找到：${text}`)
  await act(async () => {
    control.click()
  })
}

export function buttonByLabel(host: ParentNode, text: string): HTMLButtonElement {
  const buttons = [...host.querySelectorAll<HTMLButtonElement>('button')]
  const hit = buttons.find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.getAttribute('aria-label') === text ||
      candidate.title === text,
  )
  expect(hit, `button ${text}`).toBeDefined()
  return hit!
}

export async function clickButton(host: ParentNode, text: string): Promise<void> {
  await act(async () => {
    buttonByLabel(host, text).click()
  })
}

/** 文件输入：设置 files 并派发 change（组件随后重置 input.value，可重复驱动）。 */
export async function loadFilesIntoInput(input: HTMLInputElement, files: File[]): Promise<void> {
  await act(async () => {
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

export function inputByAriaLabel<T extends HTMLElement>(scope: ParentNode, label: string): T {
  const input = scope.querySelector<T>(`input[aria-label="${label}"]`)
  expect(input, `input aria-label ${label}`).not.toBeNull()
  return input!
}

export function inputByAccept(host: ParentNode, accept: string): HTMLInputElement {
  const input = host.querySelector<HTMLInputElement>(`input[type="file"][accept="${accept}"]`)
  expect(input, `file input ${accept}`).not.toBeNull()
  return input!
}

export interface Deferred<T> {
  promise: Promise<T>
  resolve: (value: T) => void
  reject: (error: unknown) => void
}

export function deferred<T>(): Deferred<T> {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

/** 独立深快照：与输入完全脱离引用。 */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}
