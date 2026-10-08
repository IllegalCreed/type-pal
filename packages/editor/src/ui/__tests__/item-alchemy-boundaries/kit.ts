/**
 * TEST-EDITOR-ALCHEMY-BOUNDARIES-1 专属夹具（白名单目录 item-alchemy-boundaries/）。
 * jsdom 挂载生命周期、订阅/静态双形态机制页 Surface、受控草稿输入驱动与炼蛊/灵葫
 * 合法项目播种。只被本卡新测试文件导入，不进生产；共享底座只读复用：
 * loadLegalUiProject（glm-ui-wave-kit 通用合法项目装载器）与 Node 宿主桥
 * （glm-leaf-workflows 白名单 node-bridge），不复制旧波 fixture 数值与断言。
 */
import type { ItemData, ItemRecipe } from '@type-pal/content'
import { act, createElement, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { expect, vi } from 'vitest'
import type { Command } from '../../../core/commands.js'
import type { EditorState } from '../../../core/edit-session.js'
import { EditSession } from '../../../core/edit-session.js'
import type { ItemAlchemySurface } from '../../../core/item-alchemy.js'
import { ItemAlchemyTab } from '../../ItemAlchemyTab.js'
import { stubNodeTestHost } from '../glm-leaf-workflows/node-bridge.js'
import { loadLegalUiProject } from '../glm-ui-wave-kit.js'

export interface BoundaryHost {
  host: HTMLDivElement
  root: Root
}

/** jsdom 挂载环境 + Node 测试宿主桥；afterEach 必须配对 destroyBoundaryHost 释放。 */
export async function createBoundaryHost(): Promise<BoundaryHost> {
  await stubNodeTestHost()
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    callback(0)
    return 1
  })
  const host = document.createElement('div')
  document.body.append(host)
  return { host, root: createRoot(host) }
}

export async function destroyBoundaryHost(target: BoundaryHost): Promise<void> {
  await act(async () => {
    target.root.unmount()
  })
  target.host.remove()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
}

export function plainItem(id: string, name = id): ItemData {
  return { id, name, desc: [], buyPrice: 0, sellPrice: 0, sellable: false }
}

export function craftVessel(
  id: string,
  name: string,
  recipes: ItemRecipe[],
  consuming = false,
): ItemData {
  return {
    ...plainItem(id, name),
    use: { target: 'scene', consuming, effects: [{ kind: 'craftRecipe', recipes }] },
  }
}

export interface RewardTier {
  itemId: string
  count: number
}

export function spiritGourd(
  id: string,
  name: string,
  maxRoll: number,
  rewards: RewardTier[],
): ItemData {
  return {
    ...plainItem(id, name),
    use: {
      target: 'scene',
      consuming: false,
      effects: [{ kind: 'drawFromResourcePool', resource: 'collectValue', maxRoll, rewards }],
    },
  }
}

let legalTemplate: EditorState | undefined

/** 真实 blank seed → 真实 loader → toEditorState（装载器内置保存门自证），items 按本卡播种替换。 */
async function legalState(items: ItemData[]): Promise<EditorState> {
  if (!legalTemplate) {
    legalTemplate = (await loadLegalUiProject('glm-alchemy-boundaries')).state
  }
  return { ...legalTemplate, items }
}

export async function seedSession(items: ItemData[]): Promise<EditSession> {
  return new EditSession(await legalState(items))
}

export interface AlchemySurfaceProps {
  session: EditSession
  surface: ItemAlchemySurface
  focus?: string
  /** 默认 true：真实 caller 形态（父级订阅 session 版本）。false = 静态快照挂载（合法 prop 形态）。 */
  subscribe?: boolean
  onObjectFocus?: (id: string | undefined) => void
  onOpenItem?: (id: string) => void
  onStatusNotice?: (notice: { kind: 'info' | 'error'; message: string } | undefined) => void
}

const staticSubscribe = () => () => undefined
const staticSnapshot = () => 0

/** 机制页挂载壳：items 始终取 session 当前 canonical；订阅形态模拟真实 DataMode 父级。 */
export function AlchemySurface(props: AlchemySurfaceProps) {
  const subscribed = props.subscribe !== false
  useSyncExternalStore(
    subscribed ? (callback: () => void) => props.session.subscribe(callback) : staticSubscribe,
    subscribed ? () => props.session.getVersion() : staticSnapshot,
  )
  return createElement(ItemAlchemyTab, {
    surface: props.surface,
    items: props.session.getState().items,
    session: props.session,
    focusObjectId: props.focus,
    onObjectFocus: props.onObjectFocus,
    onOpenItem: props.onOpenItem,
    onStatusNotice: props.onStatusNotice,
  })
}

export async function mountSurface(
  target: BoundaryHost,
  props: AlchemySurfaceProps,
): Promise<void> {
  await act(async () => {
    target.root.render(createElement(AlchemySurface, props))
    await Promise.resolve()
  })
}

export async function rerenderSurface(
  target: BoundaryHost,
  props: AlchemySurfaceProps,
): Promise<void> {
  await mountSurface(target, props)
}

/** 订阅形态下的公开命令派发：通知触发的组件更新不逃逸 act 域。 */
export async function dispatchInAct(session: EditSession, command: Command): Promise<boolean> {
  let applied = false
  await act(async () => {
    applied = session.dispatch(command)
  })
  return applied
}

export function undoInAct(session: EditSession): boolean {
  let result = false
  act(() => {
    result = session.undo()
  })
  return result
}

function setNativeValue(input: HTMLInputElement | HTMLTextAreaElement, value: string): void {
  const proto =
    input instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype
  const setter = Object.getOwnPropertyDescriptor(proto, 'value')!.set!
  setter.call(input, value)
}

/** focus → 输入 → blur 一次成型：与产品 DsDraft* 的 blur/commit 边界一致。 */
export async function fillAndBlur(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  await act(async () => {
    input.focus()
    setNativeValue(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

/** 在途输入（不 blur）：草稿生命周期用。 */
export async function typeDraft(
  input: HTMLInputElement | HTMLTextAreaElement,
  value: string,
): Promise<void> {
  await act(async () => {
    input.focus()
    setNativeValue(input, value)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  })
}

export async function blurField(input: HTMLInputElement | HTMLTextAreaElement): Promise<void> {
  await act(async () => {
    input.dispatchEvent(new FocusEvent('focusout', { bubbles: true }))
  })
}

/** DsField 协议：label 文本 → 关联控件。 */
export function controlByLabel<T extends HTMLElement>(scope: ParentNode, text: string): T {
  const label = [...scope.querySelectorAll<HTMLLabelElement>('label')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(label, `field label ${text} not found`).toBeDefined()
  const control = label!.htmlFor
    ? ((document.getElementById(label!.htmlFor) as T | null) ??
      (document.querySelector(`[data-ds-control-id="${label!.htmlFor}"]`) as T | null))
    : label!.querySelector<T>('button, input, textarea')
  expect(control, `field control ${text} not found`).toBeDefined()
  return control!
}

export function buttonByText(scope: ParentNode, text: string): HTMLButtonElement {
  const hit = [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === text,
  )
  expect(hit, `button ${text} not found`).toBeDefined()
  return hit!
}
