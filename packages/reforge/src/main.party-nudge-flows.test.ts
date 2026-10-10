// @vitest-environment jsdom
import type { AuthorCommand } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellScene } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  state,
} from './__tests__/runtime-shell/scenarios.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(() => {
  host?.close()
  host = undefined
})

async function bootNudge(commands: AuthorCommand[]) {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const sprites = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const gesture = vi.spyOn(WorldScenePresentation.prototype, 'setPartyGesture')
  const fixture = await bootScenario(host, {
    first: sceneWithCommands('a', [
      { kind: 'wait', ms: 200 },
      { kind: 'setPartyFacing', facing: 'right' },
      ...commands,
      { kind: 'giveMoney', delta: 9 },
    ]),
  })
  return { ...fixture, sprites, gesture }
}

test('nonzero authored nudge keeps actual gait during its wait and settles after script ownership ends', async () => {
  const h = await bootNudge([
    { kind: 'nudgeParty', dx: 10, dy: 10 },
    { kind: 'wait', ms: 320 },
    { kind: 'nudgeParty', dx: 6, dy: 6 },
    { kind: 'wait', ms: 320 },
  ])
  await advance(h.h, () => state().player.pos.col !== 2)
  const first = structuredClone(state().player.pos)
  const start = h.sprites.mock.calls.length
  await h.h.frame(16)
  await h.h.frame(16)
  const held = h.sprites.mock.calls.slice(start).map(([input]) => input.player)
  expect(held).toHaveLength(2)
  expect(held.every((player) => player.walking)).toBe(true)
  expect(held[0]?.stepFrame).toBe(held[1]?.stepFrame)
  expect(state().player.pos).toEqual(first)
  await advance(h.h, () => !state().script.running && state().world.money === 59)
  await h.h.frame(16)
  expect(h.sprites.mock.lastCall?.[0].player.walking).toBe(false)
  expect(state().player.pos).toEqual({ col: 3.5, row: 2.5, height: 0 })
  h.assertInputUnchanged()
})

test('a zero nudge preserves pose and phase; explicit leader pose supersedes preceding gait', async () => {
  const h = await bootNudge([
    { kind: 'nudgeParty', dx: 10, dy: 10 },
    { kind: 'setPartyFacing', facing: 'down', gesture: 2 },
    { kind: 'nudgeParty', dx: 0, dy: 0 },
    { kind: 'wait', ms: 320 },
  ])
  await advance(h.h, () => state().player.pos.col !== 2)
  await h.h.frame(16)
  expect(h.sprites.mock.lastCall?.[0].player.walking).toBe(false)
  const first = h.sprites.mock.lastCall?.[0]
  expect(h.gesture.mock.lastCall).toEqual([2])
  const phase = first?.player.stepFrame
  await h.h.frame(16)
  expect(h.sprites.mock.lastCall?.[0].player.stepFrame).toBe(phase)
  h.assertInputUnchanged()
})

test('an already pending real load cancels a nudge wait without late movement or rewards', async () => {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const sprites = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const gesture = vi.spyOn(WorldScenePresentation.prototype, 'setPartyGesture')
  const first = shellScene('a')
  first.entities = [
    {
      id: 'npc',
      sprite: 'walker',
      pos: { col: 2, row: 3, height: 0 },
      pages: [
        {
          id: 'normal',
          label: 'Normal',
          trigger: 'stair',
          triggerActivation: { on: 'interact', range: 2 },
        },
      ],
      initialPage: 'normal',
      behaviors: {
        trigger: {
          stair: {
            label: 'Stair',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'one',
              stages: [
                {
                  id: 'one',
                  body: [
                    { kind: 'nudgeParty', dx: 10, dy: 10 },
                    { kind: 'wait', ms: 800 },
                    { kind: 'nudgeParty', dx: 6, dy: 6 },
                    { kind: 'giveMoney', delta: 9 },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]
  const h = await bootScenario(host, { first })
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  await vi.waitFor(async () => expect(await store.getPayload('quick')).not.toBeNull())
  const before = structuredClone(state().player.pos)
  const money = state().world.money
  const held = host.holdNextPayloadRead()
  try {
    // Queue a legitimate load while idle, then start the script before IDB delivers it.
    // Exploration keys correctly cannot cancel an already-running story script.
    await key(host, 'F9')
    await advance(host, () => held.entered)
    await key(host, 'Enter')
    await advance(host, () => state().player.pos.col !== before.col)
    await host.frame(16)
    expect(sprites.mock.lastCall?.[0].player.walking).toBe(true)
    held.release()
    await held.consumed
    await advance(host, () => !state().script.running && state().player.pos.col === before.col)
    for (let i = 0; i < 20; i++) {
      await host.frame(100)
      await host.settleIO()
    }
    expect(state().player.pos).toEqual(before)
    expect(state().world.money).toBe(money)
    expect(sprites.mock.lastCall?.[0].player.walking).toBe(false)
    expect(gesture.mock.lastCall).toEqual([null])
    await key(host, 'Escape')
    expect(state().renderDebug.menuActive).toBe(true)
    h.assertInputUnchanged()
  } finally {
    held.release()
  }
})
