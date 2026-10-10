// @vitest-environment jsdom
// Q01 · opening-menu 残差（排重：H2 flows 已证 ↓/→ 选入口、空档 Esc 回退、跨页读档、
// 观察快照与音乐生命周期；本文件只补未覆盖按键臂与缩略图容错臂）。
import { buildWorld } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key, until } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import type { OpeningDecision, OpeningMenuObservation } from './opening-menu.js'
import { buildCurrentSavePayload } from './save/ops.js'
import { MemorySaveStore } from './save/store.js'
import type { SaveMeta } from './save/types.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

async function opening(metas: SaveMeta[] = []) {
  host = await installShellHost()
  const fixture = await shellProject()
  const { loadMenuAssets } = await import('./menu/menu-box.js')
  const { projectItemsView } = await import('./runtime-project-view.js')
  const { loadGlyphs } = await import('./text/glyph.js')
  const { runOpeningMenu } = await import('./opening-menu.js')
  const menuAssets = await loadMenuAssets(
    projectItemsView(fixture.project.items),
    fixture.project.imageCache,
  )
  const store = new MemorySaveStore({ kind: 'project', projectId: 'shell-project' })
  const entry = fixture.project.manifest.entryPoints[0]!
  const payload = buildCurrentSavePayload(
    buildWorld(entry.startWorld, fixture.project.actorsById),
    { sceneId: 'a', pos: { col: 2, row: 2, height: 0 }, facing: 'down' },
    'shell-project',
  )
  for (const meta of metas)
    await store.putSlot(
      meta,
      payload,
      new Blob([chromePng().slice().buffer], { type: 'image/png' }),
    )
  const reads: string[] = []
  const listMeta = store.listMeta.bind(store)
  const getThumb = store.getThumb.bind(store)
  vi.spyOn(store, 'listMeta').mockImplementation(() => {
    reads.push('meta')
    return listMeta()
  })
  vi.spyOn(store, 'getThumb').mockImplementation((slot) => {
    reads.push(`thumb:${slot}`)
    return getThumb(slot)
  })
  const canvas = document.querySelector('canvas')!
  const ctx = canvas.getContext('2d')!
  const snapshots: OpeningMenuObservation[] = []
  const done = runOpeningMenu({
    ctx,
    glyphs: await loadGlyphs(),
    bg: await createImageBitmap(new Blob([chromePng().slice().buffer])),
    items: [
      { id: 'first', label: 'A' },
      { id: 'second', label: 'AA' },
    ],
    worldScale: 4,
    locale: {},
    menuAssets,
    saveStore: store,
    observe: (snapshot) => snapshots.push(snapshot),
  })
  const state: { value?: OpeningDecision } = {}
  const consumed = done.then((value) => {
    state.value = value
  })
  await host.frame()
  return { h: host, state, done, consumed, reads, snapshots, bitmaps: host.bitmaps }
}

function press(value: string): KeyboardEvent {
  const event = new KeyboardEvent('keydown', { key: value, bubbles: true, cancelable: true })
  window.dispatchEvent(event)
  return event
}

test('Q01 菜单相位未处理键不拦截：不 preventDefault、光标不动、不选定', async () => {
  const o = await opening()
  const before = o.snapshots.at(-1)
  const event = press('x')
  await o.h.frame()
  await drain()
  expect(event.defaultPrevented).toBe(false)
  expect(o.snapshots.at(-1)?.cursor).toBe(before?.cursor ?? 0)
  expect(o.state.value).toBeUndefined()
  expect(o.h.frames.size).toBe(1)
})

test('Q01 末项 ArrowDown 环绕回首项并选定第一入口', async () => {
  const o = await opening()
  await key(o.h, 'ArrowUp') // → 旧の回忆(末项)
  expect(o.snapshots.at(-1)?.cursor).toBe(2)
  await key(o.h, 'ArrowDown') // 环绕 → 0
  expect(o.snapshots.at(-1)?.cursor).toBe(0)
  await key(o.h, 'Enter')
  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })
})

test('Q01 菜单相位 Enter/Space 之外的中排键不触发选定；Escape 不拦截', async () => {
  const o = await opening()
  const tab = press('Tab')
  await o.h.frame()
  expect(tab.defaultPrevented).toBe(false)
  expect(o.snapshots.at(-1)?.selectedId).toBe('first') // 光标仍 0
  const unboundEscape = press('Escape') // 菜单相位 Escape 未注册 → 不拦截
  await o.h.frame()
  expect(unboundEscape.defaultPrevented).toBe(false)
  expect(o.state.value).toBeUndefined()
})

test('Q01 读档相位未处理键早退且不 preventDefault；← 在首页钳制不 wrap', async () => {
  const o = await opening()
  await key(o.h, 'ArrowUp')
  await key(o.h, 'Enter') // 进读档相位
  await until(o.h, () => o.snapshots.at(-1)?.phase === 'load')
  const unhandled = press('b')
  await drain()
  expect(unhandled.defaultPrevented).toBe(false)
  const leftAtOrigin = press('ArrowLeft') // cursor 0 → -SLOTS_PER_PAGE 钳制为 0
  await drain()
  expect(leftAtOrigin.defaultPrevented).toBe(true)
  expect(o.snapshots.at(-1)?.phase).toBe('load')
  // Esc 退回菜单后（光标停在读取项）仍可开局，证明钳制未破坏状态机。
  await key(o.h, 'Escape')
  await key(o.h, 'ArrowUp')
  await key(o.h, 'ArrowUp')
  await key(o.h, 'Enter')
  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })
})

test('Q01 读档相位缩略图逐槽恰读一次：多帧渲染不重读 store', async () => {
  const metas: SaveMeta[] = [
    {
      slotId: '01',
      kind: 'manual',
      party: [{ name: 'Hero', level: 1 }],
      mapName: 'a',
      savedAt: 1,
    },
    {
      slotId: '02',
      kind: 'manual',
      party: [{ name: 'Friend', level: 2 }],
      mapName: 'a',
      savedAt: 2,
    },
  ]
  const o = await opening(metas)
  await key(o.h, 'ArrowUp')
  await key(o.h, 'Enter') // 进读档相位
  await until(o.h, () => o.snapshots.at(-1)?.phase === 'load')
  expect(o.reads[0]).toBe('meta')
  expect(o.reads.filter((read) => read === 'thumb:01')).toHaveLength(1)
  expect(o.reads.filter((read) => read === 'thumb:02')).toHaveLength(1)
  await o.h.frame(100)
  await o.h.frame(100)
  await drain()
  const totalReads = o.reads.length
  expect(totalReads).toBe(3) // meta + 两次 thumb，帧推进不再触发 store 读
  expect(o.h.draws.length).toBeGreaterThan(0)
  await key(o.h, 'Escape')
  await key(o.h, 'ArrowUp')
  await key(o.h, 'ArrowUp')
  await key(o.h, 'Enter')
  expect(await o.done).toEqual({ kind: 'new', entryId: 'first' })
})
