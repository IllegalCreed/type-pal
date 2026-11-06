// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import type { ShellHost } from './__tests__/runtime-shell/dom-host.js'
import { drain, key } from './__tests__/runtime-shell/driver.js'
import { sceneWithCommands, shellScene } from './__tests__/runtime-shell/project.js'
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
  await host?.close()
  host = undefined
})
async function finish(h: ShellHost) {
  for (let i = 0; i < 100 && state().renderDebug.inBattle; i++) {
    await key(h, 'Enter', 100)
    await h.settleIO()
  }
  expect(state().renderDebug.inBattle).toBe(false)
}

function hostileEncounterClaimed(): boolean {
  const debug: unknown = Reflect.get(window, '__tpE2e')
  if (!debug || typeof debug !== 'object' || !('dumpMotionState' in debug))
    throw new Error('runtime motion observation is unavailable')
  if (typeof debug.dumpMotionState !== 'function') throw new Error('motion reader is unavailable')
  const motion: unknown = debug.dumpMotionState()
  if (!motion || typeof motion !== 'object' || !('hostileBusy' in motion))
    throw new Error('encounter observation is unavailable')
  if (typeof motion.hostileBusy !== 'boolean') throw new Error('invalid encounter observation')
  return motion.hostileBusy
}

test('a world hostile takes quarter-steps and only claims near contact at the next step', async () => {
  host = await installShellHost()
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const sprites = vi.spyOn(WorldScenePresentation.prototype, 'sprites')
  const first = sceneWithCommands('a', [
    { kind: 'animEntity', target: { scene: 'a', entity: 'chaser' } },
  ])
  first.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 5, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        chase: { range: 3, speed: 2 },
        onVictory: { kind: 'remain' },
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  const fixture = await bootScenario(host, { first })
  const enemyCol = () => state().entities.find((entity) => entity.id === 'chaser')?.pos.col
  const drawnFrame = () => {
    const painter = sprites.mock.contexts.at(-1)
    if (!(painter instanceof WorldScenePresentation))
      throw new Error('world painter was not called')
    return painter.renderedEntityFrame('chaser')
  }
  await host.frame(100)
  await drain()
  // Exactly at the chase radius, the authored idle pose still owns the draw.
  expect(state().player.pos).toEqual({ col: 2, row: 2, height: 0 })
  expect(enemyCol()).toBe(5)
  expect(drawnFrame()).toBe(1)
  await key(host, 'ArrowRight')
  expect(state().player.pos).toEqual({ col: 3, row: 2, height: 0 })
  expect(enemyCol()).toBe(5)
  // At 1.5 there is no pre-step contact. At 1.25 there is no post-step contact.
  for (const [phase, col] of [4.75, 4.5, 4.25].entries()) {
    await host.frame(100)
    await drain()
    expect(enemyCol()).toBe(col)
    expect(hostileEncounterClaimed()).toBe(false)
    expect(drawnFrame()).toBe(phase)
  }
  await host.frame(100)
  await drain()
  expect(enemyCol()).toBe(4.25)
  expect(hostileEncounterClaimed()).toBe(true)
  await advance(host, () => state().renderDebug.inBattle)
  expect(state().player.pos).toEqual({ col: 3, row: 2, height: 0 })
  fixture.assertInputUnchanged()
})

test.each([
  false,
  true,
])('landing touch present=%s owns the slot before post-step contact', async (touch) => {
  host = await installShellHost()
  const first = shellScene('a')
  first.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 4, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        onVictory: { kind: 'remain' },
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  if (touch) {
    first.entities.push({
      id: 'landing',
      zone: true,
      pos: { col: 3, row: 2, height: 0 },
      initialPage: 'entry',
      pages: [
        {
          id: 'entry',
          label: 'Entry',
          trigger: 'gain',
          triggerActivation: { on: 'touch', range: 0 },
        },
      ],
      behaviors: {
        trigger: {
          gain: {
            label: 'Gain',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'gain',
              stages: [{ id: 'gain', body: [{ kind: 'giveMoney', delta: 7 }] }],
            },
          },
        },
      },
    })
  }
  const fixture = await bootScenario(host, { first })
  expect(state().player.pos).toEqual({ col: 2, row: 2, height: 0 })
  await key(host, 'ArrowRight')
  expect(state().player.pos).toEqual({ col: 3, row: 2, height: 0 })
  expect(hostileEncounterClaimed()).toBe(!touch)
  expect(state().world.money).toBe(touch ? 57 : 50)
  if (!touch) await advance(host, () => state().renderDebug.inBattle)
  fixture.assertInputUnchanged()
})

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
    for (let i = 0; i < 10; i++) await host.frame()
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
  // This tests defeat routing, not RNG: 7/17 passive dodge can otherwise outlive the frame budget.
  // Frozen 7f3840e6 and current hosts both fail with 0.99 and pass with 0.5 (no dodge).
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
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
