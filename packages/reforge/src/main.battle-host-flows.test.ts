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
let finishBattleFixture: (() => Promise<void>) | undefined
afterEach(async () => {
  // Own the real session's termination even when an author-flow assertion fails early.
  if (host && state().renderDebug.inBattle) {
    const active = session()
    active.cancel()
    await active.done.catch(() => undefined)
    await drain()
  }
  await finishBattleFixture?.()
  finishBattleFixture = undefined
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

test.each([
  'confirm',
  'replace',
] as const)('normal hostile victory holds the battle frame through loot (%s)', async (completion) => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  let now = 0
  vi.spyOn(performance, 'now').mockImplementation(() => now)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const drawWorld = vi.spyOn(WorldScenePresentation.prototype, 'renderWorld')
  const first =
    completion === 'replace'
      ? sceneWithCommands('a', [
          { kind: 'startBattle', enemyTeamId: 'encounter', auto: true },
          { kind: 'giveMoney', delta: 100 },
        ])
      : shellScene('a')
  if (completion === 'confirm') {
    first.entities = [
      {
        id: 'chaser',
        sprite: 'walker',
        pos: { col: 4, row: 2, height: 0 },
        hostile: {
          enemyTeamId: 'encounter',
          onVictory: { kind: 'hide', ticks: 800 },
          onPlayerFlee: { kind: 'remain' },
        },
      },
    ]
  }
  const foe = opponent({
    onDefeated: [
      { kind: 'giveItem', itemId: 'tonic', count: 1 },
      {
        kind: 'dialog',
        cue: {
          identity: { kind: 'narration' },
          slot: 'narration',
          rows: [{ text: 'line.one' }],
        },
      },
      { kind: 'giveItem', itemId: 'tonic', count: 1 },
      {
        kind: 'dialog',
        cue: {
          identity: { kind: 'narration' },
          slot: 'narration',
          rows: [{ text: 'line.two' }],
        },
      },
    ],
  })
  const fixture = await bootScenario(host, {
    first,
    items: [medicine()],
    enemies: [foe],
    seedStats: { hero: { hp: 80, mp: 30 } },
  })
  const browser = host
  const oldEncounterRunning = () =>
    completion === 'replace' ? state().script.running : hostileEncounterClaimed()
  finishBattleFixture = async () => {
    // Settle a failed assertion's live script on the real confirm path before replacing the shell.
    for (let i = 0; i < 8 && oldEncounterRunning(); i++) await key(browser, 'Enter')
  }
  const health = () => state().world.party.map(({ hp, mp }) => [hp, mp])
  const drawnText = (text: string) =>
    host?.text.mock.calls.some(([, spans]) => spans.some((span) => span.text === text))
  if (completion === 'confirm') await key(host, 'ArrowRight')
  await advance(host, () => state().renderDebug.inBattle)
  const worldFrames = drawWorld.mock.calls.length
  await finish(host)
  await advance(host, () => drawnText('First') === true)
  expect(state().world.money).toBe(57)
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 1 }])
  expect(health()).toEqual([[80, 30]])
  expect(drawWorld.mock.calls).toHaveLength(worldFrames)
  expect(state().dialogue).toBe(true)
  now = 1399
  await host.frame()
  expect(state().dialogue).toBe(true)
  expect(drawnText('Second')).toBe(false)
  now = 1400
  await host.frame()
  await advance(host, () => drawnText('Second') === true)
  expect(state().world.inventory).toEqual([{ itemId: 'tonic', count: 2 }])
  expect(health()).toEqual([[80, 30]])
  expect(drawWorld.mock.calls).toHaveLength(worldFrames)
  expect(oldEncounterRunning()).toBe(true)
  if (completion === 'replace') {
    let result: unknown
    const outcome = state()
      .startBattle('encounter')
      .then(
        (value) => {
          result = value
        },
        (error: unknown) => {
          result = error
        },
      )
    try {
      await advance(host, () => result !== undefined || state().renderDebug.inBattle)
      expect(result).toBeUndefined()
      expect(oldEncounterRunning()).toBe(false)
      expect(state().dialogue).toBe(false)
      expect(health()).toEqual([[80, 30]])
      expect(state().world.money).toBe(57)
    } finally {
      if (state().renderDebug.inBattle) session().cancel()
      await outcome
    }
    fixture.assertInputUnchanged()
    return
  }
  await key(host, 'Enter')
  await advance(host, () => !hostileEncounterClaimed())
  expect(state().dialogue).toBe(false)
  expect(health()).toEqual([[90, 35]])
  expect(drawWorld.mock.calls.length).toBeGreaterThan(worldFrames)
  expect(state().entities.find(({ id }) => id === 'chaser')?.hidden).toBe(true)
  fixture.assertInputUnchanged()
})

