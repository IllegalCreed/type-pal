import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tsImport } from 'tsx/esm/api'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import {
  beeEscapeParty,
  beePartyMember,
  beePostWin,
  beeWorldArguments,
  beeWorldInput,
  honeycombItem,
  honeycombText,
} from './battle-world-bee-scenario.mjs'
import { runBrowserJourney } from './browser-journey.mjs'
import { installCommittedRoutePlayback, replayCommittedRoute } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'

const {
  cases,
  capture: captureRequested,
  escape: escapeCase,
  escapeExits,
  postBattleSave,
  postWin,
  probe,
} = beeWorldArguments()
const roster = escapeCase ? beeEscapeParty : [postWin ? beePostWin.before : beePartyMember]
const postBattle = postBattleSave
  ? (await import('./battle-world-save.mjs')).verifyPostBattleSave
  : null
const { scene, start, stop, hold, returnInput } = beeWorldInput
const approachPlan = fixedRoutePlan('reforge', {
  id: 'bee-approach',
  scene,
  start,
  holds: hold,
  completion: { scene, position: stop, mode: 'ready' },
})
const loot = (inventory) => inventory?.find(({ itemId }) => itemId === honeycombItem)?.count ?? 0
const grid = ({ col, row }) => [col, row]

async function createFixture() {
  const { applyLevelGrowth, buildWorld, equipItem, validateActors, validateItems } = await tsImport(
    '../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const actors = JSON.parse(
    await readFile(new URL('../../projects/pal/content/actors.json', import.meta.url)),
  )
  const items = JSON.parse(
    await readFile(new URL('../../projects/pal/content/items.json', import.meta.url)),
  )
  const rosterIds = roster.map(({ id }) => id)
  const definitions = validateActors(actors.filter(({ id }) => rosterIds.includes(id)))
  const byId = Object.fromEntries(definitions.map((actor) => [actor.id, actor]))
  const seedStats = Object.fromEntries(roster.map(({ id, hp, mp }) => [id, { hp, mp }]))
  if (escapeCase) {
    return buildCurrentSavePayload(
      buildWorld({ party: rosterIds, money: 0, inventory: [], seedStats }, byId),
      { sceneId: scene, pos: { col: start[0], row: start[1], height: 0 }, facing: 'right' },
      'pal',
    )
  }
  const { id, weapon, hp, mp } = beePartyMember
  const [actor] = validateActors(actors.filter((entry) => entry.id === id))
  const equipmentIds = new Set([String(weapon), ...Object.values(actor.battler.initialEquipment)])
  const valid = validateItems(items.filter((entry) => equipmentIds.has(entry.id)))
  const before = buildWorld(
    {
      party: [id],
      money: 0,
      inventory: [{ itemId: String(weapon), count: 1 }],
      seedStats: { [id]: { hp, mp } },
    },
    { [id]: actor },
  )
  const world = equipItem(
    before,
    before.party[0].id,
    String(weapon),
    Object.fromEntries(valid.map((item) => [item.id, item])),
  )
  assert.equal(world.party[0].equipment.weapon, String(weapon))
  assert.deepEqual(world.inventory, [{ itemId: '192', count: 1 }])
  if (postWin) {
    const member = world.party[0]
    assert(!world.learnedSkills[member.id].includes(beePostWin.skill.id))
    assert.equal(actor.battler.leveling.expTable[beePostWin.before.level], beePostWin.threshold)
    applyLevelGrowth(member, 1, () => 0)
    member.exp = beePostWin.before.exp
    member.hp = beePostWin.before.hp
    member.mp = beePostWin.before.mp
  }
  // This snapshot has only the equipped weapon, as does the Game fixture.
  world.inventory = []
  return buildCurrentSavePayload(
    world,
    { sceneId: scene, pos: { col: start[0], row: start[1], height: 0 }, facing: 'right' },
    'pal',
  )
}

