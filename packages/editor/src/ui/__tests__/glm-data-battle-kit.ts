/**
 * TEST-GLM-EDITOR-DATA-BATTLE-AUTHORING-1 共享夹具：只被本卡五个测试文件导入，不被生产引用。
 *
 * 边界纪律：
 * - 项目一律真实 blank seed → 真实 loader（loadCurrentProjectFrom + 全量场景/地图）→
 *   toEditorState → assertProjectSaveValid 自证；不手搓 EditorState。
 * - 领域实体播种只用生产命令；播种失败即抛错，不静默吞。
 * - 硬件端口替身仅 Node Blob/crypto（stubNodeTestHost），沿用 glm-leaf-workflows 白名单桥。
 */

import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { vi } from 'vitest'
import { stubNodeTestHost } from './glm-leaf-workflows/node-bridge.js'

export interface DataBattleHost {
  host: HTMLDivElement
  root: Root
}

/** jsdom 挂载环境 + Node 测试宿主桥；afterEach 必须配对 destroyDataBattleHost。 */
export async function createDataBattleHost(): Promise<DataBattleHost> {
  await stubNodeTestHost()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const host = document.createElement('div')
  document.body.append(host)
  return { host, root: createRoot(host) }
}

export async function destroyDataBattleHost(target: DataBattleHost): Promise<void> {
  await act(async () => {
    target.root.unmount()
  })
  target.host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
}

/** 草稿输入提交协议：输入事件设值、focusout 提交（与产品 DsDraft* 提交边界一致）。 */
export async function fillAndBlur(input: HTMLInputElement, value: string): Promise<void> {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
  await act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

export function buttonByText(scope: ParentNode, text: string): HTMLButtonElement {
  const hit = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.getAttribute('aria-label') === text ||
      candidate.title === text,
  )
  if (!hit) throw new Error(`button not found: ${text}`)
  return hit
}

export async function clickButton(scope: ParentNode, text: string): Promise<void> {
  const target = buttonByText(scope, text)
  await act(async () => {
    target.click()
  })
}

/** DsSelect 驱动：点击触发器，在 aria-controls 定位的 listbox 内按选项标签选择。 */
export async function chooseSelectOption(trigger: HTMLElement, optionText: string): Promise<void> {
  await act(async () => {
    trigger.click()
  })
  const controls = trigger.getAttribute('aria-controls')
  const scope = (controls ? document.getElementById(controls) : null) ?? document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent?.trim() === optionText ||
      candidate.textContent?.trim() === optionText,
  )
  if (!option) throw new Error(`option not found: ${optionText}`)
  await act(async () => {
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }))
  })
}

/** DsField 协议：label 文本 → 关联控件。 */
export function controlByLabel<T extends HTMLElement>(scope: ParentNode, text: string): T {
  const label = [...scope.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  if (!label) throw new Error(`field label not found: ${text}`)
  const control = label.htmlFor
    ? ((document.getElementById(label.htmlFor) as T | null) ??
      (document.querySelector(`[data-ds-control-id="${label.htmlFor}"]`) as T | null))
    : label.querySelector<T>('button, input, textarea')
  if (!control) throw new Error(`field control not found: ${text}`)
  return control
}

/** 撤销/重做纳入 act：订阅通知触发的组件更新不逃逸 act 域。 */
export function undoInAct(session: { undo: () => boolean }): boolean {
  let result = false
  act(() => {
    result = session.undo()
  })
  return result
}

export function redoInAct(session: { redo: () => boolean }): boolean {
  let result = false
  act(() => {
    result = session.redo()
  })
  return result
}

/** 目录行（DsCatalogRow）按标题文本定位。 */
export function catalogRowByTitle(scope: ParentNode, title: string): HTMLElement {
  const row = [...scope.querySelectorAll<HTMLElement>('.ds-catalog-row')].find(
    (candidate) => candidate.querySelector('.ds-catalog-row__title')?.textContent?.trim() === title,
  )
  if (!row) throw new Error(`catalog row not found: ${title}`)
  return row
}
