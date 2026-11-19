import assert from 'node:assert/strict'
import { tsImport } from 'tsx/esm/api'
import { nextGameBattleKey } from '../battle-game-input.mjs'
import { nextReforgeBattleKey } from '../battle-reforge-input.mjs'
import { toGamePixel } from '../battle-scripted-defeat-scenario.mjs'
import { runBrowserJourney, sha256 } from '../browser-journey.mjs'
import { installCommittedRoutePlayback } from '../committed-route.mjs'
import { writeEvidenceArtifact } from '../evidence-artifact.mjs'
import { canonicalInput, createRecordedHold, pressRecordedKey } from '../input-ledger.mjs'
import { bossObserver } from './observe.mjs'
import {
  departingPosition,
  gameScene,
  grid,
  growthPools,
  initialTrack,
  json,
  nativeMusic,
  party,
  readSources,
  returnedPosition,
  scenarios,
  statsFields,
} from './scenarios.mjs'

const [engine, scenario, option] = process.argv.slice(2)
const spec = scenarios[scenario]
assert(
  (engine === 'game' || engine === 'reforge') &&
    spec &&
    [undefined, '--capture'].includes(option) &&
    process.argv.length <= 5,
  'usage: node scripts/e2e/boss-entrances/run.mjs game|reforge SCENARIO [--capture]',
)
const game = engine === 'game'
const fieldMusic = initialTrack(spec)
const fieldMusicAsset = nativeMusic(fieldMusic)
const approach = spec.approach ?? 'ArrowUp'
const facing = approach === 'ArrowRight' ? 'right' : 'up'
const returned = returnedPosition(spec)
const departure = departingPosition(spec)
const source = await readSources(spec)
const roles = party.map(({ role }) => role)
const nativeRoles = party.map(({ roleId }) => roleId)
const initialOwner = Number(spec.owner.slice(1))
const observe = bossObserver({
  engine,
  scene: spec.scene,
  gameScene: gameScene(spec),
  owner: spec.owner,
  watched: spec.watched,
  seed: spec.seed,
})
const ready = (state) => state?.scene === spec.scene && state.ready
const waiting = new Set(['waiting-input', 'waiting-page-key', 'waiting-end-key'])
const lineKey = (box) => (box ? JSON.stringify([box.at, box.id, box.page, box.text]) : null)
const nextKey = game ? nextGameBattleKey : nextReforgeBattleKey
const confirm = game ? 'Space' : 'Enter'
const trace = (page) => page.evaluate(() => globalThis.__defeat.trace())

async function read(page) {
  return page.evaluate(
    ({ game, roles, nativeRoles, initialOwner }) => {
      const observed = globalThis.__defeat?.read()
      if (!observed?.state) return observed
      const gs = globalThis.__tpgs
      const world = globalThis.__rfWorld
      const battle = game ? gs.battleState : globalThis.__rfBattle
      const state = game ? battle : battle?.state
      const selected = game
        ? state?.players[state.selectingPlayerIdx]
        : state && battle.nextSelecting()
      const selectingPlayerId = game
        ? roles[nativeRoles.indexOf(selected?.roleId)]
        : state?.players[selected]?.roleId
      const settlement = game ? state?.settlement : battle?.settlementPresentation
      const screen = game ? settlement?.screens[settlement.index] : settlement?.currentScreen
      const owner = game
        ? gs.npcs.find(({ id }) => id === initialOwner)
        : globalThis.__rfScene?.entities.find(({ id }) => id === `e${initialOwner}`)
      return {
        ...observed,
        atMs: performance.now(),
        owner:
          owner &&
          (game
            ? {
                state: owner.sState,
                triggerMode: owner.triggerMode,
                label: owner.triggerLabel,
                resume: owner.triggerResume?.ip ?? null,
              }
            : {
                hidden: owner.hidden === true,
                state: world.script.entityState[observed.state.scene]?.[owner.id] ?? null,
                behavior:
                  world.script.behaviors.entities?.[observed.state.scene]?.[owner.id] ?? null,
              }),
        live:
          state && !observed.ended
            ? {
                engine: game ? 'game' : 'reforge',
                turn: state.turn + (game ? 1 : 0),
                phase: state.phase,
                busy: game
                  ? Boolean(state.introFade || state.battleAnim)
                  : !globalThis.__tpObserve.readRuntime().battleActive ||
                    battle.selectionStartedForTurn !== state.turn,
                selectingPlayerId,
                uiState: game ? state.uiState : undefined,
                menuState: game ? state.menuState : undefined,
                selectedAction: game ? state.selectedAction : undefined,
                uiCursor: game ? state.uiCursor : undefined,
                selection: game ? null : battle.selection.view,
                snapshot: {
                  enemies: state.enemies.map((enemy, slot) =>
                    enemy && (game ? enemy.objectId : enemy.def)
                      ? {
                          id: game ? `enemy-${enemy.objectId}` : enemy.def.id,
                          slot,
                          alive: (game ? enemy.e.health : enemy.hp) > 0,
                        }
                      : null,
                  ),
                },
                settlement:
                  screen &&
                  (game
                    ? settlement.shownMs >= 120 && settlement.index
                    : settlement.pageDrawn &&
                      settlement.elapsedMs >= 325 &&
                      settlement.screenIndex),
              }
            : null,
      }
    },
    { game, roles, nativeRoles, initialOwner },
  )
}

