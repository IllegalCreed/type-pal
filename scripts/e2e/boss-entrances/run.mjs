import assert from 'node:assert/strict'
import { tsImport } from 'tsx/esm/api'
import { nextGameBattleKey } from '../battle-game-input.mjs'
import { nextReforgeBattleKey } from '../battle-reforge-input.mjs'
import { toGamePixel } from '../battle-scripted-defeat-scenario.mjs'
import { runBrowserJourney, sha256 } from '../browser-journey.mjs'
import { installCommittedRoutePlayback } from '../committed-route.mjs'
import { writeEvidenceArtifact } from '../evidence-artifact.mjs'
import { canonicalInput, createRecordedHold, pressRecordedKey } from '../input-ledger.mjs'
import { installRenderedDialogueObservation } from '../rendered-dialogue-observation.mjs'
import { bossObserver } from './observe.mjs'
import {
  battlePartyFor,
  departingPosition,
  entranceSteps,
  gameScene,
  grid,
  growthPools,
  initialTrack,
  json,
  nativeMusic,
  observesForeground,
  partyFor,
  readSources,
  returnedPosition,
  scenarios,
  statsFields,
} from './scenarios.mjs'
import { woodTaoistCommand } from './wood-taoist-presentation.mjs'

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
const entrance = spec.entrance
const revisit = spec.revisit
const checkpointScene = entrance?.scene ?? spec.scene
const checkpoint = entrance?.start ?? revisit?.checkpoint ?? spec.start
const fieldMusic = initialTrack(spec)
const fieldMusicAsset = nativeMusic(fieldMusic)
const approach = spec.approach ?? 'ArrowUp'
const facing = (entrance?.key ?? revisit?.into.runs[0][0] ?? approach)
  .slice('Arrow'.length)
  .toLowerCase()
const returned = returnedPosition(spec)
const departure = departingPosition(spec)
const source = await readSources(spec)
const scriptedStop = source.tian ?? source.scriptedStop
const foreground = observesForeground(spec)
const night = spec.prelude?.night !== undefined
const handoff = spec.world.handoff
const scriptedReturn = spec.world.scriptedReturn
const party = partyFor(spec)
const battleParty = battlePartyFor(spec)
const hasReserve = battleParty.length > party.length
const fixtureMembers = hasReserve ? battleParty : party
const roles = fixtureMembers.map(({ role }) => role)
const nativeRoles = fixtureMembers.map(({ roleId }) => roleId)
const initialOwner = Number(spec.owner.slice(1))
const observe = bossObserver({
  engine,
  scene: spec.scene,
  gameScene: gameScene(spec),
  owner: spec.owner,
  watched: [...(spec.watched ?? []), ...Object.keys(source.tomb?.arrivalActors ?? {})],
  contactActors: Object.entries(source.setup ?? {})
    .filter(([, actor]) => actor.triggerIp)
    .map(([id]) => id),
  foreground,
  handoffScene: handoff?.scene,
  routeScenes: revisit ? [revisit.scene] : undefined,
  visitScenes:
    spec.sceneRoute?.visits.map(({ scene }) => scene) ?? (revisit ? [revisit.scene] : undefined),
  includesParty:
    spec.party === 'tomb' ||
    Boolean(
      source.tower ||
        source.route ||
        revisit ||
        scriptedStop ||
        source.gai ||
        source.wood ||
        source.phoenix ||
        source.qilin,
    ),
  victoryFade: Boolean(source.tower),
  watchChoice: Boolean(source.tian),
  scriptedReturn: Boolean(scriptedReturn),
  entrance,
  assets: Object.fromEntries(source.spriteChunks),
  seed: spec.seed,
})
const ready = (state, scene = spec.scene) => state?.scene === scene && state.ready
const waiting = new Set(['waiting-input', 'waiting-page-key', 'waiting-end-key'])
const lineKey = (box) => (box ? JSON.stringify([box.at, box.id, box.page, box.text]) : null)
const nextKey = game ? nextGameBattleKey : nextReforgeBattleKey
const confirm = game ? 'Space' : 'Enter'
const trace = (page) => page.evaluate(() => globalThis.__defeat.trace())