test.each([
  'early-key',
  'automatic',
] as const)('native encounter settles the actual reward page by %s', async (method) => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const first = shellScene('a')
  first.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 4, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        onVictory: { kind: 'hide', ticks: 800 },
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  const foe = opponent()
  foe.stats.exp = 1
  const fixture = await bootScenario(host, { first, enemies: [foe], withBattleMusic: true })
  const { BattleSettlementPresentation } = await import(
    './battle/battle-settlement-presentation.js'
  )
  const pageDrawn = vi.spyOn(BattleSettlementPresentation.prototype, 'markPageDrawn')
  await key(host, 'ArrowRight')
  await advance(host, () => state().renderDebug.inBattle)
  // Keep submitting ordinary attack while playing; an input from before the page exists
  // cannot skip it. Stop on the first actual renderer receipt, before any later game tick.
  for (let i = 0; i < 80 && !pageDrawn.mock.calls.length; i++) {
    await key(host, 'Enter')
    await host.settleIO()
  }
  expect(pageDrawn).toHaveBeenCalledOnce()
  expect(state().renderDebug.inBattle).toBe(true)
  if (method === 'early-key') {
    await key(host, 'ArrowLeft', 1)
  } else {
    for (let i = 0; i < 29; i++) await host.frame(100)
    await host.frame(99)
    expect(state().renderDebug.inBattle).toBe(true)
    await host.frame(1)
  }
  await host.settleIO()
  expect(state().renderDebug.inBattle).toBe(false)
  expect(state().renderDebug.menuActive).toBe(false)
  expect(state().world.money).toBe(57)
  fixture.assertInputUnchanged()
})

test('a native hostile reveal replaces six whole pixel bands before command input opens', async () => {
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
  const fixture = await bootScenario(host, { first })
  const ctx = document.querySelector('canvas')?.getContext('2d')
  if (!ctx) throw new Error('game canvas is missing')
  // Distinct endpoint colors stand for browser readback. Production drawing, keyboard, battle
  // preparation, and reveal scheduling remain real in this shell test.
  const readPixels = ctx.getImageData.bind(ctx)
  const getPixels = vi.spyOn(ctx, 'getImageData').mockImplementation((...args) => {
    const pixels = readPixels(...args)
    pixels.data.fill(getPixels.mock.calls.length === 1 ? 11 : 83)
    return pixels
  })
  const drawPixels = ctx.putImageData.bind(ctx)
  const bands: number[][] = []
  vi.spyOn(ctx, 'putImageData').mockImplementation((pixels, x, y) => {
    drawPixels(pixels, x, y)
    if (pixels.width === ctx.canvas.width && pixels.height === ctx.canvas.height) {
      bands.push(Array.from({ length: 24 }, (_, col) => pixels.data[col * 4] ?? 0))
    }
  })
  await key(host, 'ArrowRight')
  expect(hostileEncounterClaimed()).toBe(true)
  const expectedBands = Array<number>(24).fill(11)
  expect(bands.at(-1), 'contact first draws the actual held world image').toEqual(expectedBands)
  for (const dt of [100, 99]) {
    await key(host, 'Escape', dt)
    expect(bands.at(-1)).toEqual(expectedBands)
    expect(state().renderDebug.inBattle).toBe(false)
    expect(state().renderDebug.menuActive).toBe(false)
  }
  // Preparation may require a browser IO turn. Each completed reveal band is inspected as drawn.
  for (let i = 0; i < 60 && getPixels.mock.calls.length < 2; i++) {
    await host.frame(1)
    await host.settleIO()
  }
  expect(getPixels).toHaveBeenCalledTimes(2)
  for (const [round, column] of [0, 3, 1, 5, 2, 4].entries()) {
    if (round) await key(host, 'Escape', round === 5 ? 77 : 60)
    expectedBands.fill(83, column * 4, (column + 1) * 4)
    expect(bands.at(-1)).toEqual(expectedBands)
    expect(state().renderDebug.inBattle).toBe(false)
    expect(state().renderDebug.menuActive).toBe(false)
  }
  await key(host, 'Escape', 59)
  expect(state().renderDebug.inBattle).toBe(false)
  await key(host, 'Escape', 1)
  expect(state().renderDebug.inBattle).toBe(true)
  expect(state().renderDebug.menuActive).toBe(false)
  fixture.assertInputUnchanged()
})

