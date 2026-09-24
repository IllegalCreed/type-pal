// @vitest-environment jsdom
import { validateEnemyTeams } from '@type-pal/content'
import { afterEach, expect, test, vi } from 'vitest'
import { battleHostFixture } from '../__tests__/battle-host-fixture.js'
import { SfxReadinessCollectionError } from '../audio/sfx.js'
import type { BattleLaunchOptions } from './battle-launch-preparation.js'

let f: Awaited<ReturnType<typeof battleHostFixture>> | undefined
afterEach(async () => {
  await f?.close()
  f = undefined
})
const prepare = (options?: BattleLaunchOptions, team = 'encounter') => {
  if (!f) throw new Error('fixture missing')
  return f.prep
    .prepare(team, options, new AbortController().signal, () => {}, vi.fn())
    .then((prepared) => ({ ...prepared, ...prepared.commit() }))
}

test('preparation retains all five canonical slots and snapshots inventory independently without publishing', async () => {
  f = await battleHostFixture()
  const team = f.fixture.project.enemyTeamsById.encounter!
  team.slots = [null, 'foe', null, null, 'foe']
  validateEnemyTeams([team])
  const before = structuredClone(team)
  const prepared = await prepare()
  expect(prepared.enemySlots.map((e) => e?.id ?? null)).toEqual([null, 'foe', null, null, 'foe'])
  expect(prepared.sessionOptions.worldPartyIdentities).toEqual([{ id: 'hero', template: 'hero' }])
  expect(prepared.sessionOptions.inventory).toEqual([{ itemId: 'tonic', count: 3 }])
  prepared.sessionOptions.inventory![0]!.count = 0
  expect(f.world()).toEqual(f.originalWorld)
  expect(team).toEqual(before)
  expect(f.host.active).toBeNull()
  expect(f.events).toEqual([])
  expect(prepared.sessionAssets.battleSprites.size).toBeGreaterThan(0)
})

test('DEV explicit enemy override is capped at five and never compacts missing slots', async () => {
  f = await battleHostFixture()
  const options = { enemyOverride: ['missing', 'foe', 'missing', 'foe', 'foe', 'foe'] }
  const before = structuredClone(options)
  const result = await prepare(options, 'not-a-canonical-team')
  expect(result.enemySlots.map((e) => e?.id ?? null)).toEqual([null, 'foe', null, 'foe', 'foe'])
  expect(options).toEqual(before)
  expect(f.world()).toEqual(f.originalWorld)
  f.assertInputs()
})

test.each([
  'missing',
  'empty',
] as const)('invalid %s encounter rejects without sound preparation', async (kind) => {
  f = await battleHostFixture()
  const sounds = vi.spyOn(f.sfx, 'prepare')
  await expect(
    prepare(kind === 'empty' ? { enemyOverride: [] } : undefined, 'missing'),
  ).rejects.toThrow('敌队没有有效敌人')
  expect(sounds).not.toHaveBeenCalled()
  expect(f.events).toEqual([])
  f.assertInputs()
})

test('explicit silence and optional flags survive preparation; source options remain untouched', async () => {
  f = await battleHostFixture()
  const options = { music: null, auto: true, boss: true, choreography: [] }
  const before = structuredClone(options)
  const result = await prepare(options)
  expect(result.battleTrack).toBeNull()
  expect(result.sessionOptions).toMatchObject({
    auto: true,
    boss: true,
    encounterChoreo: [],
    difficulty: 'normal',
    money: f.world().money,
  })
  expect(options).toEqual(before)
  f.assertInputs()
})

test('fatal base readiness failure retains error identity and prevents session publication', async () => {
  f = await battleHostFixture()
  const failure = new SfxReadinessCollectionError('not a recoverable asset miss')
  vi.spyOn(f.sfx, 'prepare').mockRejectedValueOnce(failure)
  await expect(f.host.start('encounter')).rejects.toBe(failure)
  expect(f.host.active).toBeNull()
  expect(f.events).toEqual([])
  expect(f.world()).toEqual(f.originalWorld)
})

test('turn readiness reuses the complete base set without mutating the submitted action snapshot', async () => {
  f = await battleHostFixture(true)
  const sounds = vi.spyOn(f.sfx, 'prepare')
  const result = await prepare()
  const snapshot = { turn: 2, actions: new Map(), activePlayerPoisons: [], activeEnemyPoisons: [] }
  const before = structuredClone(snapshot)
  const base = new Set(sounds.mock.calls[0]![0])
  expect(base).toEqual(new Set(['attack']))
  await result.sessionOptions.prepareTurnSounds!(snapshot)
  expect(new Set(sounds.mock.calls[1]![0])).toEqual(base)
  expect(snapshot).toEqual(before)
  f.assertInputs()
})