function installObserver(makeRng, createRecorder, seed, itemId, escapeCase, postWin) {
  const rng = makeRng(seed)
  const events = [],
    handoff = [],
    inputs = [],
    errors = []
  let overflow = false,
    activeSlot = null,
    surface = null,
    draws = 0,
    lastSettlement,
    contacted = false,
    entryBand = -1,
    entryComplete = false,
    commandDrawn = false,
    sourceDrawn = false,
    returnedWorld = false,
    lastVisibleText = null,
    lastEscapePaint,
    lastEscapeMenu
  const numbers = new WeakSet(),
    notices = new Set()
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const event = (kind, values) => {
    if (kind === 'contact') contacted = true
    return append(events, { kind, ...values }, 512)
  }
  const present = (stage, values) => append(handoff, { stage, ...values }, 512)

  function pixels({ width, height, data }) {
    let hash = 0x811c9dc5
    let rgb = 0
    let nonBlack = 0
    let opaque = 0
    for (let i = 0; i < data.length; i += 4) {
      const red = data[i]
      const green = data[i + 1]
      const blue = data[i + 2]
      const alpha = data[i + 3]
      rgb += red + green + blue
      if (red || green || blue) nonBlack++
      if (alpha === 255) opaque++
      hash = Math.imul((hash ^ red ^ (green << 8) ^ (blue << 16) ^ (alpha << 24)) >>> 0, 16777619)
    }
    return {
      width,
      height,
      nonBlack,
      opaque,
      rgbMean: rgb / (width * height * 3),
      hash: hash >>> 0,
    }
  }
  const canvasPixels = (ctx) => pixels(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height))
  for (const type of ['keydown', 'keyup']) {
    globalThis.addEventListener(
      type,
      (input) => {
        if (!contacted && input.code !== 'ArrowRight') return
        if (
          !input.isTrusted ||
          input.repeat ||
          !['ArrowRight', 'Enter', 'Escape', 'KeyQ'].includes(input.code)
        )
          return
        append(
          inputs,
          {
            kind: type === 'keydown' ? 'down' : 'up',
            code: input.code,
            eventTimeStamp: input.timeStamp,
          },
          24,
        )
      },
      true,
    )
  }
  const getCount = (world) => world.inventory.find(({ itemId: id }) => id === itemId)?.count ?? 0
  globalThis.__beeWorld = Object.freeze({
    postWin,
    event,
    escape: escapeCase,
    escapeMenu(turn, slot, phase) {
      if (
        lastEscapeMenu?.turn === turn &&
        lastEscapeMenu.slot === slot &&
        lastEscapeMenu.phase === phase
      )
        return
      lastEscapeMenu = { turn, slot, phase }
      event('escape-menu', lastEscapeMenu)
    },
    escapePaint(players, text) {
      const visible = { players, text }
      const key = JSON.stringify(visible)
      if (key === lastEscapePaint) return
      lastEscapePaint = key
      event('escape-paint', visible)
    },
    read: () => ({
      seed,
      events,
      handoff,
      inputs,
      timeOrigin: performance.timeOrigin,
      errors,
      overflow,
    }),
    activeSlot: () => activeSlot !== null,
    route(source, sceneId, position, facing, ready) {
      globalThis.__routeObserve?.(source, {
        scene: sceneId,
        sceneVisit: 0,
        actors: { party: { position: [position.col, position.row, position.height], facing } },
        routeReady: ready,
        routeDialogue: false,
      })
    },
    take(source) {
      const sample = rng.next()
      event('draw', { source, sample, draw: ++draws, slot: activeSlot })
      return sample
    },
    slot(stage, slot, definition, world) {
      activeSlot = stage === 'before' ? slot : null
      event('slot', {
        stage,
        slot,
        definition,
        draws,
        loot: getCount(world),
        party: world.party.map(({ hp, mp }) => [hp, mp]),
      })
    },
    surface(value) {
      surface = value
    },
    entry(frame, completedRounds, complete) {
      if (completedRounds !== entryBand) {
        entryBand = completedRounds
        present(completedRounds === 0 ? 'battle-entry' : 'battle-intro', {
          completedRounds,
          pixels: pixels(frame),
        })
      }
      if (complete && !entryComplete) {
        entryComplete = true
        present('battle-entry-complete', { completedRounds, pixels: pixels(frame) })
      }
    },
    commandReady(ctx) {
      if (commandDrawn) return
      commandDrawn = true
      present('battle-command-ready', { pixels: canvasPixels(ctx) })
    },
    fade(layer, alpha, ctx, frame) {
      if (frame && !sourceDrawn) {
        sourceDrawn = true
        present('battle-source', { pixels: pixels(frame), text: lastVisibleText })
      }
      const stage = layer === 'world' ? 'world-fade-in' : alpha === 1 ? 'black' : 'fade-out'
      present(stage, { layer, alpha, pixels: canvasPixels(ctx) })
    },
    returned(ctx, scene, position, menu) {
      if ((!sourceDrawn && !(escapeCase && commandDrawn)) || returnedWorld) return
      returnedWorld = true
      present('world-ready', { scene, position: { ...position }, menu, pixels: canvasPixels(ctx) })
    },
    music(stage, asset, audioContextState) {
      if (contacted) event('music', { stage, asset, audioContextState })
    },
    ambient(asset, audioContextState, buffer) {
      event('ambient', {
        track: Number(asset.split('.').at(-1)),
        audioContextState,
        seconds: buffer.duration,
      })
    },
    notice(id, text) {
      if (surface === 'battle') lastVisibleText = text
      if (activeSlot === null || notices.has(id)) return
      notices.add(id)
      const world = globalThis.__rfWorld
      event('notice', {
        id,
        text,
        slot: activeSlot,
        surface,
        loot: getCount(world),
        party: world.party.map(({ hp, mp }) => [hp, mp]),
      })
    },
    number(number, age) {
      if (numbers.has(number)) return
      numbers.add(number)
      const { num, tone, x, y } = number
      event('number', { value: num, tone, x, y, age })
    },
    settlement(screen) {
      if (screen === lastSettlement) return
      lastSettlement = screen
      event('settlement', { screen })
    },
  })
}

