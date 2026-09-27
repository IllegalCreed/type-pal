// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { installShellHost, type ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { shellProject } from './__tests__/runtime-shell/project.js'
import type { OpeningMenuObservation } from './opening-menu.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

test('opening observation follows actual frames and keys, cannot alter selection, and exposes load phase', async () => {
  host = await installShellHost()
  const h = host
  const fixture = await shellProject()
  const { loadMenuAssets } = await import('./menu/menu-box.js')
  const { MemorySaveStore } = await import('./save/store.js')
  const { runOpeningMenu } = await import('./opening-menu.js')
  const ctx = document.querySelector('canvas')?.getContext('2d')
  if (!ctx) throw new Error('missing canvas')
  const frames: OpeningMenuObservation[] = []
  const items = [
    { id: 'first', label: 'A' },
    { id: 'second', label: 'B' },
  ]
  const before = structuredClone(items)
  const pending = runOpeningMenu({
    ctx,
    glyphs: { has: () => false, get: () => undefined },
    bg: document.createElement('canvas'),
    worldScale: 1,
    locale: {},
    items,
    menuAssets: await loadMenuAssets({}, fixture.project.imageCache),
    saveStore: new MemorySaveStore({ kind: 'project', projectId: 'shell-project' }),
    observe: (s) => {
      frames.push(s)
    },
  })
  expect(frames).toEqual([])
  h.frame()
  expect(frames.at(-1)).toEqual({ phase: 'menu', cursor: 0, selectedId: 'first' })
  expect(Reflect.set(frames[0]!, 'cursor', 1)).toBe(false)
  h.key('ArrowDown')
  h.release('ArrowDown')
  h.frame()
  expect(frames.at(-1)).toEqual({ phase: 'menu', cursor: 1, selectedId: 'second' })
  h.key('ArrowDown')
  h.release('ArrowDown')
  h.frame()
  expect(frames.at(-1)?.selectedId).toBe('__load__')
  h.key('Enter')
  h.release('Enter')
  await vi.waitFor(() => {
    h.frame()
    expect(frames.at(-1)?.phase).toBe('load')
  })
  expect(frames.at(-1)).toEqual({ phase: 'load', cursor: 0, selectedId: null })
  h.key('Escape')
  h.release('Escape')
  h.key('ArrowUp')
  h.release('ArrowUp')
  h.frame()
  expect(frames.at(-1)).toEqual({ phase: 'menu', cursor: 1, selectedId: 'second' })
  h.key('Enter')
  h.release('Enter')
  await expect(pending).resolves.toEqual({ kind: 'new', entryId: 'second' })
  const count = frames.length
  h.frame()
  expect(frames).toHaveLength(count)
  expect(items).toEqual(before)
})