async function dismissGameBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const loading = page.locator('#boot-loading-enter-btn')
  if (await loading.isVisible()) await loading.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
}

async function makeGameFixture(page, baseURL, until) {
  await page.goto(`${baseURL}/?skip-intro=1&dev-scene=${gameScene(spec) - 1}`)
  await until(
    async () => {
      await dismissGameBoot(page)
      return read(page)
    },
    ({ state } = {}) => ready(state),
    'Game canonical scene',
    60_000,
  )
  const canonical = await page.evaluate(async () => {
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return serializeSave(globalThis.__tpgs)
  })
  const payload = JSON.parse(canonical)
  const gs = payload.gs
  assert.equal(gs.wNumScene, gameScene(spec))
  for (const table of [gs.npcs, gs.allEventObjects]) {
    const actor = table.find(({ id }) => id === initialOwner)
    assert.deepEqual(
      [actor.x, actor.y, actor.sState, actor.triggerMode, actor.triggerLabel],
      [...spec.disk.owner, `L_${spec.disk.entry}`],
    )
  }
  const [x, y] = toGamePixel(spec.start)
  gs.party = { x, y, facing }
  gs.camera = { x: x - 160, y: y - 112 }
  const [xx, yy] = toGamePixel(spec.contact)
  gs.trail = Array.from({ length: 5 }, (_, i) => ({
    x: x - (xx - x) * i,
    y: y - (yy - y) * i,
    dir: facing,
  }))
  gs.partyMembers = nativeRoles
  for (const [i, member] of party.entries()) {
    const id = member.roleId
    for (const [name, field] of Object.entries(statsFields))
      gs.PlayerRolesRuntime[field][id] = member[name]
    for (const row of gs.PlayerRolesRuntime.rgwEquipment) row[id] = 0
    for (const row of gs.PlayerRolesRuntime.rgwMagic) row[id] = 0
    gs.Exp.rgPrimaryExp[id] = { wExp: 0, wLevel: member.level, wCount: 0 }
    for (const pool of Object.values(growthPools))
      assert.deepEqual(gs.Exp[pool][id], { wExp: 0, wLevel: source.hiddenLevels[i], wCount: 0 })
  }
  gs.inventory = []
  gs.dwCash = 0
  gs.wNumMusic = fieldMusic
  if (scenario === 'fox') {
    const snake = gs.allEventObjects.find(({ id }) => id === 671)
    assert.equal(snake.triggerLabel, 'L_9472')
    snake.triggerResume = { ip: 9495 }
    snake.triggerMode = 2
    snake.facing = 'down'
    snake.scriptedFrame = 1
  }
  return { payload, bootSHA: sha256(canonical) }
}

async function makeReforgeFixture() {
  const { buildWorld, validateActors } = await tsImport(
    '../../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const actors = validateActors(
    (await json('projects/pal/content/actors.json')).filter(({ id }) => roles.includes(id)),
  )
  const world = buildWorld(
    { party: roles, money: 0, inventory: [] },
    Object.fromEntries(actors.map((actor) => [actor.id, actor])),
  )
  for (const [i, { role, roleId, ...stats }] of party.entries()) {
    Object.assign(world.party[i], stats, {
      equipment: {},
      hiddenExp: Object.fromEntries(
        Object.keys(growthPools).map((name) => [name, { level: source.hiddenLevels[i], exp: 0 }]),
      ),
    })
    world.learnedSkills[role] = []
  }
  world.audio = { currentMusic: fieldMusicAsset }
  if (scenario === 'fox') {
    world.script.behaviors.entities = {
      s041: {
        e671: {
          triggerActivation: { kind: 'use', value: { on: 'interact', range: 2 } },
          trigger: { cursor: { behavior: 'default', at: { kind: 'stage', stage: 'legacy-002' } } },
        },
      },
    }
  }
  return {
    payload: buildCurrentSavePayload(
      world,
      { sceneId: spec.scene, pos: grid(spec.start), facing },
      'pal',
    ),
  }
}

