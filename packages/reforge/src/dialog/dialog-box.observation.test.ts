// @vitest-environment jsdom
import { type Dialogue, resolveAuthorDialogueCue, validateAuthorScenes } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import authorInn from '../../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
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
  // Legitimate fixed-width ASCII glyphs; real layout/typewriter/render functions, Canvas IO only is stubbed.
  const glyph = { width: 8, height: 8, bitmap: new Uint8Array(8).fill(255) }
  const glyphs = { has: () => true, get: () => glyph }
  return { ui: new DialogBox(context, glyphs, []), startDialogue, h: host }
}

test('observing cannot type, draw, page or mutate the real cue; pagination follows rendered state', async () => {
  const { ui, startDialogue, h } = await box()
  const dialogue: Dialogue = {
    id: 'pages',
    cues: [{ rows: ['A', 'B', 'C', 'D', 'E'].map((text) => ({ text, speed: 10 })) }],
  }
  const before = structuredClone(dialogue)
  expect(ui.observe()).toBeNull()
  ui.open(startDialogue(dialogue), 0)
  const initial = ui.observe()
  expect(initial).toEqual({
    dialogueId: 'pages',
    cueIndex: 0,
    slot: 'bottom',
    pageIndex: 0,
    pageCount: 2,
    pageStartedAtMs: 0,
    phase: 'typing',
    speaker: null,
    rowTextIds: ['A', 'B', 'C', 'D', 'E'],
    pageTextIds: ['A', 'B', 'C', 'D'],
    pageText: 'A\nB\nC\nD',
  })
  const drawCount = h.draws.length
  for (let i = 0; i < 20; i++) expect(ui.observe()).toEqual(initial)
  expect(h.draws).toHaveLength(drawCount)
  expect(Reflect.set(initial!, 'phase', 'waiting-input')).toBe(false)
  expect(Reflect.set(initial!.rowTextIds, '0', 'changed')).toBe(false)
  expect(Reflect.set(initial!.pageTextIds, '0', 'changed')).toBe(false)
  expect(dialogue).toEqual(before)
  ui.render(25)
  expect(ui.observe()?.phase).toBe('typing')
  ui.render(40)
  expect(ui.observe()?.phase).toBe('waiting-input')
  ui.advance(45)
  expect(ui.observe()).toMatchObject({
    pageIndex: 1,
    pageStartedAtMs: 45,
    phase: 'typing',
    pageTextIds: ['E'],
    pageText: 'E',
  })
  ui.render(55)
  expect(ui.observe()?.phase).toBe('waiting-input')
  ui.advance(60)
  expect(ui.observe()).toBeNull()
  expect(dialogue).toEqual(before)
})

test('auto tail is observed but cannot be accelerated; active slot tracks the real next cue', async () => {
  const { ui, startDialogue } = await box()
  ui.open(
    startDialogue({
      id: 'auto',
      cues: [
        { slot: 'bottom', rows: [{ text: 'A', speed: 10 }], autoAdvance: 100 },
        { slot: 'top', speaker: 'name', rows: [{ text: 'B', speed: 10 }] },
      ],
    }),
    100,
  )
  ui.render(110)
  const tail = ui.observe()
  expect(tail).toMatchObject({ cueIndex: 0, phase: 'auto-advance', slot: 'bottom' })
  ui.advance(150)
  expect(ui.observe()).toEqual(tail)
  ui.render(209)
  expect(ui.observe()).toEqual(tail)
  ui.render(210)
  expect(ui.observe()).toMatchObject({
    cueIndex: 1,
    slot: 'top',
    speaker: 'name',
    phase: 'typing',
    rowTextIds: ['B'],
  })
  ui.close()
  expect(ui.observe()).toBeNull()
})

test('narration becomes input-ready only after its actual render', async () => {
  const { ui, startDialogue } = await box()
  ui.open(startDialogue({ id: 'n', cues: [{ slot: 'narration', rows: [{ text: 'A' }] }] }), 0)
  expect(ui.observe()?.phase).toBe('typing')
  ui.render(0)
  expect(ui.observe()).toMatchObject({ slot: 'narration', phase: 'waiting-input' })
  ui.advance(1)
  expect(ui.observe()).toBeNull()
})

test('canonical inn reward is fully shown then closes after 1400ms without another confirmation', async () => {
  const { ui, startDialogue } = await box()
  const flow = validateAuthorScenes([structuredClone(authorInn)])[0]?.entities.find(
    (entity) => entity.id === 'e56',
  )?.behaviors?.trigger?.default?.flow
  if (flow?.kind !== 'stages') throw new Error('missing canonical inn flow')
  const command = flow.stages
    .find((stage) => stage.id === flow.initial)
    ?.body.find(
      (entry) => entry.kind === 'dialog' && entry.cue.rows.some((row) => row.text === 'dlg.51'),
    )
  if (command?.kind !== 'dialog') throw new Error('missing canonical reward cue')
  const cue = resolveAuthorDialogueCue(command.cue, {})
  ui.open(startDialogue({ id: 'inn-reward', cues: [cue] }), 100)
  ui.render(100)
  expect(ui.observe()).toMatchObject({
    slot: 'narration',
    phase: 'auto-advance',
    rowTextIds: ['dlg.51'],
  })
  ui.render(1499)
  expect(ui.observe()?.phase).toBe('auto-advance')
  ui.render(1500)
  expect(ui.observe()).toBeNull()
})