test('an authored victory fade darkens the last drawn prompt then reveals the committed map', async () => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const first = shellScene('a')
  first.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 4, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        onVictory: { kind: 'hide', ticks: 800 },
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  const fixture = await bootScenario(host, {
    first,
    hostileVictoryTransition: 'fade',
    enemies: [
      opponent({
        onDefeated: [
          {
            kind: 'dialog',
            cue: {
              identity: { kind: 'narration' },
              slot: 'narration',
              rows: [{ text: 'line.one' }],
            },
          },
        ],
      }),
    ],
  })
  const browser = host
  finishBattleFixture = async () => {
    for (let i = 0; i < 30 && hostileEncounterClaimed(); i++) await key(browser, 'Enter')
  }
  await key(host, 'ArrowRight')
  await advance(host, () => state().renderDebug.inBattle)
  await finish(host)
  await advance(host, () =>
    browser.text.mock.calls.some(([, spans]) => spans.some(({ text }) => text === 'First')),
  )
  expect(state().world.party[0]?.hp).toBe(80)
  expect(state().dialogue).toBe(true)
  const ctx = document.querySelector('canvas')?.getContext('2d')
  if (!ctx) throw new Error('game canvas is missing')
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const drawWorld = vi.spyOn(WorldScenePresentation.prototype, 'renderWorld')
  const readPixels = vi.spyOn(ctx, 'getImageData')
  const drawPixels = vi.spyOn(ctx, 'putImageData')
  const fill = ctx.fillRect.bind(ctx)
  const fadeFrames: { alpha: number; worldDrawn: boolean }[] = []
  let assignedAlpha: number | undefined
  let assignedStyle: string | CanvasGradient | CanvasPattern | undefined
  let alpha = ctx.globalAlpha
  let fillStyle = ctx.fillStyle
  // Inspect actual Canvas API calls; do not mistake the map's black clear for a fade overlay.
  Object.defineProperty(ctx, 'globalAlpha', {
    get: () => alpha,
    set: (value: number) => {
      alpha = value
      assignedAlpha = value
    },
  })
  Object.defineProperty(ctx, 'fillStyle', {
    get: () => fillStyle,
    set: (value: typeof fillStyle) => {
      fillStyle = value
      assignedStyle = value
    },
  })
  vi.spyOn(ctx, 'fillRect').mockImplementation((x, y, width, height) => {
    fill(x, y, width, height)
    if (
      assignedAlpha !== undefined &&
      assignedStyle === '#000' &&
      width === ctx.canvas.width &&
      height === ctx.canvas.height
    ) {
      fadeFrames.push({ alpha: assignedAlpha, worldDrawn: drawWorld.mock.calls.length > 0 })
    }
    assignedAlpha = undefined
    assignedStyle = undefined
  })
  await key(host, 'Enter')
  expect(hostileEncounterClaimed(), 'exploration is fenced until the return fade finishes').toBe(
    true,
  )
  expect(state().world.party[0]?.hp).toBe(90)
  expect(state().entities.find(({ id }) => id === 'chaser')?.hidden).toBe(true)
  const held = readPixels.mock.results.at(-1)?.value
  expect(held).toBeDefined()
  expect(drawPixels.mock.calls.at(-1)?.[0]).toBe(held)
  function expectPaletteShade(light: number, worldDrawn: boolean): void {
    const last = fadeFrames.at(-1)
    if (!last) throw new Error('victory fade was not drawn')
    expect(last.worldDrawn).toBe(worldDrawn)
    // SDLPal scales the channels by one of 61 levels over 64.
    const level = (1 - last.alpha) * 64
    expect(Number.isInteger(level)).toBe(true)
    // The sampling frame can straddle one quantization boundary.
    expect(Math.abs(level - light)).toBeLessThanOrEqual(1)
  }
  for (let i = 1; i <= 6; i++) {
    await key(host, 'Escape')
    expect(state().renderDebug.menuActive).toBe(false)
    expect(drawWorld).not.toHaveBeenCalled()
    expect(drawPixels.mock.calls.at(-1)?.[0]).toBe(held)
    expectPaletteShade(60 - 10 * i, false)
  }
  expect(fadeFrames.at(-1)).toEqual({ alpha: 1, worldDrawn: false })
  // World is drawn from the committed lifecycle with the new endpoint still under the curtain.
  const heldDraws = drawPixels.mock.calls.length
  for (let i = 0; i < 6; i++) {
    await key(host, 'Escape')
    expect(state().renderDebug.menuActive).toBe(false)
    expect(hostileEncounterClaimed()).toBe(true)
    expect(drawPixels.mock.calls.length).toBe(heldDraws)
    expectPaletteShade(10 * i, true)
  }
  const darkFrames = fadeFrames.length
  const worldFrames = drawWorld.mock.calls.length
  await key(host, 'Escape')
  expect(drawWorld.mock.calls.length).toBeGreaterThan(worldFrames)
  expect(fadeFrames).toHaveLength(darkFrames)
  expect(hostileEncounterClaimed()).toBe(false)
  expect(state().renderDebug.menuActive).toBe(false)
  await key(host, 'Escape')
  expect(state().renderDebug.menuActive).toBe(true)
  fixture.assertInputUnchanged()
})

