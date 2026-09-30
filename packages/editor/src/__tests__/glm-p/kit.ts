/**
 * TEST-GLM-WAVE-P-1 专属 fixture（白名单 packages/editor/src/__tests__/glm-p/**）：
 * Node/jsdom 测试宿主桥、最小合法 EditorState 构造器、「可保存合法项目」装载器
 * （blank seed → loader → toEditorState → assertProjectSaveValid 自证）与受控输入驱动。
 * 只被本波 *.glm-p.test.ts(x) 导入，不进生产；不与其它波 fixture 目录共享写入。
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
  /** 正式 AssetBase（source + assetResolver），供组件真实资产准备边界使用。 */
  assetBase: import('@type-pal/reforge').AssetBase
}

/**
 * 正式 blank 项目装载器：seed→memory 目录→loader→全量场景与地图正文→toEditorState，
 * 经 assertProjectSaveValid 自证可通过当前保存门。jsdom 环境需先 `await stubNodeTestHost()`。
 */
export async function loadLegalProject(name = 'glm-wave-p'): Promise<LegalProject> {
  const disk = memoryAuthorDirectory(await buildBlankProject(name))
  const source = fsaSource(disk.dir)
  const project = await loadCurrentProjectFrom(source)
  const scenes = await loadAllAuthorScenes(project)
  const maps = await loadAllProjectMaps(project)
  const state = toEditorState(project, scenes, maps, {}, [])
  assertProjectSaveValid(state)
  return { source, state, assetBase: project.assetBase }
}

/** Wave-P 专用最小合法 EditorState 夹具；只满足类型，不带任何业务默认值。 */
export function pManifest(): import('@type-pal/content').CurrentManifest {
  const entry: import('@type-pal/content').EntryPoint = {
    id: 'main',
    label: '主要入口',
    scene: 'scene-a',
    startWorld: { party: [], money: 0, inventory: [] },
  }
  return {
    id: 'wave-p',
    name: 'Wave-P 测试项目',
    contentVersion: 20,
    minimumSaveVersion: 8,
    defaultEntryId: 'main',
    entryPoints: [entry],
    content: {},
    assets: { catalog: 'assets/index.json', roles: {} },
  }
}

export function pEditorState(
  overrides: Partial<EditorState> & Partial<Pick<EditorState, 'maps'>> = {},
): EditorState {
  const base: Omit<EditorState, 'maps'> = {
    manifest: pManifest(),
    scenes: [],
    actors: [],
    skills: [],
    levelUp: {},
    items: [],
    locale: {},
    sprites: [],
    battleSprites: [],
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    scriptChunks: {},
    assetCatalog: { version: 1, assets: {} },
    assetBlobs: {},
    stamps: [],
    ...overrides,
  }
  return { ...base, ...(overrides.maps ? { maps: overrides.maps } : { maps: {} }) }
}

/** 注入 Node Blob 与 webcrypto（jsdom Blob 缺 stream()，gzip 编解码需要）；结束由 unstub 释放。 */
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

/** focus → 输入 → blur：一次成型的受控提交（draft 域会即时 commit）。 */
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

/** 在途输入（不 blur）——draft 域验证用。 */
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

/** DsField 协议：label[for] → data-ds-control-id 容器（控件常为 label 兄弟节点）。 */
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

/** 组合框协议：点击触发器，经 aria-controls 定位 listbox 内 role=option，按可见文本选择。 */
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

/** 复选框：按 label 文本定位并点击。 */
export async function clickCheckboxByLabelText(host: ParentNode, text: string): Promise<void> {
  const label = [...host.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `checkbox label ${text}`).toBeDefined()
  const control = label!.htmlFor
    ? (document.getElementById(label!.htmlFor) as HTMLInputElement | null)
    : label!.querySelector<HTMLInputElement>('input')
  expect(control, `checkbox control ${text}`).not.toBeNull()
  if (!control) throw new Error(`checkbox control 未找到：${text}`)
  await act(async () => {
    control.click()
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

/** 独立深快照：与输入完全脱离引用。 */
export function deepSnapshot<T>(value: T): T {
  return structuredClone(value)
}