const read = (page) =>
  page.evaluate((observeEscape) => {
    const run = window.__tpObserve?.readRuntime()
    const world = window.__rfWorld
    const entity = window.__rfScene?.entities.find(({ id }) => id === 'e154')
    return {
      now: performance.now(),
      boot: window.__tpObserve?.readBoot(),
      run,
      encounterBusy: window.__tpE2e?.dumpMotionState()?.hostileBusy,
      phase: window.__rfBattle?.debugReadiness().phase,
      enemySlots: window.__rfBattle?.enemySlotDefs().map(({ id }) => id),
      entity: entity ? { hidden: !!entity.hidden } : null,
      ...(observeEscape && { lifecycle: world?.entityLifecycles?.s006?.e154 ?? null }),
      party: world?.party.map(({ template, equipment, hp, maxHP, mp, maxMP, level, exp }) => ({
        template,
        weapon: equipment.weapon,
        hp,
        maxHP,
        mp,
        maxMP,
        level,
        exp,
      })),
      inventory: world?.inventory,
      money: world?.money,
      events: window.__beeWorld?.read().events ?? [],
      handoff: window.__beeWorld?.read().handoff ?? [],
    }
  }, Boolean(escapeCase))
const ready = ({ run, encounterBusy }) =>
  run?.sceneId === scene &&
  !encounterBusy &&
  !run.battleActive &&
  !run.dialogue &&
  !run.presentationBusy &&
  !run.scriptRunning &&
  run.fadeBlack === 0
const at = (state, expected) =>
  state.run?.position && grid(state.run.position).every((n, i) => n === expected[i])
const observed = (state, kind) => state.events.filter((entry) => entry.kind === kind)
const facts = ({ events, handoff, ...state }) => state

