// @vitest-environment jsdom
import { buildWorld } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { chromePng, installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import type { OpeningDecision } from './opening-menu.js'
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
  // Transparent recording delegates to the actual store; no catalogue/thumbnail result is stubbed.
  const reads: string[] = []
  const listMeta = store.listMeta.bind(store),
    getThumb = store.getThumb.bind(store)
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
  })
  const state: { value?: OpeningDecision } = {}
  const consumed = done.then((value) => {
    state.value = value
  })
  host.frame()
  return {
    h: host,
    state,
    done,
    consumed,
    reads,
    async finish() {
      for (let i = 0; i < 3 && !state.value; i++) {
        await key(host!, 'Escape')
        await key(host!, 'ArrowDown')
        await key(host!, 'Enter')
      }
      expect(state.value).toBeDefined()
      await consumed
    },
  }
}

test.each([
  'ArrowDown',
  'ArrowRight',
] as const)('H2 %s chooses second entry and completion removes frame and key owner', async (direction) => {
  const o = await opening()
  try {
    await key(o.h, direction)
    await key(o.h, 'Enter')
    expect(await o.done).toEqual({ kind: 'new', entryId: 'second' })
    expect(o.h.frames.size).toBe(0)
    const draws = o.h.draws.length
    await key(o.h, 'ArrowDown')
    await key(o.h, 'Enter')
    expect(o.h.frames.size).toBe(0)
    expect(o.h.draws).toHaveLength(draws)
    expect(o.reads).toEqual([])
  } finally {
    await o.finish()
  }
})

test('H2 empty load slot stays unresolved; Escape returns to title and new entry still works', async () => {
  const o = await opening()
  try {
    await key(o.h, 'ArrowUp')
    await key(o.h, 'Enter')
    await drain()
    await key(o.h, 'Enter')
    expect(o.state.value).toBeUndefined()
    expect(o.reads).toEqual(['meta'])
    expect(o.h.frames.size).toBe(1)
    await key(o.h, 'Escape')
    await key(o.h, 'ArrowUp')
    await key(o.h, 'Enter')
    expect(await o.done).toEqual({ kind: 'new', entryId: 'second' })
  } finally {
    await o.finish()
  }
})

test('H2 real load browser crosses pages and returns selected nonempty slot after thumbnail reads', async () => {
  const o = await opening([
    {
      slotId: 'm02',
      kind: 'manual',
      party: [{ name: 'Hero', level: 1 }],
      mapName: 'Map',
      savedAt: 1000,
      savedTimes: 2,
    },
  ])
  try {
    await key(o.h, 'ArrowUp')
    await key(o.h, 'Enter')
    await drain()
    await key(o.h, 'ArrowRight')
    await key(o.h, 'Enter')
    expect(await o.done).toEqual({ kind: 'load', slotId: 'm02' })
    expect(o.reads).toEqual(['meta', 'thumb:m02'])
    expect(o.h.frames.size).toBe(0)
  } finally {
    await o.finish()
  }
})
