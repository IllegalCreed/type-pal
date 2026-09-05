// @vitest-environment jsdom
import type { ActorDef, AssetCatalogV1 } from '@type-pal/content'
import { act, useSyncExternalStore } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, test, vi } from 'vitest'
import type { EditorState } from '../core/edit-session.js'
import { EditSession } from '../core/edit-session.js'
import type { EditorAssetReader } from '../core/editor-asset-reader.js'
import { PortraitEditor } from './PortraitEditor.js'

let host: HTMLDivElement
let root: Root

const catalog: AssetCatalogV1 = {
  version: 1,
  assets: {
    'portrait.test.001': {
      kind: 'portrait',
      path: 'assets/portraits/001.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'portrait-001',
      label: '测试立绘一',
      origin: { kind: 'authored' },
    },
    'portrait.test.002': {
      kind: 'portrait',
      path: 'assets/portraits/002.png',
      mediaType: 'image/png',
      bytes: 1,
      sha256: 'portrait-002',
      label: '测试立绘二',
      origin: { kind: 'authored' },
    },
  },
}

const reader = {
  record: (id: string) => catalog.assets[id]!,
  readBytes: vi.fn(() => new Promise<ArrayBuffer>(() => undefined)),
} as unknown as EditorAssetReader

function actor(
  portraits: ActorDef['portraits'] = {
    default: 'portrait.test.001',
    expressions: { 微笑: 'portrait.test.001' },
  },
): ActorDef {
  return {
    id: 'hero',
    name: 'name.hero',
    spriteId: 'sprite.hero',
    portraits,
  }
}

function state(value = actor()): EditorState {
  return {
    actors: [value],
    scenes: [],
    items: [],
    skills: [],
    sprites: [],
    battleSprites: [],
    locale: { 'name.hero': '主角' },
    assetCatalog: catalog,
    assetBlobs: {},
    maps: {},
    sceneIndex: { version: 1, scenes: [] },
    mapIndex: { version: 1, maps: [] },
    tilesets: [],
    tilesetBlobs: {},
    scriptChunks: {},
    stamps: [],
    shops: [],
    poisons: [],
    levelUp: {},
  } as unknown as EditorState
}

function Harness(props: { session: EditSession }) {
  useSyncExternalStore(
    (callback) => props.session.subscribe(callback),
    () => props.session.getVersion(),
  )
  const current = props.session.getState()
  return (
    <PortraitEditor
      actor={current.actors[0]!}
      session={props.session}
      catalog={current.assetCatalog}
      reader={reader}
    />
  )
}

function button(label: string, scope: ParentNode = host): HTMLButtonElement {
  return [...scope.querySelectorAll<HTMLButtonElement>('button')].find(
    (candidate) => candidate.textContent?.trim() === label,
  )!
}

function setInputValue(input: HTMLInputElement, value: string): void {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set
  setter?.call(input, value)
  input.dispatchEvent(new Event('input', { bubbles: true }))
}

beforeEach(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})

afterEach(async () => {
  await act(async () => root.unmount())
  host.remove()
  vi.clearAllMocks()
})

describe('PortraitEditor', () => {
  test('[add-picker:actor/portrait] 标题动作弹窗明确确认后才添加表情且只写一条历史', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))

    const section = host.querySelector('.portrait-editor.ds-workbench-section')!
    const trigger = button('添加表情', section.querySelector('.ds-workbench-section__actions')!)
    expect(
      trigger.closest('[data-ds-add-picker-adoption]')?.getAttribute('data-ds-add-picker-adoption'),
    ).toBe('actor/portrait')
    expect(section.querySelectorAll('.portrait-entry')).toHaveLength(2)
    expect(section.querySelector('.ds-workbench-section__content > .ds-button')).toBeNull()

    await act(async () => trigger.click())
    let dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    let option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    expect(session.getHistoryVersion()).toBe(0)
    await act(async () => button('取消', dialog).click())
    expect(session.getHistoryVersion()).toBe(0)

    await act(async () => trigger.click())
    dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    await act(async () => button('添加表情', dialog).click())

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      微笑: 'portrait.test.001',
      表情1: 'portrait.test.002',
    })
    expect(host.querySelectorAll('.portrait-entry')).toHaveLength(3)
    await act(async () => {
      expect(session.undo()).toBe(true)
    })
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      微笑: 'portrait.test.001',
    })
  })

  test('没有立绘组时从标题动作选择主立绘，不再静默采用目录第一项', async () => {
    const session = new EditSession(state({ ...actor(), portraits: undefined }))
    await act(async () => root.render(<Harness session={session} />))

    expect(host.textContent).toContain('暂无对话立绘')
    const trigger = button('设置主立绘')
    await act(async () => trigger.click())
    const dialog = host.querySelector<HTMLDialogElement>('dialog[open]')!
    const option = [...dialog.querySelectorAll<HTMLElement>('[role="option"]')].find((candidate) =>
      candidate.textContent?.includes('测试立绘二'),
    )!
    await act(async () => option.click())
    await act(async () => button('设置主立绘', dialog).click())

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits).toEqual({ default: 'portrait.test.002' })
  })

  test('表情名称走共享草稿边界，Enter 与随后 blur 只提交一次', async () => {
    const session = new EditSession(state())
    await act(async () => root.render(<Harness session={session} />))
    const input = host.querySelector<HTMLInputElement>('[name="actor-portrait-expression-name"]')!

    await act(async () => setInputValue(input, '开心'))
    await act(async () =>
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })),
    )
    await act(async () => input.dispatchEvent(new FocusEvent('blur', { bubbles: true })))

    expect(session.getHistoryVersion()).toBe(1)
    expect(session.getState().actors[0]?.portraits?.expressions).toEqual({
      开心: 'portrait.test.001',
    })
  })
})