const fixture = await createFixture()
await runBrowserJourney({
  name: `q2-world-bee-reforge${escapeCase ? `-escape-${escapeCase}` : ''}${postWin ? '-post-win-save' : postBattleSave ? '-save' : ''}${captureRequested ? `-${cases[0].seed}-capture` : probe ? '-probe' : ''}${escapeExits ? '-exits' : ''}`,
  packageName: '@type-pal/reforge',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal' },
  sources: [
    'projects/pal/content/scenes/s006.json',
    'projects/pal/content/maps/map-004.json',
    'projects/pal/content/enemies.json',
    'projects/pal/content/shared-scripts.json',
    'projects/pal/content/enemy-teams.json',
    'projects/pal/content/battle-fields.json',
    'projects/pal/content/actors.json',
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/manifest.json',
    'projects/pal/assets/index.json',
    'projects/pal/assets/migrated/sounds/066.wav',
    'projects/pal/assets/migrated/sounds/073.wav',
    'projects/pal/assets/migrated/music/003.mid',
    'projects/pal/assets/migrated/music/037.mid',
    ...(escapeCase
      ? [
          'projects/pal/assets/migrated/sounds/045.wav',
          'scripts/e2e/battle-world-escape-compare.mjs',
        ]
      : []),
    ...(postBattle ? ['scripts/e2e/battle-world-save.mjs'] : []),
    ...(postWin ? ['projects/pal/content/skills.json'] : []),
  ],
  traceConfig: postBattleSave
    ? 'scripts/e2e/battle-world-save-reforge.config.mts'
    : 'scripts/e2e/battle-world-bee-reforge.config.mts',
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: 300_000,
  arguments: ['--headless', ...(captureRequested ? ['--capture'] : [])],
  initScripts: [installCommittedRoutePlayback],
  async journey({ newPage, baseURL, out, report, until, capture, health }) {
    Object.assign(report, {
      engine: 'reforge',
      fragment: escapeExits
        ? 'q2-world-escape-exits'
        : escapeCase
          ? 'q2-world-player-escape'
          : 'q2-world-bee',
      input: escapeCase
        ? { ...beeWorldInput, party: roster, battleInput: ['KeyQ'] }
        : postWin
          ? { ...beeWorldInput, party: roster, postWin: true }
          : beeWorldInput,
      cases: [],
    })
    report.save = await writeEvidenceArtifact(out, 'reforge-input.json', fixture)
    report.predecessor = { kind: 'canonical-world-save-fixture', ...report.save }
    for (const spec of cases) {
      for (const repetition of capture.enabled || probe || escapeExits ? [1] : [1, 2]) {
        const { seed, exitKey, exitSteps } = spec
        const label = `seed-${seed}-run-${repetition}${exitKey ? `-${exitKey}-${exitSteps}` : ''}`
        const result = { ...spec, label, repetition, actionRange: { start: report.actions.length } }
        report.cases.push(result)
        const page = await newPage(label)
        const preparePage = (target) =>
          target.addInitScript(
            `(${installObserver})(${createSeedableRng}, ${createEvidenceRecorder}, ${seed}, ${JSON.stringify(honeycombItem)}, ${Boolean(escapeCase)}, ${postWin})`,
          )
        await preparePage(page)
        const record = (action) => report.actions.push(canonicalInput(action))
        const press = (key, phase) =>
          pressRecordedKey({
            keyboard: page.keyboard,
            action: { key, phase, context: label },
            record,
          })
        const wait = (accept, label, timeout) => until(() => read(page), accept, label, timeout)
        const move = (route, phase) =>
          replayCommittedRoute({
            page,
            route,
            health,
            onInput: (event) => record({ ...event, context: label, phase }),
          })
        const markReady = (state) =>
          page.evaluate(
            ({ sceneId, position, facing }) =>
              globalThis.__beeWorld.route('read:world.ready', sceneId, position, facing, true),
            state.run,
          )
        try {
          await page.route('**/__bee-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }),
          )
          await page.goto(`${baseURL}/?e2e-load=%2F__bee-checkpoint.json`)
          const initial = await wait(
            (state) => state.boot?.checkpointLoad === 'loaded' && ready(state),
            'normal scene from current save codec',
            60_000,
          )
          assert(at(initial, start))
          assert.deepEqual(
            initial.party.map(({ template, hp, mp, weapon }) => ({ template, hp, mp, weapon })),
            roster.map(({ id: template, hp, mp, weapon }) => ({
              template,
              hp,
              mp,
              weapon: String(weapon),
            })),
          )
          assert.equal(loot(initial.inventory), 0)
          result.initial = facts(initial)
          await capture.arm(page, { event: 'before-world-movement', seed, scene, grid: start })
          await markReady(initial)
          await move(approachPlan, 'world-approach')
          const encounter = await wait(
            (state) =>
              state.phase === 'menu' &&
              state.handoff.some(({ stage }) => stage === 'battle-command-ready'),
            'native bee battle menu',
          )
          result.encounter = facts(encounter)
          if (escapeCase) {
            const { verifyWorldEscape } = await import('./battle-world-escape.mjs')
            const trace = await verifyWorldEscape({
              engine: 'reforge',
              result,
              page,
              read: () => read(page),
              until,
              press,
              capture,
              probe,
              walk: move,
              evidence: () => page.evaluate(() => globalThis.__beeWorld.read()),
            })
            result.raw = await writeEvidenceArtifact(out, `${label}-trace.json`, trace)
            continue
          }
          await press('Enter', 'battle')
          const victory = await wait(
            (state) => observed(state, 'settlement').length === 1,
            'actual battle settlement render',
          )
          result.victory = facts(victory)
          if (capture.enabled)
            await capture.readable(
              '获得经验值 4，打败敌人得 4 文钱',
              true,
              async () => (await read(page)).phase === 'over',
            )
          await wait(
            (state) => performanceAge(state, 'settlement') >= 40,
            'native settlement confirm window',
          )
          await press('Enter', 'settlement')
          if (postWin) {
            for (const [kind, text] of [
              ['level-up', '阿奴修行提升'],
              ['learn-magic', `阿奴练成${beePostWin.skill.label}`],
            ]) {
              const shown = (state) => observed(state, 'settlement').at(-1)?.screen.kind === kind
              await wait(
                (state) => shown(state) && performanceAge(state, 'settlement') >= 40,
                `native Reforge ${kind} page`,
              )
              if (capture.enabled)
                await capture.readable(text, true, async () => shown(await read(page)))
              await press('Enter', 'settlement')
            }
          }
          const returned = await wait(
            (state) =>
              ready(state) &&
              state.entity?.hidden &&
              observed(state, 'hidden').length === 1 &&
              state.handoff.some(({ stage }) => stage === 'world-ready'),
            'return to world after loot scripts',
            12_000,
          )
          assert(at(returned, stop))
          result.returned = facts(returned)
          await press(returnInput[0], 'world-control')
          result.control = facts(
            await wait((state) => state.run?.menuActive, 'world menu accepts input after victory'),
          )
          await press(returnInput[1], 'world-control')
          const end = await wait(
            (state) => ready(state) && !state.run.menuActive && at(state, stop),
            'world menu closes and control returns',
          )
          result.end = facts(end)
          if (!postWin)
            await wait(
              (state) => {
                const resumed = state.handoff.find(
                  ({ stage, alpha }) => stage === 'world-fade-in' && alpha === 0,
                )
                return (
                  resumed && observed(state, 'ambient').some(({ atMs }) => atMs >= resumed.atMs)
                )
              },
              'actual ten-mile ambience resumes after the map is fully bright',
              12_000,
            )
          assert.deepEqual(
            observed(end, 'notice').map(({ text }) => text),
            Array.from(
              { length: spec.grants.reduce((sum, count) => sum + count, 0) },
              () => honeycombText,
            ),
          )
          if (postBattle) {
            result.raw = await writeEvidenceArtifact(
              out,
              `${label}-trace.json`,
              await page.evaluate(() => globalThis.__beeWorld.read()),
            )
            result.actionRange.end = report.actions.length
            await postBattle({
              engine: 'reforge',
              page,
              newPage,
              baseURL,
              out,
              report,
              until,
              health,
              capture,
              result,
              postWin,
              prepareFresh: preparePage,
            })
          }
          if (capture.enabled)
            await capture.readable('探索画面', true, async () => ready(await read(page)))
          await capture.finish(page, {
            event: postBattle ? 'after-post-battle-save-and-load' : 'after-world-menu-round-trip',
            seed,
            scene,
            grid: stop,
          })
        } finally {
          result.actionRange.end ??= report.actions.length
          if (!result.raw) {
            const trace = await page.evaluate(() => globalThis.__beeWorld?.read())
            if (trace) result.raw = await writeEvidenceArtifact(out, `${label}-trace.json`, trace)
          }
          if (!capture.enabled) await page.close()
        }
      }
    }
  },
})

function performanceAge(state, kind) {
  return state.now - observed(state, kind)[0]?.atMs
}