test('world automation preserves its pending wait and contact-frame action through a hostile victory', async () => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const first = shellScene('a')
  first.entities = [
    {
      id: 'sentry',
      sprite: 'walker',
      pos: { col: 4, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        onVictory: { kind: 'hide', ticks: 800 },
        onPlayerFlee: { kind: 'remain' },
      },
    },
    {
      id: 'world-timer',
      zone: true,
      pos: { col: 0, row: 0, height: 0 },
      initialPage: 'idle',
      pages: [{ id: 'idle', label: 'Idle', auto: 'timer' }],
      behaviors: {
        auto: {
          timer: {
            label: 'Timer',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'idle',
              stages: [
                {
                  id: 'idle',
                  body: [
                    { kind: 'wait', ms: 200 },
                    { kind: 'giveMoney', delta: 10 },
                    { kind: 'wait', ms: 200 },
                    { kind: 'giveMoney', delta: 20 },
                    { kind: 'finishStep', next: { kind: 'complete' } },
                  ],
                },
              ],
            },
          },
        },
      },
    },
    {
      id: 'world-continuation',
      zone: true,
      pos: { col: 0, row: 0, height: 0 },
      initialPage: 'idle',
      pages: [{ id: 'idle', label: 'Idle', auto: 'timer' }],
      behaviors: {
        auto: {
          timer: {
            label: 'Timer',
            order: 0,
            flow: {
              kind: 'stages',
              initial: 'idle',
              stages: [
                {
                  id: 'idle',
                  body: [
                    { kind: 'wait', ms: 450 },
                    { kind: 'giveMoney', delta: 40 },
                    { kind: 'finishStep', next: { kind: 'complete' } },
                  ],
                },
              ],
            },
          },
        },
      },
    },
  ]
  const fixture = await bootScenario(host, {
    first,
    hostileVictoryTransition: 'fade',
    enemies: [opponent({ onDefeated: [{ kind: 'giveMoney', delta: 1 }] })],
  })
  await advance(host, () => state().world.money === 60, 3)
  await host.frame(100)
  await key(host, 'ArrowRight')
  expect(hostileEncounterClaimed()).toBe(true)
  expect(state().world.money).toBe(60)
  await advance(host, () => state().renderDebug.inBattle)
  expect(state().world.money).toBe(60)
  await finish(host)
  await advance(host, () => state().entities.find(({ id }) => id === 'sentry')?.hidden === true)
  expect(hostileEncounterClaimed()).toBe(true)
  expect(state().world.money).toBe(68)
  await advance(host, () => !hostileEncounterClaimed())
  expect(state().world.money).toBe(88)
  await host.frame(49)
  expect(state().world.money).toBe(88)
  await host.frame(1)
  expect(state().world.money).toBe(128)
  await host.frame(100)
  expect(state().world.money).toBe(128)
  fixture.assertInputUnchanged()
})

