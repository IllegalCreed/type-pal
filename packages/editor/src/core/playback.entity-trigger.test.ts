import {
  type AuthorSceneDef,
  emptyWorldScriptState,
  type Locale,
  resolveAuthorDialogueTree,
  validateActors,
  validateAuthorScenes,
} from '@type-pal/content'
import { runtimeSceneView } from '@type-pal/reforge'
import { afterEach, expect, test } from 'vitest'
import actorsJson from '../../../../projects/pal/content/actors.json' with { type: 'json' }
import locale from '../../../../projects/pal/content/locale.json' with { type: 'json' }
import roomsJson from '../../../../projects/pal/content/scenes/s001.json' with { type: 'json' }
import innJson from '../../../../projects/pal/content/scenes/s003.json' with { type: 'json' }
import { flowOf, settle } from './__tests__/playback-canonical-fixtures.js'
import { Playback } from './playback.js'

const live: Playback[] = []
afterEach(() => {
  for (const p of live.splice(0)) p.stop()
})
const target = { scene: 'room', entity: 'b' }
function scene(): AuthorSceneDef {
  return {
    id: 'room',
    mapId: 'map',
    entry: { pos: { col: 0, row: 0, height: 0 }, facing: 'down' },
    entities: [
      { id: 'a', zone: true, pos: { col: 0, row: 0, height: 0 } },
      {
        id: 'b',
        zone: true,
        pos: { col: 1, row: 0, height: 0 },
        initialPage: 'page',
        pages: [{ id: 'page', label: 'page', trigger: 'talk' }],
        behaviors: {
          trigger: {
            talk: {
              label: 'talk',
              order: 0,
              flow: flowOf([
                { kind: 'setPartyFacing', facing: 'left' },
                { kind: 'setPartyFacing', facing: 'up' },
              ]),
            },
          },
        },
      },
    ],
  }
}
function playback(author: AuthorSceneDef, text: Locale = {}) {
  const p = new Playback(
    runtimeSceneView(resolveAuthorDialogueTree(author, {}, 'test.scene'), emptyWorldScriptState()),
    undefined,
    undefined,
    text,
  )
  live.push(p)
  return p
}

test('explicit NPC call steps into its real child, resumes parent, stops, and never writes author data', async () => {
  const author = scene(),
    before = structuredClone(author),
    p = playback(author)
  const flow = flowOf([
    { kind: 'runEntityTrigger', target },
    { kind: 'setPartyFacing', facing: 'right' },
  ])
  const start = () =>
    p.playCanonical('call', flow, {
      scene: author,
      sharedScripts: {},
      actorsById: {},
      self: { scene: 'room', entity: 'a' },
      paused: true,
    })
  start()
  await settle()
  expect(p.stepNumber).toBe(0)
  p.step()
  await settle()
  expect(p.activePath).toBe('main/0')
  expect(p.view.player.facing).toBe('down')
  p.step()
  await settle()
  expect(p.activePath).toBe('entity:room/b/main/0')
  expect(p.view.player.facing).toBe('left')
  expect(p.mode).toBe('paused')
  p.tick(20_000)
  await settle()
  expect(p.view.player.facing).toBe('left')
  p.step()
  await settle()
  expect(p.view.player.facing).toBe('up')
  p.step()
  await settle()
  expect(p.view.player.facing).toBe('right')
  expect(p.mode).toBe('done')
  expect(p.stepNumber).toBe(4)
  expect(p.view.logs).toEqual([])
  start()
  await settle()
  p.step()
  await settle()
  p.step()
  await settle()
  p.stop()
  p.tick(20_000)
  await settle()
  expect(p.mode).toBe('idle')
  expect(author).toEqual(before)
  start()
  await settle()
  p.resume()
  await settle()
  expect(p.mode).toBe('done')
  expect(p.view.player.facing).toBe('right')
  expect(author).toEqual(before)
})

test('selected entity preview has a real owner and rejects self reentry, not a log stub', async () => {
  const author = scene(),
    before = structuredClone(author),
    p = playback(author)
  p.playCanonical(
    'reentry',
    flowOf([
      { kind: 'runEntityTrigger', target },
      { kind: 'giveMoney', delta: 99 },
    ]),
    {
      scene: author,
      sharedScripts: {},
      actorsById: {},
      self: target,
    },
  )
  await settle()
  expect(p.view.logs).toHaveLength(1)
  expect(p.view.logs[0]).toMatch(/busy\/重入/)
  expect(p.view.logs.join(' ')).not.toContain('+99')
  expect(author).toEqual(before)
})

test.each([
  false,
  true,
])('cross-scene binding uses supplied definitions, missing definitions fail loudly: %s', async (provided) => {
  const author = scene(),
    other = { ...scene(), id: 'other' },
    before = structuredClone([author, other]),
    p = playback(author)
  p.playCanonical(
    'binding',
    flowOf([
      {
        kind: 'selectEntityBehavior',
        target: { scene: 'other', entity: 'b' },
        channel: 'trigger',
        selection: { kind: 'use', value: 'talk' },
      },
      { kind: 'giveMoney', delta: 7 },
    ]),
    {
      scene: author,
      ...(provided ? { scenes: [author, other] } : {}),
      sharedScripts: {},
      actorsById: {},
    },
  )
  await settle()
  expect(p.mode).toBe('done')
  expect(p.view.logs).toEqual(
    provided ? ['💰 +7 钱'] : [expect.stringContaining('预览没有作者场景定义 other')],
  )
  expect([author, other]).toEqual(before)
})

test.each([
  'npc',
  'caller',
])('actual PAL gift %s preview completes through aunt 207 and hero 209 without author writeback', async (entry) => {
  const scenes = validateAuthorScenes([roomsJson, innJson])
  const author = scenes.find((entry) => entry.id === 's003')!
  const actors = Object.fromEntries(validateActors(actorsJson).map((actor) => [actor.id, actor]))
  const gift = author.entities.find((entity) => entity.id === 'e62')!.behaviors!.trigger![
    'c8-321c0a7d7de1'
  ]!.flow
  const before = structuredClone({ scenes, actors, gift })
  const p = new Playback(
    runtimeSceneView(
      resolveAuthorDialogueTree(author, actors, 'pal.preview'),
      emptyWorldScriptState(),
    ),
    undefined,
    new Map([['272', '桂花酒']]),
    locale,
  )
  live.push(p)
  const rows: string[] = []
  const target = { scene: 's003', entity: 'e62' }
  const flow =
    entry === 'npc'
      ? gift
      : flowOf([
          {
            kind: 'selectEntityBehavior',
            target,
            channel: 'trigger',
            selection: { kind: 'use', value: 'c8-321c0a7d7de1' },
          },
          { kind: 'runEntityTrigger', target },
        ])
  p.playCanonical('gift', flow, {
    scene: author,
    scenes,
    sharedScripts: {},
    actorsById: actors,
    ...(entry === 'npc' ? { self: target } : {}),
  })
  for (let step = 0; step < 200 && p.mode !== 'done'; step++) {
    await settle()
    if (p.view.dialog) {
      rows.push(...p.view.dialog.cue.rows.map((row) => row.text))
      p.confirmDialog()
    } else p.tick(10_000)
  }
  await settle()
  expect(p.mode).toBe('done')
  expect(rows.slice(-2)).toEqual(['dlg.207', 'dlg.209'])
  expect(p.view.logs.some((line) => line.startsWith('⚠'))).toBe(false)
  expect(p.view.logs).toContain('📤 失 桂花酒（272） ×1')
  expect({ scenes, actors, gift }).toEqual(before)
})