async function restoreGame(page, baseURL, until, press, payload) {
  await page.goto(baseURL)
  await until(
    async () => {
      await dismissGameBoot(page)
      const video = await page.evaluate(() => document.querySelector('video')?.currentSrc)
      if (video) {
        await press('Enter', 'restore')
        await until(
          () => page.evaluate(() => document.querySelector('video')?.currentSrc),
          (current) => current !== video,
          'close title film',
        )
      }
      return read(page)
    },
    (view) => view?.state?.menu?.kind === 'opening',
    'Game title menu',
    60_000,
  )
  const readback = await page.evaluate(async (saved) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length !== 0) throw new Error('fixture slot is occupied')
    await Save.saveSlot(1, parseImportedSave(saved))
    return serializeSave(await Save.loadSlot(1))
  }, JSON.stringify(payload))
  assert.deepEqual(JSON.parse(readback), payload, 'Game canonical save readback')
  await press('ArrowDown', 'restore')
  await until(
    () => read(page),
    (view) => view?.state?.menu?.cursor === 1,
    'select 旧的回忆',
  )
  await press('Enter', 'restore')
  await until(
    () => read(page),
    (view) => view?.state?.menu?.kind === 'save-slot',
    'select slot 1',
  )
  await press('Enter', 'restore')
  return sha256(`${readback}\n`)
}

const committed = (position) => (game ? toGamePixel(position) : position)
async function walk({ page, health, record, key, phase, from, to, mode }) {
  health()
  const scene = spec.scene
  const hold = createRecordedHold({
    keyboard: page.keyboard,
    key,
    metadata: { phase },
    onInput: record,
  })
  const step = {
    key,
    scene,
    from: committed(from),
    to: committed(to),
    source: game ? 'commit:tickSceneInput' : 'commit:player.input',
  }
  const wait = async () => {
    const result = await page.evaluate(() => globalThis.__routeWait())
    assert(!result.error, result.error)
  }
  const finalize = async () => {
    const result = await page.evaluate(() => globalThis.__routeFinalize())
    assert(!result.error, result.error)
  }
  const errors = []
  try {
    await page.evaluate((step) => globalThis.__routeArm({ kind: 'moves', steps: [step] }), step)
    // Submit the waiter before keydown. The first real movement proves the key
    // has arrived, so release while the separate keydown acknowledgement can be in flight.
    const moved = wait()
    await Promise.all([hold.down(), moved.then(() => hold.up())])
    await finalize()
    await page.evaluate((target) => globalThis.__routeArm({ kind: 'end', target }), {
      scene,
      position: step.to,
      mode,
    })
    await wait()
    await finalize()
  } catch (error) {
    errors.push(error)
  } finally {
    if (hold.held) {
      try {
        await hold.up()
      } catch (error) {
        errors.push(error)
      }
    }
    try {
      await page.evaluate(() => globalThis.__routeCancel())
    } catch (error) {
      errors.push(error)
    }
  }
  if (errors.length === 1) throw errors[0]
  if (errors.length > 1) throw new AggregateError(errors, 'world route and cleanup failed')
}

async function playEncounter({ page, press, health, capture }) {
  let lastScreen = -1
  let lastLine = null
  const deadline = Date.now() + 125_000
  for (;;) {
    health()
    const view = await read(page)
    const { state, live, ended } = view
    if (ended && ready(state)) return view
    assert(Date.now() < deadline, `world did not return after battle: ${JSON.stringify(view)}`)
    const box = state.box
    const line = lineKey(box)
    if (box?.text && waiting.has(box.phase) && line !== lastLine) {
      lastLine = line
      if (capture.enabled)
        await capture.readable(box.text, line, async () => lineKey((await read(page)).state.box))
      await press(confirm, ended ? 'after-dialogue' : 'before-dialogue')
    } else if (Number.isInteger(live?.settlement) && live.settlement > lastScreen) {
      lastScreen = live.settlement
      await press(confirm, 'settlement')
    } else if (live?.selectingPlayerId) {
      assert(live.turn <= 10, 'manual battle exceeded ten rounds')
      const defending = live.turn === 1
      const enemies = live.snapshot.enemies.filter((enemy) => enemy?.alive)
      const target = enemies.find(({ id }) => id === spec.enemy) ?? enemies[0]
      const command = {
        turn: live.turn,
        actorId: live.selectingPlayerId,
        kind: defending ? 'defend' : 'attack',
        targetId: defending ? null : target?.id,
      }
      const key = nextKey({ ...live, snapshot: { enemies } }, command)
      if (key) await press(key, 'battle-select')
    }
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
  }
}