test('a replacement battle discards the old victory fade and never draws its held frame again', async () => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const first = shellScene('a')
  first.entities = [
    {
      id: 'chaser',
      sprite: 'walker',
      pos: { col: 4, row: 2, height: 0 },
      hostile: {
        enemyTeamId: 'encounter',
        onVictory: { kind: 'hide', ticks: 800 },
        victoryTransition: 'fade',
        onPlayerFlee: { kind: 'remain' },
      },
    },
  ]
  const fixture = await bootScenario(host, { first, hostileVictoryTransition: 'direct' })
  await key(host, 'ArrowRight')
  await advance(host, () => state().renderDebug.inBattle)
  const ctx = document.querySelector('canvas')?.getContext('2d')
  if (!ctx) throw new Error('game canvas is missing')
  const draw = vi.spyOn(ctx, 'putImageData')
  await finish(host)
  await advance(host, () => draw.mock.calls.length > 0)
  expect(state().entities.find(({ id }) => id === 'chaser')?.hidden).toBe(true)
  expect(hostileEncounterClaimed()).toBe(true)
  const oldFrame = draw.mock.calls.at(-1)?.[0]
  expect(oldFrame).toBeDefined()
  const result = state()
    .startBattle('encounter')
    .catch((error: unknown) => error)
  try {
    await advance(host, () => state().renderDebug.inBattle)
    expect(hostileEncounterClaimed()).toBe(false)
    draw.mockClear()
    for (let i = 0; i < 15; i++) await host.frame(100)
    expect(draw.mock.calls.some(([frame]) => frame === oldFrame)).toBe(false)
    expect(state().renderDebug.inBattle).toBe(true)
  } finally {
    if (state().renderDebug.inBattle) session().cancel()
    await result
  }
  fixture.assertInputUnchanged()
})

const directReturnCases = [
  {
    name: 'a battle-end upper dialogue leaves with its battle frame on a direct world return',
    projectTransition: undefined,
    victoryTransition: undefined,
  },
  {
    name: 'an explicit hostile direct return overrides the project fade',
    projectTransition: 'fade' as const,
    victoryTransition: 'direct' as const,
  },
] as const

for (const { name, projectTransition, victoryTransition } of directReturnCases)
  test(name, async () => {
    host = await installShellHost()
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const first = shellScene('a')
    first.entities = [
      {
        id: 'chaser',
        sprite: 'walker',
        pos: { col: 4, row: 2, height: 0 },
        hostile: {
          enemyTeamId: 'encounter',
          onVictory: { kind: 'hide', ticks: 800 },
          ...(victoryTransition === undefined ? {} : { victoryTransition }),
          onPlayerFlee: { kind: 'remain' },
        },
      },
    ]
    const fixture = await bootScenario(host, {
      first,
      hostileVictoryTransition: projectTransition,
      enemies: [
        opponent({
          onDefeated: [
            {
              kind: 'dialog',
              cue: {
                identity: { kind: 'narration' },
                slot: 'top',
                rows: [{ text: 'line.one', speed: 0 }],
              },
            },
          ],
        }),
      ],
    })
    const browser = host
    finishBattleFixture = async () => {
      for (let i = 0; i < 8 && hostileEncounterClaimed(); i++) await key(browser, 'Enter')
    }
    const drawsUpperDialogue = () =>
      browser.text.mock.calls.some(([, spans]) => spans.some(({ text }) => text === 'First'))
    await key(host, 'ArrowRight')
    await advance(host, () => state().renderDebug.inBattle)
    await finish(host)
    await advance(host, drawsUpperDialogue)
    expect(state().dialogue).toBe(true)
    await key(host, 'Enter')
    expect(hostileEncounterClaimed(), 'the direct return must not start a fade').toBe(false)
    browser.text.mockClear()
    await host.frame()
    expect(drawsUpperDialogue(), 'battle-end dialogue drew over the resumed world').toBe(false)
    await key(host, 'Escape')
    expect(state().renderDebug.menuActive).toBe(true)
    fixture.assertInputUnchanged()
  })

