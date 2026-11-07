// @vitest-environment jsdom
import type { AuthorAcquisitionFlow, AuthorSceneDef } from '@type-pal/content'
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { shellScene } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  installShellHost,
  medicine,
  state,
} from './__tests__/runtime-shell/scenarios.js'
import { IndexedDbSaveStore } from './save/store.js'

let host: ShellHost | undefined
afterEach(async () => {
  await host?.close()
  host = undefined
})
const rewards = [
  { kind: 'item' as const, itemId: 'tonic', count: 2 },
  { kind: 'money' as const, amount: 7 },
]
const stages = { available: { id: 'unopened' }, collected: { id: 'empty' } }
const empty = {
  kind: 'custom' as const,
  cue: {
    identity: { kind: 'narration' as const },
    slot: 'narration' as const,
    rows: [{ text: 'line.two' }],
  },
}
function withRecipe(flow: AuthorAcquisitionFlow): AuthorSceneDef {
  return {
    ...shellScene('a'),
    entities: [
      {
        id: 'box',
        sprite: 'walker',
        pos: { col: 2, row: 3, height: 0 },
        initialPage: 'active',
        pages: [
          {
            id: 'active',
            label: 'Active',
            trigger: 'collect',
            triggerActivation: { on: 'interact', range: 2 },
          },
        ],
        behaviors: { trigger: { collect: { label: 'Collect', order: 0, flow } } },
      },
    ],
  }
}

// This path runs the current author loader, real shell input, ordinary runtime leaves,
// world inventory/money, SAVE12 storage and restore. Only browser IO uses the shared host.
test('ordinary chest grants ordered rewards once; empty reply and saved owner cursor survive F5/F9', async () => {
  host = await installShellHost()
  const booted = await bootScenario(host, {
    first: withRecipe({
      kind: 'acquisition',
      recipe: 'builtin/item/chest',
      rewards,
      stages,
      opening: { facing: 'down', frame: 1 },
      notice: { kind: 'standard', timing: 'before' },
      empty,
    }),
    items: [medicine()],
  })
  await key(host, 'Enter')
  await advance(host, () => state().dialogue)
  expect(state().world.inventory).toEqual([])
  expect(state().world.money).toBe(50)
  await key(host, 'Enter')
  await advance(host, () => state().dialogue)
  expect(state().world.money).toBe(50)
  await key(host, 'Enter')
  await advance(host, () => !state().script.running)
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  expect(state().world.money).toBe(57)
  expect(state().world.script?.behaviors.entities?.a?.box?.trigger?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'empty',
  })
  const store = new IndexedDbSaveStore({ kind: 'project', projectId: 'shell-project' })
  await key(host, 'F5')
  for (let index = 0; index < 40 && !(await store.getPayload('quick')); index++) {
    await host.frame(100)
    await drain()
    await host.settleIO()
  }
  const saved = await store.getPayload('quick')
  expect(saved?.version).toBe(12)
  expect(saved?.world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  await key(host, 'F9')
  await host.settleIO()
  await advance(host, () => !state().script.running)
  await key(host, 'Enter')
  await advance(host, () => state().dialogue)
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  expect(state().world.money).toBe(57)
  await key(host, 'Enter')
  await advance(host, () => !state().script.running)
  expect(state().world.script?.behaviors.entities?.a?.box?.trigger?.cursor?.at).toEqual({
    kind: 'stage',
    stage: 'empty',
  })
  booted.assertInputUnchanged()
})

test.each([
  'pickup',
  'disabled-search',
  'repeat-search',
] as const)('%s preserves the disappearance moment and cannot grant a second reward', async (kind) => {
  host = await installShellHost()
  const base = {
    kind: 'acquisition' as const,
    rewards: [rewards[0]!],
    notice: {
      kind: 'custom' as const,
      timing: 'before' as const,
      cue: {
        identity: { kind: 'narration' as const },
        slot: 'narration' as const,
        rows: [{ text: 'line.one' }],
      },
    },
  }
  const flow: AuthorAcquisitionFlow =
    kind === 'pickup'
      ? { ...base, recipe: 'builtin/item/pickup', stages: { available: stages.available } }
      : kind === 'disabled-search'
        ? { ...base, recipe: 'builtin/item/search', afterCollect: 'disable', stages }
        : { ...base, recipe: 'builtin/item/search', afterCollect: 'repeat', stages, empty }
  const booted = await bootScenario(host, { first: withRecipe(flow), items: [medicine()] })
  await key(host, 'Enter')
  await advance(host, () => state().dialogue)
  expect(state().world.inventory).toEqual([])
  expect(state().world.script?.entityState.a?.box).toBe(kind === 'pickup' ? 0 : undefined)
  await key(host, 'Enter')
  await advance(host, () => !state().script.running)
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  expect(state().world.script?.entityState.a?.box).toBe(kind === 'repeat-search' ? undefined : 0)
  await key(host, 'Enter')
  await host.frame(100)
  await drain()
  expect(state().dialogue).toBe(kind === 'repeat-search')
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  booted.assertInputUnchanged()
})