await runBrowserJourney({
  name: `q2-${spec.id}-${engine}-${option ? 'capture' : 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/boss-entrances/vite.config.mts',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal', Q2_DEFEAT_ENGINE: engine },
  sources: source.paths,
  arguments: ['--headless', ...(option ? [option] : [])],
  viewport: { width: 960, height: 720 },
  initScripts: [installCommittedRoutePlayback, observe],
  async journey({ newPage, until, baseURL, report, out, capture, health }) {
    const result = { context: spec.id }
    Object.assign(report, { engine, fragment: spec.id, input: spec, cases: [result] })
    let fixture
    if (game) {
      const setup = await newPage('canonical-boot')
      try {
        fixture = await makeGameFixture(setup, baseURL, until)
      } finally {
        await setup.close()
      }
    } else fixture = await makeReforgeFixture()
    report.save = await writeEvidenceArtifact(out, 'input.json', fixture.payload)
    report.predecessor = {
      kind: 'canonical-world-save-fixture',
      ...report.save,
      bootSHA: fixture.bootSHA,
    }
    const page = await newPage(spec.id)
    const record = (event) => report.actions.push(canonicalInput({ context: spec.id, ...event }))
    const press = async (key, phase) => {
      const input = await pressRecordedKey({
        keyboard: page.keyboard,
        action: { context: spec.id, key, phase },
        record,
      })
      if (!game || phase === 'restore') return
      const frame = await page.evaluate(() => globalThis.__tpgs?.frameNum)
      if (frame === undefined) return
      const advanced = await page.waitForFunction(
        (previous) => globalThis.__tpgs.frameNum > previous && globalThis.__tpgs.frameNum,
        frame,
        { timeout: 4000 },
      )
      try {
        input.gameLogic = { dispatchedFrame: frame, observedFrame: await advanced.jsonValue() }
      } finally {
        await advanced.dispose()
      }
    }
    const wait = (accept, stage, timeout) =>
      until(
        () => read(page),
        (view) => view?.state && accept(view),
        stage,
        timeout,
      )
    try {
      if (game) {
        result.slotReadback = await restoreGame(page, baseURL, until, press, fixture.payload)
        assert.equal(result.slotReadback, report.save.sha256)
        if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
      } else {
        await page.route('**/__q2-world-boss-save.json', (request) =>
          request.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(fixture.payload),
          }),
        )
        await page.goto(`${baseURL}/?e2e-load=%2F__q2-world-boss-save.json`)
      }
      result.initial = await wait(
        ({ state }) => ready(state) && (game || state.checkpoint === 'loaded'),
        'loaded checkpoint ready for real player movement',
        60_000,
      )
      if (!game) {
        const readback = await page.evaluate(() => globalThis.__tpE2e.dumpSave())
        result.slotReadback = await writeEvidenceArtifact(out, 'readback.json', readback)
      }
      assert.deepEqual(result.initial.state.position, spec.start)
      assert.deepEqual(
        result.initial.state.party.map(({ id, level, hp, mp }) => [id, level, hp, mp]),
        party.map(({ role, level, hp, mp }) => [role, level, hp, mp]),
      )
      assert.deepEqual(result.initial.state.inventory, [])
      if (!game) {
        // Unlock Web Audio through a real keydown while the party is in exploration.
        // The defend shortcut has no world action here.
        await press('KeyD', 'bootstrap')
        const primed = await wait(
          ({ state }) => ready(state),
          'unchanged exploration after audio gesture',
        )
        assert.deepEqual(primed.state, result.initial.state)
        assert(
          await page.evaluate(() => navigator.userActivation.hasBeenActive),
          'missing native audio gesture',
        )
      }
      await until(
        async () =>
          (await trace(page)).events.find(
            ({ kind, track, context }) =>
              kind === 'music-start' && track === fieldMusic && context === 'running',
          ),
        Boolean,
        'source-authored field music audible before recording',
      )
      await capture.arm(page, {
        event: 'before-world-boss-contact',
        scene: spec.scene,
        grid: spec.start,
      })
      await walk({
        page,
        health,
        record,
        key: approach,
        phase: 'approach',
        from: spec.start,
        to: spec.contact,
        mode: 'dialogue',
      })
      result.returned = await playEncounter({ page, press, health, capture })
      assert.deepEqual(result.returned.state.position, returned)
      await walk({
        page,
        health,
        record,
        key: spec.world.exit ?? 'ArrowDown',
        phase: 'exit',
        from: returned,
        to: departure,
        mode: 'ready',
      })
      result.departure = await wait(
        ({ state }) => ready(state) && state.position.join() === departure.join(),
        'real return movement',
      )
      if (capture.enabled) {
        await page.waitForFunction((atMs) => performance.now() >= atMs + 550, result.departure.atMs)
      }
      await capture.finish(page, {
        event: 'world-boss-departure',
        scene: spec.scene,
        grid: departure,
        world: result.departure.state,
      })
    } finally {
      result.last = await read(page).catch(() => null)
      const raw = await trace(page).catch(() => undefined)
      if (raw) result.raw = await writeEvidenceArtifact(out, 'trace.json', raw)
      await page.close()
    }
  },
})
