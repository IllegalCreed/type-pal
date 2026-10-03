/**
 * TEST-CURSOR-ASSET-UI-LARGE-1 专属 fixture（白名单 packages/editor/src/__tests__/cursor-asset-r1/**）：
 * Node/jsdom 宿主桥、合法 blank 装载器、受控输入与组合框驱动。
 * 只被本卡 *.cursor-r1.test.ts(x) 导入，不进生产。
 */
import {
  type FileSource,
  fsaSource,
  loadAllAuthorScenes,
  loadAllProjectMaps,
  loadCurrentProjectFrom,
} from '@type-pal/reforge'
import { act } from 'react'
import { expect } from 'vitest'
import { memoryAuthorDirectory } from '../../core/__tests__/author-save-fixture.js'
import type { EditorState } from '../../core/edit-session.js'
import { assertProjectSaveValid } from '../../core/project-diagnostics.js'
import { toEditorState } from '../../core/project-io.js'
import { buildBlankProject } from '../../core/seed.js'

export interface LegalProject {
  source: FileSource
  state: EditorState
  assetBase: import('@type-pal/reforge').AssetBase
  disk: ReturnType<typeof memoryAuthorDirectory>
}

/** blank → memory 目录 → loader → 全量场景/地图 → toEditorState → assertProjectSaveValid。 */
export async function loadLegalProject(name = 'cursor-asset-r1'): Promise<LegalProject> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase, disk }
}

export async function stubNodeTestHost(): Promise<void> {
  const nodeBufferModule = 'node:buffer'
  const nodeCryptoModule = 'node:crypto'
  const buffer = (await import(nodeBufferModule)) as { Blob: typeof Blob }
  const webcryptoModule = (await import(nodeCryptoModule)) as { webcrypto: typeof crypto }
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  const { vi } = await import('vitest')
  vi.stubGlobal('Blob', buffer.Blob)
  vi.stubGlobal('crypto', webcryptoModule.webcrypto)
}

export function useActEnvironment(): void {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
}

export function fillAndBlur(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!
  return act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
    input.blur()
  })
}

export function typeDraft(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  const proto = input instanceof HTMLTextAreaElement ? HTMLTextAreaElement : HTMLInputElement
  const setter = Object.getOwnPropertyDescriptor(proto.prototype, 'value')!.set!
  return act(async () => {
    input.focus()
    setter.call(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export async function blurField(input: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

export function controlByLabel<T extends HTMLElement>(host: ParentNode, text: string): T {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `field label ${text}`).toBeDefined()
  let control: T | null = null
  if (label!.htmlFor) {
    control =
      (document.getElementById(label!.htmlFor) as T | null) ??
      document
        .querySelector(`[data-ds-control-id="${label!.htmlFor}"]`)
        ?.querySelector<T>('button, input, textarea, select') ??
      null
  }
  control =
    control ??
    label!.querySelector<T>('button, input, textarea, select') ??
    label!.closest('.ds-field')?.querySelector<T>('input, textarea, button') ??
    null
  if (!control) throw new Error(`field control 未找到：${text}`)
  return control
}

export function controlByAriaLabel<T extends HTMLElement>(
  host: ParentNode,
  label: string,
  tag = 'input',
): T {
  const control = host.querySelector<T>(`${tag}[aria-label="${label}"]`)
  expect(control, `aria-label ${label} (${tag})`).not.toBeNull()
  return control!
}

export async function pickCombobox(trigger: HTMLElement, text: string): Promise<void> {
  if (trigger.getAttribute('aria-expanded') !== 'true') {
    await act(async () => {
      trigger.click()
    })
  }
  const controls = trigger.getAttribute('aria-controls')
  const scope = controls ? (document.getElementById(controls) ?? document) : document
  const option = [...scope.querySelectorAll<HTMLElement>('[role="option"]')].find(
    (candidate) =>
      candidate.querySelector('.ds-select-option__label')?.textContent === text ||
      candidate.textContent?.trim() === text,
  )
  expect(option, `option ${text}`).toBeDefined()
  await act(async () => {
    option!.click()
  })
}

export function comboboxTrigger<T extends HTMLElement>(host: ParentNode, text: string): T {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  const trigger = label?.htmlFor
    ? (document.getElementById(label.htmlFor) as T | null)
    : (label?.querySelector<T>('button') ?? null)
  expect(trigger, `combobox label ${text}`).not.toBeNull()
  return trigger!
}

export function buttonByText(host: ParentNode, text: string): HTMLButtonElement {
  const hit = [...host.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) =>
      candidate.textContent?.trim() === text ||
      candidate.getAttribute('aria-label') === text ||
      candidate.title === text,
  )
  expect(hit, `button ${text}`).toBeDefined()
  return hit!
}

export async function clickButtonByText(host: ParentNode, text: string): Promise<void> {
  await act(async () => {
    buttonByText(host, text).click()
  })
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

export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}

export function inputByAriaLabel<T extends HTMLElement>(scope: ParentNode, label: string): T {
  const input = scope.querySelector<T>(`input[aria-label="${label}"]`)
  expect(input, `input aria-label ${label}`).not.toBeNull()
  return input!
}

export async function loadFilesIntoInput(input: HTMLInputElement, files: File[]): Promise<void> {
  await act(async () => {
    Object.defineProperty(input, 'files', { value: files, configurable: true })
    input.dispatchEvent(new Event('change', { bubbles: true }))
  })
}

/** 磁盘 I/O 端口闸门：只延迟真实 readBytes，不替换 reader/解码核心。 */
export function gatedFileSource(inner: FileSource): {
  source: FileSource
  calls: string[]
  completed: string[]
  gate(path: string): Deferred<void>
} {
  const gates = new Map<string, Deferred<void>>()
  const calls: string[] = []
  const completed: string[] = []
  const source: FileSource = {
    readText: (rel, signal) => inner.readText(rel, signal),
    readJson: (rel, signal) => inner.readJson(rel, signal),
    urlFor: (rel) => inner.urlFor(rel),
    async readBytes(rel, signal) {
      calls.push(rel)
      await gates.get(rel)?.promise
      const bytes = await inner.readBytes(rel, signal)
      completed.push(rel)
      return bytes
    },
    dispose: () => inner.dispose?.(),
  }
  return {
    source,
    calls,
    completed,
    gate(path) {
      const hold = deferred<void>()
      gates.set(path, hold)
      return hold
    },
  }
}