test('H9 real defeat draws the authored loss dialogue before continuing with zero HP', async () => {
  host = await installShellHost()
  // Keep the enemy hit deterministic so this test reaches the losing arm.
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
        onLose: [
          { kind: 'giveMoney', delta: 3 },
          {
            kind: 'dialog',
            cue: {
              identity: { kind: 'narration' },
              slot: 'top',
              rows: [{ text: 'line.one', speed: 0 }],
            },
          },
        ],
      },
      { kind: 'giveMoney', delta: 5 },
    ]),
  })
  await advance(host, () => state().renderDebug.inBattle)
  const expected = structuredClone(state().world)
  const battle = session()
  await advance(host, () => battle.debugPlayers()[0]?.hp === 0)
  expect(state().renderDebug.inBattle).toBe(true)
  expect(state().world.party[0]?.hp).toBe(1)
  expect(state().world.money).toBe(50)
  await advance(host, () => battle.debugReadiness().phase === 'over')
  expect(state().renderDebug.inBattle).toBe(false)
  expect(state().world.party[0]?.hp).toBe(0)
  const { text } = host
  await advance(host, () =>
    text.mock.calls.some(([, spans]) => spans.some(({ text }) => text === 'First')),
  )
  expect(state().dialogue).toBe(true)
  expect(state().world.money).toBe(53)
  await key(host, 'Enter')
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

test('normal hostile defeat keeps the battle frame through confirmation and black fade before reload', async () => {
  host = await installShellHost()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
  const { WorldScenePresentation } = await import('./world-scene-presentation.js')
  const drawWorld = vi.spyOn(WorldScenePresentation.prototype, 'renderWorld')
  let blackAlpha = 0
  const reload = vi.fn(() => blackAlpha)
  vi.stubGlobal('location', { ...location, reload })
  const hero = combatActor()
  if (!hero.battler) throw new Error('missing battler')
  hero.battler.baseStats.hp = 1
  const foe = opponent()
  foe.stats.health = 999
  foe.stats.attackStrength = 300
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
  const h = await bootScenario(host, { first, actors: [hero], enemies: [foe] })
  await key(host, 'ArrowRight')
  await advance(host, () => state().renderDebug.inBattle)
  const battle = session()
  const worldFrames = drawWorld.mock.calls.length
  await key(host, 'd')
  await advance(host, () => battle.debugPlayers()[0]?.hp === 0)
  expect(battle.debugReadiness().phase).toBe('acting')
  expect(state().renderDebug.inBattle).toBe(true)
  await advance(host, () => battle.debugReadiness().phase === 'over')
  expect(state().renderDebug.inBattle).toBe(false)
  await advance(host, () => !state().renderDebug.inBattle && state().dialogue)
  expect(state().world.party[0]?.hp).toBe(0)
  expect(drawWorld.mock.calls.length).toBe(worldFrames)
  const ctx = document.querySelector('canvas')?.getContext('2d')
  if (!ctx) throw new Error('game canvas is missing')
  const fillRect = ctx.fillRect.bind(ctx)
  vi.spyOn(ctx, 'fillRect').mockImplementation((x, y, width, height) => {
    fillRect(x, y, width, height)
    if (
      ctx.fillStyle === '#000' &&
      x === 0 &&
      y === 0 &&
      width === ctx.canvas.width &&
      height === ctx.canvas.height
    )
      blackAlpha = ctx.globalAlpha
  })
  for (let i = 0; i < 6 && state().dialogue; i++) await key(host, 'Enter', 200)
  expect(state().dialogue).toBe(false)
  for (let i = 0; i < 5; i++) {
    await host.frame(100)
    await drain()
  }
  expect(reload).not.toHaveBeenCalled()
  expect(blackAlpha).toBeCloseTo(5 / 6)
  await advance(host, () => reload.mock.calls.length > 0)
  expect(reload).toHaveBeenCalledOnce()
  expect(reload).toHaveReturnedWith(1)
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
