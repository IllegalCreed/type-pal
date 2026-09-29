// @vitest-environment jsdom
/**
 * TEST-GLM-LARGE-WAVE-4 C04（dialog-box 对）：槽位共存后的关闭清空与重开无旧结果覆写。
 * 去重：dialog-box.test 证 center/narration 无箭头；observation 3 例证观察冻结、分页、
 * auto 尾不可加速、narration render 门。本文件只补：异槽共存推进到 top 槽后 close，
 * 重开单槽对话时旧 top 槽渲染不得残留（open 重置 slots/renders 的合同），
 * 以及关闭后 advance/render 为无观察副作用的 noop。
 */
import type { Dialogue } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import { installShellHost, type ShellHost } from '../__tests__/runtime-shell/dom-host.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
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

test('异槽共存推进后关闭，重开单槽对话不残留旧槽渲染', async () => {
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
  ui.render(200)
  expect(ui.observe()).toMatchObject({ slot: 'top', cueIndex: 1 })
  ui.close()
  expect(ui.active).toBe(false)
  expect(ui.observe()).toBeNull()

  h.draws.length = 0
  const single: Dialogue = { id: 'single', cues: [{ rows: [{ text: 'ONLY' }] }] }
  ui.open(startDialogue(single), 20)
  ui.render(20)
  expect(ui.observe()).toMatchObject({ slot: 'bottom', cueIndex: 0 })
  const drawSnapshot = JSON.stringify(h.draws)
  expect(drawSnapshot).not.toContain('TOP')
})

test('关闭后 advance 与 render 是无观察副作用的 noop', async () => {
  const { ui, startDialogue } = await box()
  ui.open(startDialogue({ id: 'gone', cues: [{ rows: [{ text: 'A' }] }] }), 0)
  ui.close()
  ui.close()
  expect(() => ui.advance(5)).not.toThrow()
  expect(() => ui.render(5)).not.toThrow()
  expect(ui.active).toBe(false)
  expect(ui.observe()).toBeNull()
})
