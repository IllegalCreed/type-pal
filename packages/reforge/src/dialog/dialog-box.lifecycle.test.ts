// @vitest-environment jsdom
import type { Dialogue } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import { installShellHost, type ShellHost } from '../__tests__/runtime-shell/dom-host.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})

async function box() {
  host = await installShellHost()
  const { DialogBox } = await import('./dialog-box.js')
  const { startDialogue } = await import('../dialogue.js')
  const context = document.querySelector('canvas')?.getContext('2d')
  if (!context) throw new Error('test canvas unavailable')
  const glyph = { width: 8, height: 8, bitmap: new Uint8Array(8).fill(255) }
  const glyphs = { has: () => true, get: () => glyph }
  return { ui: new DialogBox(context, glyphs, []), startDialogue, h: host }
}

function drawnRows(h: ShellHost): unknown[] {
  return h.draws.filter(({ method }) => method === 'drawImage').map(({ args }) => args[2])
}

test('关闭后两槽清空，重开单槽仅在新正文位置绘制', async () => {
  const { ui, startDialogue, h } = await box()
  const coexist: Dialogue = {
    id: 'coexist',
    cues: [
      { slot: 'bottom', rows: [{ text: 'BOTTOM', speed: 10 }] },
      { slot: 'top', rows: [{ text: 'TOP', speed: 10 }] },
    ],
  }
  ui.open(startDialogue(coexist), 0)
  expect(ui.observe()).toMatchObject({ slot: 'bottom', cueIndex: 0 })
  ui.render(100)
  ui.advance(101)
  expect(ui.observe()).toMatchObject({ cueIndex: 1, slot: 'top' })
  h.draws.length = 0
  ui.render(200)
  expect(ui.observeSlots()).toMatchObject([
    { slot: 'bottom', active: false, visibleText: 'BOTTOM' },
    { slot: 'top', active: true, visibleText: 'TOP' },
  ])
  expect(new Set(drawnRows(h))).toEqual(new Set([26, 27, 126, 127]))

  ui.close()
  expect(ui.active).toBe(false)
  expect(ui.observeSlots()).toEqual([])

  h.draws.length = 0
  const single: Dialogue = { id: 'single', cues: [{ rows: [{ text: 'ONLY' }] }] }
  ui.open(startDialogue(single), 300)
  ui.render(400)
  expect(ui.observeSlots()).toMatchObject([{ slot: 'bottom', active: true, visibleText: 'ONLY' }])
  expect(new Set(drawnRows(h))).toEqual(new Set([126, 127]))
})

test('关闭后 advance 与 render 是无观察副作用的 noop', async () => {
  const { ui, startDialogue, h } = await box()
  ui.open(startDialogue({ id: 'gone', cues: [{ rows: [{ text: 'A' }] }] }), 0)
  ui.close()
  ui.close()
  h.draws.length = 0
  ui.advance(5)
  ui.render(5)
  expect(h.draws).toEqual([])
  expect(ui.active).toBe(false)
  expect(ui.observe()).toBeNull()
})
