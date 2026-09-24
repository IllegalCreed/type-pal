// @vitest-environment jsdom
import { afterEach, expect, test } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands } from './__tests__/runtime-shell/project.js'
import {
  advance,
  bootScenario,
  combatActor,
  installShellHost,
  medicine,
  opponent,
  session,
  state,
} from './__tests__/runtime-shell/scenarios.js'

let host: ShellHost | undefined
afterEach(async () => {
  // Own the real session's termination even when an author-flow assertion fails early.
  if (host && state().renderDebug.inBattle) {
    const active = session()
    active.cancel()
    await active.done.catch(() => undefined)
    await drain()
  }
  host?.close()
  host = undefined
})
async function finish(h: ShellHost) {
  for (let i = 0; i < 100 && state().renderDebug.inBattle; i++) {
    await key(h, 'Enter', 100)
    await h.settleIO()
  }
  expect(state().renderDebug.inBattle).toBe(false)
}

test('H9 public battle runs actual settlement and onDefeated before resolving, preserving nonempty inventory', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    items: [medicine()],
    inventory: [{ itemId: 'tonic', count: 3 }],
    enemies: [opponent({ onDefeated: [{ kind: 'giveMoney', delta: 11 }] })],
  })
  const expected = structuredClone(state().world)
  const pending = state().startBattle('encounter')
  // Consume the exact public promise even if an assertion fails.
  const outcome = pending.then(
    (result) => ({ result }),
    (error: unknown) => ({ error }),
  )
  try {
    await advance(host, () => state().renderDebug.inBattle)
    expect(state().world).toEqual(expected)
    await finish(host)
    expect(await outcome).toEqual({ result: 'victory' })
    expected.money += 18
    // Current rewards contract restores half the missing HP/MP, even when exp is zero.
    expected.party[0]!.hp = 90
    expected.party[0]!.mp = 35
    expect(state().world).toEqual(expected)
    for (let i = 0; i < 10; i++) host.frame()
    expect(state().world).toEqual(expected)
    await key(host, 'Escape')
    expect(state().renderDebug.menuActive).toBe(true)
    h.assertInputUnchanged()
  } finally {
    if (state().renderDebug.inBattle) session().cancel()
    await outcome
  }
})

test('H9 author startBattle waits for real victory then runs the following command exactly once', async () => {
  host = await installShellHost()
  const h = await bootScenario(host, {
    first: sceneWithCommands('a', [
      { kind: 'startBattle', enemyTeamId: 'encounter', auto: true },
      { kind: 'giveMoney', delta: 5 },
    ]),
  })
  await advance(host, () => state().renderDebug.inBattle)
  expect(state().world.money).toBe(50)
  expect(state().script.running).toBe(true)
  await finish(host)
  await advance(host, () => !state().script.running)
  expect(state().world.money).toBe(62)
  expect(state().world.party[0]!.hp).toBe(90)
  h.assertInputUnchanged()
})

test('H9 real defeat writes zero HP, skips victory hooks and follows only onLose plus continuation', async () => {
  host = await installShellHost()
  const hero = combatActor()
  if (!hero.battler) throw new Error('missing battler')
  hero.battler.baseStats.hp = 1
  hero.battler.baseStats.attack = 1
  const foe = opponent({ onDefeated: [{ kind: 'giveMoney', delta: 1000 }] })
  foe.stats.health = 999
  foe.stats.attackStrength = 300
  const h = await bootScenario(host, {
    actors: [hero],
    enemies: [foe],
    first: sceneWithCommands('a', [
      {
        kind: 'startBattle',
        enemyTeamId: 'encounter',
        auto: true,
        onLose: [{ kind: 'giveMoney', delta: 3 }],
      },
      { kind: 'giveMoney', delta: 5 },
    ]),
  })
  await advance(host, () => state().renderDebug.inBattle)
  const expected = structuredClone(state().world)
  await finish(host)
  await advance(host, () => !state().script.running)
  expected.party[0]!.hp = 0
  expected.money += 8
  if (!expected.script) throw new Error('missing script state')
  expected.script.behaviors = {
    scenes: { a: { onEnter: { cursor: { hook: 'main', at: { kind: 'stage', stage: 's0' } } } } },
  }
  expect(state().world).toEqual(expected)
  h.assertInputUnchanged()
})

test('H9 thrown inventory is consumed by real battle and reaches the host world after victory', async () => {
  host = await installShellHost()
  const dart = medicine('dart')
  dart.throw = {
    target: 'oneEnemy',
    effects: [{ kind: 'currentHpDamage', numerator: 1, denominator: 2, bonus: 20, cap: 500 }],
  }
  const h = await bootScenario(host, {
    items: [dart, medicine()],
    inventory: [
      { itemId: 'dart', count: 2 },
      { itemId: 'tonic', count: 3 },
    ],
  })
  const expected = structuredClone(state().world)
  const pending = state().startBattle('encounter')
  const outcome = pending.then(
    (result) => ({ result }),
    (error: unknown) => ({ error }),
  )
  try {
    await advance(host, () => state().renderDebug.inBattle)
    await key(host, 'w')
    await key(host, 'Enter')
    await key(host, 'Enter')
    await finish(host)
    expect(await outcome).toEqual({ result: 'victory' })
    expected.money += 7
    expected.inventory[0]!.count = 1
    expected.party[0]!.hp = 90
    expected.party[0]!.mp = 35
    expect(state().world).toEqual(expected)
    h.assertInputUnchanged()
  } finally {
    if (state().renderDebug.inBattle) session().cancel()
    await outcome
  }
})

test('H9 missing enemy team rejects before any active session and leaves menu operable', async () => {
  host = await installShellHost()
  const h = await bootScenario(host)
  const before = structuredClone(state().world)
  await expect(state().startBattle('missing')).rejects.toThrow('敌队没有有效敌人')
  expect(state().renderDebug.inBattle).toBe(false)
  expect(state().world).toEqual(before)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  h.assertInputUnchanged()
})

test('H9 delayed battle sprite cannot commit a battle after the scene owner has changed', async () => {
  host = await installShellHost()
  const h = await bootScenario(host)
  const before = structuredClone(state().world)
  let entered = 0,
    completed = 0,
    release!: () => void
  const gate = new Promise<void>((resolve) => {
    release = resolve
  })
  h.fixture.hooks.read = async (path) => {
    if (path === 'assets/generated/fighter.rle') {
      entered++
      await gate
      completed++
    }
  }
  const observed: { settled: boolean; error?: unknown; result?: unknown } = { settled: false }
  const pending = state().startBattle('encounter')
  const outcome = pending.then(
    (result) => {
      observed.settled = true
      observed.result = result
    },
    (error: unknown) => {
      observed.settled = true
      observed.error = error
    },
  )
  try {
    await advance(host, () => entered > 0)
    expect(completed).toBe(0)
    expect(state().renderDebug.inBattle).toBe(false)
    await key(host, ']')
    await advance(host, () => state().sceneId === 'b')
    release()
    // Either actual rejection or an illicit late session is observable without awaiting
    // a mutated battle that would stay open forever. Cleanup never masks this assertion.
    await advance(host, () => observed.settled || state().renderDebug.inBattle)
    expect(observed).toMatchObject({ settled: true, error: { name: 'AbortError' } })
    await drain()
    expect(completed).toBe(entered)
    expect(state().sceneId).toBe('b')
    expect(state().renderDebug.inBattle).toBe(false)
    expect(state().world).toEqual(before)
    h.assertInputUnchanged()
  } finally {
    release()
    if (state().renderDebug.inBattle) session().cancel()
    await outcome
  }
})