async function read(page) {
  return page.evaluate(
    ({
      game,
      roles,
      nativeRoles,
      initialOwner,
      settlementDwellMs,
      victoryFade,
      gateId,
      readsSkills,
    }) => {
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
      const selection = game ? null : battle?.selection.view
      const skillMenu =
        readsSkills && state
          ? game && state.magicSelect
            ? {
                cursor: state.magicSelect.cursor,
                items: state.magicSelect.items.map(({ id, disabled }) => ({
                  skillId: String(id),
                  disabled: Boolean(disabled),
                })),
              }
            : selection?.phase === 'skill' && state.players[selected]
              ? {
                  items: state.players[selected].skills.map((skillId) => ({
                    skillId,
                    disabled: state.players[selected].mp < state.skills[skillId].cost.mp,
                  })),
                }
              : null
          : null
      const settlement = game ? state?.settlement : battle?.settlementPresentation
      const screen = game ? settlement?.screens[settlement.index] : settlement?.currentScreen
      const owner = game
        ? gs.npcs.find(({ id }) => id === initialOwner)
        : globalThis.__rfScene?.entities.find(({ id }) => id === `e${initialOwner}`)
      return {
        ...observed,
        atMs: performance.now(),
        successor: globalThis.__bossForeground?.successor(),
        scriptedReturn: globalThis.__bossForeground?.scriptedReturn(),
        choice: globalThis.__bossForeground?.choice(),
        ...(gateId && {
          gate: game
            ? gs.npcs.find(({ id }) => `e${id}` === gateId)?.triggerLabel
            : world.script.behaviors.entities?.[observed.state.scene]?.[gateId]?.trigger,
        }),
        owner:
          owner &&
          (game
            ? {
                state: owner.sState,
                ...(victoryFade && { vanishTime: owner.sVanishTime ?? 0 }),
                triggerMode: owner.triggerMode,
                label: owner.triggerLabel,
                resume: owner.triggerResume?.ip ?? null,
              }
            : {
                hidden: owner.hidden === true,
                ...(victoryFade && {
                  lifecycle: world.entityLifecycles?.[observed.state.scene]?.[owner.id] ?? null,
                }),
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
                selection,
                skillMenu,
                snapshot: {
                  players: state.players.map((player, slot) => ({
                    id: game ? roles[nativeRoles.indexOf(player.roleId)] : player.roleId,
                    slot,
                  })),
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
                    ? settlement.shownMs >= (settlementDwellMs ?? 120) && settlement.index
                    : settlement.pageDrawn &&
                      settlement.elapsedMs >= (settlementDwellMs ?? 325) &&
                      settlement.screenIndex),
              }
            : null,
      }
    },
    {
      game,
      roles,
      nativeRoles,
      initialOwner,
      readsSkills: Boolean(spec.learned),
      settlementDwellMs: spec.settlementDwellMs,
      victoryFade: Boolean(source.tower),
      gateId: source.tian?.gateId,
    },
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
  await page.goto(`${baseURL}/?skip-intro=1&dev-scene=${gameScene({ scene: checkpointScene }) - 1}`)
  await until(
    async () => {
      await dismissGameBoot(page)
      return read(page)
    },
    ({ state } = {}) => ready(state, checkpointScene),
    'Game canonical scene',
    60_000,
  )
  const { canonical, staged } = await page.evaluate(
    async (preparation) => {
      const { serializeSave } = await import('/src/tools/save-io.ts')
      const world = globalThis.__tpgs
      const canonical = serializeSave(world)
      if (!preparation) return { canonical, staged: canonical }
      const { removeEquipmentEffect } = await import('/src/core/equipment-state.ts')
      for (const id of preparation) {
        for (const [slot, row] of world.PlayerRolesRuntime.rgwEquipment.entries()) {
          removeEquipmentEffect(world, id, slot)
          row[id] = 0
        }
      }
      return { canonical, staged: serializeSave(world) }
    },
    spec.party === 'city' ||
      spec.party === 'tomb' ||
      source.gai ||
      source.route ||
      revisit ||
      source.wood ||
      source.phoenix ||
      source.qilin
      ? nativeRoles
      : null,
  )
  const payload = JSON.parse(staged)
  const gs = payload.gs
  assert.equal(gs.wNumScene, gameScene({ scene: checkpointScene }))
  for (const table of entrance ? [gs.allEventObjects] : [gs.npcs, gs.allEventObjects]) {
    const actor = table.find(({ id }) => id === initialOwner)
    assert.deepEqual([actor.x, actor.y, actor.sState, actor.triggerMode], spec.disk.owner)
    if (!source.setup)
      assert.equal(actor.triggerLabel, `L_${spec.disk.firstVisit ?? spec.disk.entry}`)
    for (const [id, prepared] of Object.entries(source.setup ?? {})) {
      const npc = table.find(({ id: number }) => `e${number}` === id)
      assert(npc, `missing original predecessor actor ${id}`)
      npc.sState = prepared.state
      if (prepared.triggerIp === undefined) continue
      Object.assign(npc, {
        x: prepared.x,
        y: prepared.y,
        facing: prepared.facing,
        scriptedFrame: prepared.frame,
        currentFrameNum: 0,
        triggerMode: prepared.triggerMode,
        triggerLabel: `L_${prepared.triggerIp}`,
      })
      if (prepared.autoIp) npc.autoLabel = `L_${prepared.autoIp}`
      else delete npc.autoLabel
    }
    for (const [id, state] of Object.entries(source.preludeStates)) {
      const activated = table.find(({ id: objectId }) => `e${objectId}` === id)
      assert.equal(activated?.sState, source.preludeBefore[id], `predecessor input for ${id}`)
      activated.sState = state
    }
  }
  if (revisit) {
    gs.sceneOnEnterIp[gameScene({ scene: revisit.scene })] = revisit.hookIp
    const departed = gs.allEventObjects.find(({ id }) => id === 1846)
    assert.equal(departed.triggerLabel, 'L_21296')
    departed.sState = 0
  }
  const [x, y] = toGamePixel(checkpoint)
  gs.party = { x, y, facing }
  gs.camera = { x: x - 160, y: y - 112 }
  const [xx, yy] = toGamePixel(entrance?.contact ?? source.toad?.steps.into[0].to ?? spec.contact)
  gs.trail = Array.from({ length: 5 }, (_, i) => ({
    x: x - (xx - x) * i,
    y: y - (yy - y) * i,
    dir: facing,
  }))
  gs.partyMembers = party.map(({ roleId }) => roleId)
  for (const member of fixtureMembers) {
    const id = member.roleId
    for (const [name, field] of Object.entries(statsFields))
      gs.PlayerRolesRuntime[field][id] = member[name]
    for (const row of gs.PlayerRolesRuntime.rgwEquipment) row[id] = 0
    for (const [slot, row] of gs.PlayerRolesRuntime.rgwMagic.entries())
      row[id] = Number(spec.learned?.[member.role]?.[slot] ?? 0)
    gs.Exp.rgPrimaryExp[id] = { wExp: 0, wLevel: member.level, wCount: 0 }
    for (const pool of Object.values(growthPools))
      assert.deepEqual(gs.Exp[pool][id], { wExp: 0, wLevel: source.hiddenLevels[id], wCount: 0 })
  }
  gs.inventory = []
  gs.dwCash = 0
  gs.wNumMusic = fieldMusic
  if (night) gs.nightPalette = true
  if (spec.party === 'tomb') gs.PlayerRolesRuntime.rgwEquipment[5][1] = 274
  if (spec.accessory)
    gs.PlayerRolesRuntime.rgwEquipment[5][party[0].roleId] = Number(spec.accessory)
  if (spec.prelude?.completedAt !== undefined)
    gs.sceneOnEnterIp[gs.wNumScene] = spec.prelude.completedAt + 1
  if (source.preludeWave) {
    gs.wScreenWave = source.preludeWave.level
    gs.sWaveProgression = source.preludeWave.progression
  }
  if (source.preludePartyLayer !== undefined) assert.equal(gs.wLayer, source.preludePartyLayer * 8)
  if (foreground) gs.partyScriptedFrame = {}
  if (spec.disk.music !== undefined && scenario === 'yueru-outside') gs.wNumBattleMusic = spec.music
  if (source.tower || source.tian) {
    gs.wNumBattleField = spec.field
    gs.wNumBattleMusic = spec.music
  }
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
  const { applySetParty, buildWorld, validateActors } = await tsImport(
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
  const actorsById = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
  const world = buildWorld({ party: roles, money: 0, inventory: [] }, actorsById)
  for (const [i, { role, roleId, ...stats }] of fixtureMembers.entries()) {
    Object.assign(world.party[i], stats, {
      equipment:
        spec.party === 'tomb' && roleId === 1
          ? { accessory: '274' }
          : spec.accessory && roleId === party[0].roleId
            ? { accessory: spec.accessory }
            : {},
      hiddenExp: Object.fromEntries(
        Object.keys(growthPools).map((name) => [
          name,
          { level: source.hiddenLevels[roleId], exp: 0 },
        ]),
      ),
    })
    world.learnedSkills[role] = spec.learned?.[role] ?? []
  }
  if (hasReserve)
    applySetParty(
      world,
      party.map(({ role }) => role),
      actorsById,
    )
  world.audio = { currentMusic: fieldMusicAsset }
  if (night) world.ambience = 'night'
  if (spec.prelude) {
    world.script.entityState[spec.scene] = source.preludeStates
  }
  if (spec.prelude?.completedAt !== undefined) {
    world.script.behaviors.scenes = {
      [spec.scene]: { onEnter: { cursor: { hook: 'default', at: { kind: 'completed' } } } },
    }
  }
  if (source.preludeWave) {
    world.script.vars['sys:screenWave'] = source.preludeWave.level
    world.script.vars['sys:waveProgression'] = source.preludeWave.progression
  }
  if (source.preludePartyLayer !== undefined)
    world.script.vars['sys:partyLayer'] = source.preludePartyLayer
  if (revisit) {
    world.script.behaviors.scenes = {
      [revisit.scene]: { onEnter: { selection: { kind: 'use', value: revisit.hook } } },
    }
    world.script.entityState[revisit.scene] = { e1846: 0 }
  }
  if (source.setup) {
    world.script.entityState[spec.scene] = {}
    world.script.entityPos ??= {}
    world.script.entityPos[spec.scene] = {}
    world.script.behaviors.entities = { [spec.scene]: {} }
    for (const [id, prepared] of Object.entries(source.setup)) {
      world.script.entityState[spec.scene][id] = prepared.state
      if (!prepared.pos) continue
      world.script.entityPos[spec.scene][id] = prepared.pos
      world.script.behaviors.entities[spec.scene][id] = {
        trigger: { selection: { kind: 'use', value: prepared.triggerVariant } },
        triggerActivation: prepared.activation,
        auto: { selection: prepared.auto },
      }
    }
    if (source.inn.setupHook) {
      world.script.behaviors.scenes = {
        [spec.scene]: { onEnter: { selection: { kind: 'use', value: source.inn.setupHook } } },
      }
    }
  }
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
      { sceneId: checkpointScene, pos: grid(checkpoint), facing },
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
async function walk({
  page,
  health,
  record,
  key,
  phase,
  from,
  to,
  mode,
  scene = spec.scene,
  arrival = { scene, position: to },
}) {
  health()
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
    if (mode) {
      await page.evaluate((target) => globalThis.__routeArm({ kind: 'end', target }), {
        scene: arrival.scene,
        position: committed(arrival.position),
        mode,
      })
      await wait()
      await finalize()
    }
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
  let confirmed = false
  const worldDeadline = source.qilin
    ? capture.enabled
      ? 360_000
      : 195_000
    : source.route
      ? capture.enabled
        ? 480_000
        : 215_000
      : handoff || scriptedReturn || source.tian || source.gai || spec.prelude?.completedAt
        ? 195_000
        : 125_000
  const deadline = Date.now() + worldDeadline
  for (;;) {
    health()
    const view = await read(page)
    const { state, live, ended } = view
    if ((source.route || source.wood || source.phoenix || source.qilin) && ended)
      assert.equal(view.outcome, game ? 'won' : 'victory', 'native battle ended before victory')
    const returned = handoff
      ? view.successor?.scene === handoff.scene
      : scriptedReturn
        ? view.scriptedReturn?.scene === spec.scene
        : ready(state)
    if (ended && returned) return view
    assert(Date.now() < deadline, `world did not return after battle: ${JSON.stringify(view)}`)
    const box = state.box
    const line = lineKey(box)
    const timedReward =
      ended &&
      (source.tomb?.reward === box?.text ||
        source.qilin?.notes.some(({ text }) => text === box?.text))
    if (source.tian && !confirmed && view.choice) {
      assert.equal(view.choice.yes, false, 'first painted choice is No')
      await press('ArrowRight', 'open-jar-highlight')
      await page.waitForFunction(() => globalThis.__bossForeground?.choice()?.yes === true)
      await press(confirm, 'open-jar-confirm')
      confirmed = true
    } else if (box?.text && waiting.has(box.phase) && line !== lastLine && !timedReward) {
      lastLine = line
      if (
        capture.enabled &&
        !(await capture.readable(box.text, line, async () => lineKey((await read(page)).state.box)))
      )
        continue
      await press(confirm, ended ? 'after-dialogue' : 'before-dialogue')
    } else if (Number.isInteger(live?.settlement) && live.settlement > lastScreen) {
      lastScreen = live.settlement
      await press(confirm, 'settlement')
    } else if (live?.selectingPlayerId) {
      assert(
        live.turn <= (spec.maxRounds ?? (source.route ? 18 : 10)),
        'manual battle exceeded the planned rounds',
      )
      const defending = live.turn === 1 || Boolean(scriptedStop)
      const enemies = live.snapshot.enemies.filter((enemy) => enemy?.alive)
      const target =
        enemies.find(({ id }) => id === spec.firstTarget) ??
        enemies.find(({ id }) => id === spec.enemy) ??
        enemies[0]
      const command = {
        turn: live.turn,
        actorId: live.selectingPlayerId,
        kind: defending ? 'defend' : 'attack',
        targetId: defending ? null : target?.id,
      }
      const planned = source.wood
        ? woodTaoistCommand(live, command)
        : spec.recovery?.turn === live.turn
          ? {
              ...command,
              kind: 'cast',
              skillId: spec.recovery.skill,
              targetId: live.selectingPlayerId,
              targetSide: 'player',
            }
          : command
      const key = nextKey({ ...live, snapshot: { ...live.snapshot, enemies } }, planned)
      if (key) await press(key, 'battle-select')
    }
    await page.evaluate(
      () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
    )
  }
}

async function playRevisit({ page, press, record, health, capture, until, result }) {
  const { into, out, approach } = source.toad.steps
  const walkSteps = async (steps, scene, phase, arrival = null) => {
    for (const [index, step] of steps.entries()) {
      const crossing = index === steps.length - 1 && arrival
      await walk({
        page,
        health,
        record,
        ...step,
        scene,
        phase,
        mode: crossing && arrival.mode,
        ...(crossing && { arrival }),
      })
    }
  }
  await walkSteps(into, spec.scene, 'revisit-enter')
  let lastLine = null
  const entered = await until(
    async () => {
      health()
      const view = await read(page)
      const box = view?.state?.box
      const line = lineKey(box)
      if (
        view?.state?.scene === revisit.scene &&
        box?.text &&
        waiting.has(box.phase) &&
        line !== lastLine
      ) {
        lastLine = line
        if (
          !capture.enabled ||
          (await capture.readable(box.text, line, async () =>
            lineKey((await read(page)).state.box),
          ))
        ) {
          await press(confirm, 'revisit-dialogue')
        }
      }
      return view
    },
    (view) => ready(view?.state, revisit.scene),
    'source-authored return visit is ready',
    65_000,
  )
  result.revisit = { entered: entered.state }
  assert.deepEqual(entered.state.position, revisit.departure)
  result.revisit.prepared = await page.evaluate(
    ({ game, owner, scene }) => {
      if (game) {
        const actor = globalThis.__tpgs.allEventObjects.find(({ id }) => `e${id}` === owner)
        return { position: [actor.x, actor.y], facing: actor.facing, trigger: actor.triggerLabel }
      }
      const script = globalThis.__rfWorld.script
      const pos = script.entityPos?.[scene]?.[owner]
      return {
        position: pos ? [pos.col, pos.row, pos.height] : null,
        trigger: script.behaviors.entities?.[scene]?.[owner]?.trigger,
      }
    },
    { game, owner: spec.owner, scene: spec.scene },
  )
  await walkSteps(out, revisit.scene, 'revisit-leave', {
    scene: spec.scene,
    position: checkpoint,
    mode: 'ready',
  })
  result.revisit.returned = await page.evaluate(
    ({ game, owner, scene }) => {
      if (game) {
        const npc = globalThis.__tpgs.npcs.find(({ id }) => `e${id}` === owner)
        return { position: [npc.x, npc.y], facing: npc.facing, trigger: npc.triggerLabel }
      }
      const npc = globalThis.__rfScene.entities.find(({ id }) => id === owner)
      return {
        position: [npc.pos.col, npc.pos.row, npc.pos.height],
        facing: npc.facing,
        trigger: globalThis.__rfWorld.script.behaviors.entities?.[scene]?.[owner]?.trigger,
      }
    },
    { game, owner: spec.owner, scene: spec.scene },
  )
  for (const step of approach) {
    await walk({ page, health, record, ...step, phase: 'revisit-cave', mode: 'ready' })
  }
}

await runBrowserJourney({
  name: `q2-${spec.id}-${engine}-${option ? 'capture' : 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/boss-entrances/vite.config.mts',
  environment: {
    E2E: '1',
    VITE_PROJECT_ID: 'pal',
    Q2_DEFEAT_ENGINE: engine,
    Q2_BOSS_FOREGROUND: foreground ? '1' : '0',
  },
  sources: source.paths,
  arguments: ['--headless', ...(option ? [option] : [])],
  viewport: { width: 960, height: 720 },
  initScripts: [
    installCommittedRoutePlayback,
    observe,
    ...(foreground ? [installRenderedDialogueObservation] : []),
  ],
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
        ({ state }) => ready(state, checkpointScene) && (game || state.checkpoint === 'loaded'),
        'loaded checkpoint ready for real player movement',
        60_000,
      )
      if (!game) {
        const readback = await page.evaluate(() => globalThis.__tpE2e.dumpSave())
        result.slotReadback = await writeEvidenceArtifact(out, 'readback.json', readback)
      }
      assert.deepEqual(result.initial.state.position, checkpoint)
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
          ({ state }) => ready(state, checkpointScene),
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
        scene: checkpointScene,
        grid: checkpoint,
      })
      if (source.tower) {
        const idleSince = await page.evaluate(() => performance.now())
        await page.waitForFunction((start) => performance.now() >= start + 850, idleSince)
      }
      if (entrance) {
        await walk({
          page,
          health,
          record,
          key: entrance.key,
          phase: 'entrance',
          scene: entrance.scene,
          from: entrance.start,
          to: entrance.contact,
          arrival: { scene: spec.scene, position: entrance.landing },
          mode: 'ready',
        })
        for (const step of entranceSteps(spec)) {
          await walk({
            page,
            health,
            record,
            ...step,
            phase: 'inn-walk',
            mode: 'ready',
          })
        }
      }
      if (revisit) await playRevisit({ page, press, record, health, capture, until, result })
      await walk({
        page,
        health,
        record,
        key: approach,
        phase: 'approach',
        from: spec.start,
        to: spec.contact,
        mode:
          source.tower || source.route || source.scriptedStop || source.phoenix
            ? undefined
            : source.tian || spec.interact
              ? 'ready'
              : 'dialogue',
      })
      if (source.tian || spec.interact) {
        await press(confirm, 'interact')
        await wait(
          ({ state }) => state?.box?.text && state.scene === spec.scene,
          'native interaction starts the foreground dialogue',
        )
      }
      if (source.tower)
        await wait(
          ({ state }) => state?.battle && state.scene === spec.scene,
          'touch encounter enters the battle without a dialogue',
        )
      if (entrance) {
        const contacts = (await trace(page)).events.filter(({ kind }) => kind === 'trigger')
        assert.deepEqual(
          contacts.map(({ owner, position }) => [owner, position]),
          [[spec.owner, spec.contact]],
          'actual ambush trigger after the recorded walk',
        )
      }
      result.returned = await playEncounter({ page, press, health, capture })
      if (handoff || scriptedReturn) {
        if (source.phoenix) {
          await until(
            async () =>
              (await trace(page)).events.some(
                (event) =>
                  event.kind === 'world-drawn' &&
                  event.scene === handoff.scene &&
                  event.visible &&
                  event.party?.some(({ frame }) => frame === 1),
              ),
            Boolean,
            'successor first discernible animated pose',
          )
        }
        if (handoff?.musicIp !== undefined) {
          await until(
            async () =>
              (await trace(page)).events.find(
                ({ kind, track, context }) =>
                  kind === 'music-start' &&
                  track === source.successorTrack &&
                  context === 'running',
              ),
            Boolean,
            'authored successor music actually starts',
          )
        }
        if (capture.enabled || source.tomb?.arrival) {
          await page.waitForFunction(({ atMs, duration }) => performance.now() >= atMs + duration, {
            atMs: result.returned.atMs,
            duration: source.tomb?.arrival ? 2350 : 750,
          })
        }
        await capture.finish(page, {
          event: handoff ? 'world-boss-scene-handoff' : 'world-boss-scripted-return',
          scene: handoff?.scene ?? spec.scene,
          world: result.returned.state,
        })
        return
      }
      assert.deepEqual(result.returned.state.position, returned)
      if (source.qilin)
        await page.waitForFunction(
          (returnedAt) => performance.now() >= returnedAt + 450,
          result.returned.atMs,
        )
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
      if (foreground) {
        const dialogue = await page.evaluate(() => globalThis.__e2eRenderedDialogue())
        result.renderedDialogue = await writeEvidenceArtifact(
          out,
          'rendered-dialogue.json',
          dialogue,
        )
      }
      await page.close()
    }
  },
})
