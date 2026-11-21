import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { tsImport } from 'tsx/esm/api'
import { nextGameBattleKey } from '../../../scripts/e2e/battle-game-input.mjs'
import { nextReforgeBattleKey } from '../../../scripts/e2e/battle-reforge-input.mjs'
import { scriptedDefeatObserver } from '../../../scripts/e2e/battle-scripted-defeat-observer.mjs'
import { toGamePixel } from '../../../scripts/e2e/battle-scripted-defeat-scenario.mjs'
import { runBrowserJourney, sha256 } from '../../../scripts/e2e/browser-journey.mjs'
import { installCommittedRoutePlayback } from '../../../scripts/e2e/committed-route.mjs'
import { writeEvidenceArtifact } from '../../../scripts/e2e/evidence-artifact.mjs'
import {
  canonicalInput,
  pressRecordedKey,
  withRecordedKey,
} from '../../../scripts/e2e/input-ledger.mjs'
import { admitPillarCapture, fragment } from './contract.mjs'
import { assertCutscenes, installCollapseObserver } from './observe-collapse.mjs'
import { installInterludeWitness } from './observe-interlude.mjs'
import { installContinuousPartyDraws } from './observe-party.mjs'
import { installForegroundSageWitness } from './observe-sage-foreground.mjs'
import { installPartyPaletteWitness } from './party-palette.mjs'

const [engine, ...options] = process.argv.slice(2)
assert(['game', 'reforge'].includes(engine))
assert(
  options.every((option) =>
    ['--last', '--capture', '--sample-only', '--legacy-fixture'].includes(option),
  ),
)
const lastPillar = options.includes('--last')
const flee = options.includes('--flee')
const recording = options.includes('--capture')
const sampleOnly = options.includes('--sample-only')
const legacyFixture = options.includes('--legacy-fixture')
assert(lastPillar && !flee && !(sampleOnly && recording))
assert(!legacyFixture && !sampleOnly, 'interlude trace needs the native fixture and the full scene')
const game = engine === 'game'
const raw = JSON.parse(await readFile(new URL('./dragon-world-source.json', import.meta.url)))
const { scene, field, entry: owner } = raw
const gameScene = Number(scene.slice(1)) + 1
const actorId = Number(owner.slice(1))
const start = [60, 30]
const direction = 'up'
const preFight = start
const returned = start
const departure = [61, 30]
const seed = 4
const id = fragment
const admission = await admitPillarCapture()
const roles = raw.roles
const outfits = ['sprite-534', 'sprite-532', 'sprite-533']
const waiting = new Set(['waiting-input', 'waiting-page-key', 'waiting-end-key'])
const appearance = (world) =>
  world.party.map(({ template, appearance }) => [template, appearance?.spriteId ?? null])
const expectedAppearance = roles.map((role, index) => [role, outfits[index]])
const nativeRoles = raw.roleIds
const diskRoles = JSON.parse(
  await readFile(new URL('../../../data/extracted/data/player-roles.json', import.meta.url)),
).roles
const hiddenLevels = nativeRoles.map((id) => diskRoles[id].level)
assert.deepEqual(hiddenLevels, [5, 1, 3])

const growthPools = {
  maxHP: 'rgHealthExp',
  maxMP: 'rgMagicExp',
  attack: 'rgAttackExp',
  magicAttack: 'rgMagicPowerExp',
  defense: 'rgDefenseExp',
  speed: 'rgDexterityExp',
  luck: 'rgFleeExp',
}
const stats = [
  {
    level: 35,
    hp: 1600,
    maxHP: 1600,
    mp: 100,
    maxMP: 100,
    attack: 8000,
    defense: 320,
    speed: 900,
    magicAttack: 20,
    luck: 32,
  },
  {
    level: 35,
    hp: 1600,
    maxHP: 1600,
    mp: 100,
    maxMP: 100,
    attack: 520,
    defense: 320,
    speed: 850,
    magicAttack: 20,
    luck: 32,
  },
  {
    level: 35,
    hp: 1600,
    maxHP: 1600,
    mp: 100,
    maxMP: 100,
    attack: 420,
    defense: 320,
    speed: 800,
    magicAttack: 20,
    luck: 32,
  },
].map((member) => ({ ...member, luck: flee ? 1000 : member.luck }))
const gameFields = {
  rgwLevel: 'level',
  rgwHP: 'hp',
  rgwMaxHP: 'maxHP',
  rgwMP: 'mp',
  rgwMaxMP: 'maxMP',
  rgwAttackStrength: 'attack',
  rgwDefense: 'defense',
  rgwDexterity: 'speed',
  rgwMagicStrength: 'magicAttack',
  rgwFleeRate: 'luck',
}
const position = ([col, row]) => ({ col, row, height: 0 })
const ready = (state) => state?.scene === scene && state.ready
const originalObserver = scriptedDefeatObserver({ engine, scene, gameScene, owner, seed })
const roleAnchor = "{ 0: 'li-xiaoyao', 2: 'lin-yueru' }"
assert.equal(originalObserver.split(roleAnchor).length, 2)
const drawAnchor = '    const { ready, box, position, actors, party } = state'
assert.equal(originalObserver.split(drawAnchor).length, 2)
const observer = originalObserver
  .replace(drawAnchor, `    globalThis.__pillarParty?.record(geometry)\n${drawAnchor}`)
  .replace(roleAnchor, "{ 0: 'li-xiaoyao', 1: 'zhao-linger', 2: 'lin-yueru' }")
const nextBattleKey = game ? nextGameBattleKey : nextReforgeBattleKey
const planned = flee
  ? []
  : [
      ...Array.from({ length: 2 }, (_, i) =>
        roles.map((actorId) => ({
          turn: i + 1,
          actorId,
          kind: 'defend',
          targetId: null,
        })),
      ).flat(),
      { turn: 3, actorId: roles[0], kind: 'attack', targetId: `enemy-${raw.enemy}` },
      { turn: 3, actorId: roles[1], kind: 'defend', targetId: null },
      { turn: 3, actorId: roles[2], kind: 'defend', targetId: null },
    ]

async function dismissGameBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const enter = page.locator('#boot-loading-enter-btn')
  if (await enter.isVisible()) await enter.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
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
    'real title menu',
    60_000,
  )
  const readback = await page.evaluate(async (save) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length !== 0) throw new Error('fixture slot is occupied')
    await Save.saveSlot(1, parseImportedSave(save))
    return serializeSave(await Save.loadSlot(1))
  }, JSON.stringify(payload))
  assert.deepEqual(
    JSON.parse(readback),
    payload,
    'Game fixture changed across canonical serialization',
  )
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

async function read(page) {
  return page.evaluate(
    ({ engine, roles, nativeRoles, actorId, growthPools }) => {
      const observed = globalThis.__defeat?.read()
      if (!observed?.state) return observed
      const game = engine === 'game'
      const gs = globalThis.__tpgs
      const world = globalThis.__rfWorld
      const battle = game ? gs.battleState : globalThis.__rfBattle
      const state = game ? battle : battle?.state
      const gameSlot = state?.selectingPlayerIdx
      const selected = game ? state?.players[gameSlot] : state && battle.nextSelecting()
      const selectingPlayerId = game
        ? roles[nativeRoles.indexOf(selected?.roleId)]
        : state?.players[selected]?.roleId
      const settlement = game ? state?.settlement : battle?.settlementPresentation
      const screen = game ? settlement?.screens[settlement.index] : settlement?.currentScreen
      const now = performance.now()
      return {
        ...observed,
        now,
        activeScript: game ? gs.eventCursor?.ip : null,
        storyActors: Array.from({ length: 7 }, (_, index) => actorId + index).map((id) => [
          id,
          game
            ? gs.npcs.find((row) => row.id === id)?.sState
            : (world.script.entityState?.[observed.state.scene]?.[`e${id}`] ?? null),
        ]),
        landed: game ? !gs.sceneLoading : globalThis.__rfScene?.id === observed.state.scene,
        pillar: game
          ? {
              vanish: gs.npcs.find((npc) => npc.id === actorId)?.vanishTime,
            }
          : {
              hidden:
                globalThis.__rfScene?.entities.find((row) => row.id === `e${actorId}`)?.hidden ===
                true,
            },
        live:
          state && !observed.ended
            ? {
                engine,
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
                hp: game
                  ? state.players.map((p) => gs.PlayerRolesRuntime.rgwHP[p.roleId])
                  : state.players.map((p) => p.hp),
              }
            : null,
        progress:
          observed.ended && observed.state.scene === 's144'
            ? roles.map((role, i) => {
                const roleId = nativeRoles[i]
                const member = game ? gs.PlayerRolesRuntime : world.party.find((e) => e.id === role)
                const pools = Object.fromEntries(
                  Object.entries(growthPools).map(([name, key]) => {
                    const value = game ? gs.Exp[key][roleId] : member.hiddenExp?.[name]
                    return [name, game ? { level: value.wLevel, exp: value.wExp } : value]
                  }),
                )
                return {
                  role,
                  pools,
                  learned: (game
                    ? member.rgwMagic
                        .map((row) => row[roleId])
                        .filter(Boolean)
                        .map(String)
                    : (world.learnedSkills[role] ?? [])
                  ).sort((a, b) => Number(a) - Number(b)),
                }
              })
            : null,
      }
    },
    { engine, roles, nativeRoles, actorId, growthPools },
  )
}

async function makeGameFixture(page, baseURL, until) {
  await page.goto(`${baseURL}/?skip-intro=1&dev-scene=${gameScene - 1}`)
  await until(
    async () => {
      await dismissGameBoot(page)
      return read(page)
    },
    (view) => ready(view?.state),
    'load PAL scene 144',
    60_000,
  )
  const canonical = await page.evaluate(async () => {
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return serializeSave(globalThis.__tpgs)
  })
  const payload = JSON.parse(canonical)
  const gs = payload.gs
  assert.equal(gs.wNumScene, gameScene)
  for (const table of [gs.npcs, gs.allEventObjects]) {
    for (const row of raw.actors) {
      const actor = table.find((item) => item.id === row.id)
      assert.deepEqual(
        [actor.x, actor.y, actor.sState, actor.triggerMode],
        [row.x, row.y, row.state, row.triggerMode],
      )
      if (lastPillar && row.id !== actorId) actor.sState = 0
    }
  }
  const [x, y] = toGamePixel(start)
  gs.party = { x, y, facing: direction }
  gs.camera = { x: x - 160, y: y - 112 }
  gs.trail = Array.from({ length: 5 }, (_, i) => ({ x: x - 16 * i, y: y + 8 * i, dir: direction }))
  gs.partyMembers = nativeRoles
  for (const [slot, roleId] of nativeRoles.entries()) {
    for (const [field, name] of Object.entries(gameFields))
      gs.PlayerRolesRuntime[field][roleId] = stats[slot][name]
    for (const item of gs.PlayerRolesRuntime.rgwEquipment) item[roleId] = 0
    for (const magic of gs.PlayerRolesRuntime.rgwMagic) magic[roleId] = 0
    gs.Exp.rgPrimaryExp[roleId].wExp = 0
    gs.Exp.rgPrimaryExp[roleId].wLevel = stats[slot].level
    for (const pool of Object.values(growthPools))
      assert.deepEqual(gs.Exp[pool][roleId], { wExp: 0, wLevel: hiddenLevels[slot], wCount: 0 })
  }
  gs.inventory = []
  gs.dwCash = 0
  const settings = {
    field: gs.wNumBattleField,
    sceneMusic: gs.wNumMusic,
    battleMusic: gs.wNumBattleMusic,
  }
  gs.wNumBattleField = field
  gs.wNumMusic = 0
  gs.wNumBattleMusic = raw.battleMusic
  gs.wScreenWave = 2
  gs.sWaveProgression = 0
  return { payload, settings, baseline: sha256(canonical) }
}

async function makeReforgeFixture(native) {
  const { buildWorld, validateActors } = await tsImport(
    '../../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  let payload
  const entry = { sceneId: scene, pos: position(start), facing: direction }
  if (native) {
    assert.equal(native.position.sceneId, scene)
    assert.deepEqual(appearance(native.world), expectedAppearance)
    payload = structuredClone(native)
    payload.position = { ...native.position, ...entry }
  } else {
    const file = JSON.parse(
      await readFile(new URL('../../../projects/pal/content/actors.json', import.meta.url)),
    )
    const actors = Object.fromEntries(
      validateActors(file.filter((actor) => roles.includes(actor.id))).map((actor) => [
        actor.id,
        actor,
      ]),
    )
    payload = buildCurrentSavePayload(
      buildWorld({ party: roles, money: 0, inventory: [] }, actors),
      entry,
      'pal',
    )
  }
  const { world } = payload
  world.inventory = []
  world.money = 0
  for (const [i, role] of roles.entries()) {
    assert.equal(world.party[i].template, role)
    Object.assign(world.party[i], stats[i], {
      equipment: {},
      hiddenExp: Object.fromEntries(
        Object.keys(growthPools).map((stat) => [stat, { exp: 0, level: hiddenLevels[i] }]),
      ),
    })
    world.learnedSkills[role] = []
  }
  world.script.entityState[scene] = {
    ...world.script.entityState[scene],
    ...Object.fromEntries(
      raw.actors.filter((row) => row.id !== actorId).map((row) => [`e${row.id}`, 0]),
    ),
  }
  if (native) {
    assert.deepEqual(appearance(world), appearance(native.world))
    assert.deepEqual(world.script.vars, native.world.script.vars)
    assert.deepEqual(payload.sceneRuntime, native.sceneRuntime)
  }
  return { payload }
}

async function observeParty(page, until, out, stage) {
  await page.evaluate((name) => globalThis.__partyPalette.arm(name), stage)
  const { pixels, ...data } = await until(
    () => page.evaluate(() => globalThis.__partyPalette.read()),
    (item) => item?.stage === stage,
    `actual s144 drawing for ${stage}`,
    10000,
  )
  const bytes = Buffer.from(pixels, 'base64')
  const path = `party-palette-${stage}.png`
  await writeFile(resolve(out, path), bytes, { flag: 'wx' })
  assert.equal(data.rows.length, 3)
  assert(
    data.rows.every((row) => row.exact > 20),
    'each party sprite needs attributable actual pixels',
  )
  return await writeEvidenceArtifact(out, `party-palette-${stage}.json`, {
    ...data,
    image: { path, sha256: sha256(bytes), bytes: bytes.length },
  })
}

async function nativeReforgeEntry(page, baseURL, until, report, out) {
  await page.goto(`${baseURL}/?scene=s144`)
  const intro = await until(
    () => read(page),
    (view) =>
      view?.state?.scene === scene &&
      view.state.box?.text?.includes('七星磐龙柱') &&
      waiting.has(view.state.box.phase),
    'actual s144 entrance narration',
    60_000,
  )
  const note = intro.state.box
  await pressRecordedKey({
    keyboard: page.keyboard,
    action: { key: 'Enter', phase: 'native-scene-intro', context: 'canonical-boot' },
    record: (event) => report.actions.push(canonicalInput(event)),
  })
  await until(
    () => read(page),
    (view) => ready(view?.state),
    'canonical s144 entry onEnter complete',
  )
  const payload = await page.evaluate(() => globalThis.__tpE2e.dumpSave())
  const art = await observeParty(page, until, out, 'native-entry')
  return { payload, art, note }
}

async function writeInterlude(out, state) {
  const images = {}
  for (const [name, { bytes: encoded, ...witness }] of Object.entries(state.images)) {
    const bytes = Buffer.from(encoded, 'base64')
    const path = `interlude-${name}.png`
    await writeFile(resolve(out, path), bytes, { flag: 'wx' })
    images[name] = { ...witness, image: { path, sha256: sha256(bytes), bytes: bytes.length } }
  }
  return writeEvidenceArtifact(out, 'interlude.json', { events: state.events, images })
}

const sourceFiles = [
  'data/extracted/data/scene/144.json',
  'data/extracted/data/scene/152.json',
  'data/extracted/data/event-objects.json',
  'data/extracted/events/all.json',
  'data/extracted/data/player-roles.json',
  'data/extracted/data/enemy-teams.json',
  'data/extracted/data/enemy-objects.json',
  'data/extracted/data/magic.json',
  'data/extracted/data/object-magics.json',
  'data/extracted/data/battle-fields.json',
  'projects/pal/content/scenes/s152.json',
  'projects/pal/content/scenes/s144.json',
  'projects/pal/content/maps/map-185.json',
  'projects/pal/content/actors.json',
  'projects/pal/content/enemies.json',
  'projects/pal/content/skills.json',
  'projects/pal/content/locale.json',
  'projects/pal/content/battle-fields.json',
  'scripts/e2e/dragon-pillar/dragon-world-source.json',
  'data/extracted/data/scene/149.json',
  'data/extracted/data/scene/150.json',
  'data/extracted/data/rng-frames.json',
  'data/extracted/data/animation/rng-05.rle',
  'data/extracted/data/animation/rng-02.rle',
  'projects/pal/content/scenes/s149.json',
  'projects/pal/content/scenes/s150.json',
  'projects/pal/assets/index.json',
  'projects/pal/manifest.json',
  'projects/pal/content/sprites.json',
  'projects/pal/content/ambiences.json',
  'data/extracted/data/palette/0.json',
  'projects/pal/assets/migrated/colors/project-standard.json',
  'data/extracted/data/sprite/532.rle',
  'data/extracted/data/sprite/533.rle',
  'data/extracted/data/sprite/534.rle',
  'projects/pal/assets/migrated/sprites/532.rle',
  'projects/pal/assets/migrated/sprites/533.rle',
  'projects/pal/assets/migrated/sprites/534.rle',

  'projects/pal/assets/migrated/frame-animations/005.tpfs',
  'projects/pal/assets/migrated/frame-animations/002.tpfs',
  'data/extracted/data/sprite/494.rle',
  'data/extracted/data/sprite/59.rle',
  'data/extracted/data/sprite/474.rle',
  'data/extracted/data/sprite/495.rle',
  'data/extracted/data/sprite/492.rle',
  'data/extracted/data/sprite/460.rle',
  'data/extracted/data/sprite/16.rle',
  'data/extracted/data/sprite/358.rle',
  'data/extracted/data/sprite/444.rle',
  'projects/pal/assets/migrated/sprites/358.rle',
  'projects/pal/assets/migrated/sprites/444.rle',
]
const expectedLoot = []
const lineKey = (box) => (box ? JSON.stringify([box.at, box.id, box.page, box.text]) : null)

await runBrowserJourney({
  name: `${id}-${legacyFixture ? 'old-fixture' : 'native-fixture'}-${engine}-${recording ? 'capture' : 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/dragon-pillar/dragon-world-foreground.config.mts',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal', Q2_DEFEAT_ENGINE: engine },
  sources: [...sourceFiles, ...admission.workflow.documents.map(({ path }) => path)],
  arguments: ['--headless', ...(recording ? ['--capture'] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: 390_000,
  initScripts: [
    installCommittedRoutePlayback,
    installContinuousPartyDraws,
    installCollapseObserver,
    installPartyPaletteWitness,
    installInterludeWitness,
    installForegroundSageWitness,
  ],
  async journey({ newPage, baseURL, report, until, health, out, capture }) {
    const result = {}
    Object.assign(report, {
      engine,
      fragment: id,
      admission,
      input: {
        scene,
        owner,
        field,
        start,
        direction,
        preFight,
        returned,
        departure,
        seed,
        stats,
        planned,
        lastPillar,
        flee,
      },
      cases: [result],
    })
    let fixture
    if (game) {
      const setup = await newPage('canonical-boot')
      await setup.addInitScript(observer)
      try {
        fixture = await makeGameFixture(setup, baseURL, until)
      } finally {
        await setup.close()
      }
    } else if (legacyFixture) {
      fixture = await makeReforgeFixture()
    } else {
      const setup = await newPage('canonical-boot')
      await setup.addInitScript(observer)
      try {
        const native = await nativeReforgeEntry(setup, baseURL, until, report, out)
        result.nativeEntry = {
          save: await writeEvidenceArtifact(out, 'native-s144-save.json', native.payload),
          presentation: native.art,
          narration: native.note,
        }
        fixture = await makeReforgeFixture(native.payload)
      } finally {
        await setup.close()
      }
    }
    report.save = {
      ...(await writeEvidenceArtifact(out, 'input.json', fixture.payload)),
      sourceBoot: { settings: fixture.settings, sha256: fixture.baseline },
    }
    report.predecessor = { kind: 'canonical-world-save-fixture', ...report.save }
    const page = await newPage(id)
    await page.addInitScript(observer)
    const record = (event) => report.actions.push(canonicalInput(event))
    const press = async (key, phase) => {
      const input = await pressRecordedKey({
        keyboard: page.keyboard,
        action: { key, phase, context: id },
        record,
      })
      if (!game) return
      const frame = await page.evaluate(() => globalThis.__tpgs?.frameNum)
      if (frame === undefined) return
      const advanced = await page.waitForFunction(
        (frame) => globalThis.__tpgs.frameNum > frame && globalThis.__tpgs.frameNum,
        frame,
        { timeout: 4000 },
      )
      try {
        input.gameLogic = { dispatchedFrame: frame, observedFrame: await advanced.jsonValue() }
      } finally {
        await advanced.dispose()
      }
    }
    const wait = (accept, stage, timeout = 30_000) =>
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
        await page.route('**/__q2-venom-dragon-save.json', (request) =>
          request.fulfill({
            contentType: 'application/json',
            body: JSON.stringify(fixture.payload),
          }),
        )
        await page.goto(`${baseURL}/?e2e-load=%2F__q2-venom-dragon-save.json`)
      }
      result.initial = await wait(
        ({ state }) => ready(state) && (game || state.checkpoint === 'loaded'),
        'canonical save and dragon pillar',
        60_000,
      )
      assert.deepEqual(result.initial.state.position, [...start, 0])
      assert.deepEqual(
        result.initial.state.party.map(({ id, hp, mp, level }) => [id, hp, mp, level]),
        roles.map((id, i) => [id, stats[i].hp, stats[i].mp, stats[i].level]),
      )
      assert.deepEqual(result.initial.state.inventory, [])
      if (!game) {
        const readback = await page.evaluate(() => globalThis.__tpE2e.dumpSave())
        result.readback = await writeEvidenceArtifact(out, 'restored-s144-save.json', readback)
        assert.deepEqual(appearance(readback.world), appearance(fixture.payload.world))
        assert.deepEqual(readback.world.script.vars, fixture.payload.world.script.vars)
      }
      result.partyPalette = {
        initial: await observeParty(page, until, out, 'restored-world'),
      }
      const key = game ? 'Space' : 'Enter'
      await capture.arm(page, { event: 'before-dragon-interaction', scene, grid: start })
      await press(key, 'story-interact')
      let lastScreen = -1
      let lastLine = null
      let fleeSent = false
      const deadline = Date.now() + 170_000
      for (;;) {
        health()
        const view = await read(page)
        const { state, live, ended } = view
        if (ended && state.scene !== scene) {
          if (!lastPillar || !['s149', 's150'].includes(state.scene))
            throw new Error(`Unexpected dragon battle transfer to ${state.scene}`)
          result.transferred ??= view
          if (state.scene === 's149' && view.landed) result.arrival ??= view
          if (state.scene === 's150' && view.landed) {
            result.endpoint = await wait(
              ({ state, landed }) => state.scene === 's150' && landed,
              'native s150 arrival after both cutscenes',
              12_000,
            )
            result.visibleEndpoint = await until(
              () =>
                page.evaluate((game) => {
                  const scene = game
                    ? `s${String(window.__tpgs.wNumScene - 1).padStart(3, '0')}`
                    : window.__tpObserve.readRuntime().sceneId
                  if (scene !== 's150') return null
                  if (game) {
                    const gs = window.__tpgs
                    if (
                      gs.paletteFadeState ||
                      gs.fadeState ||
                      gs.needToFadeIn ||
                      gs.blackScreenHold
                    )
                      return null
                  } else if (window.__tpObserve.readRuntime().fadeBlack > 0.001) {
                    return null
                  }
                  const { events } = window.__collapse.snapshot()
                  if (
                    !events.some(
                      (event) => event.kind === 'first-world-flush' && event.scene === scene,
                    )
                  )
                    return null
                  const canvas = document.getElementById('screen')
                  const ctx = canvas.getContext('2d')
                  const rgba = ctx.getImageData(0, 0, canvas.width, canvas.height).data
                  let nonBlack = 0
                  for (let i = 0; i < rgba.length; i += 64) {
                    if (rgba[i] > 20 || rgba[i + 1] > 20 || rgba[i + 2] > 20) nonBlack++
                  }
                  return nonBlack >= 20 ? { at: performance.now(), scene, nonBlack } : null
                }, game),
              Boolean,
              'real non-black s150 display',
              12_000,
            )
            result.sageCue = await until(
              () => page.evaluate(() => window.__interlude.firstSageLine()),
              Boolean,
              'native first clause from the Sword Saint rendered in s150',
              18_000,
            )
            await page.evaluate(
              () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
            )
            const collapse = await page.evaluate(() => globalThis.__collapse.snapshot())
            assertCutscenes(collapse, engine)
            assert(
              result.partyPalette.collapse,
              'the collapse scene must carry tracked costume and pixel evidence',
            )
            if (recording) {
              await page.evaluate(
                (firstLineAt) =>
                  new Promise((done) => {
                    const hold = (now) => {
                      if (now - firstLineAt >= 365) done()
                      else requestAnimationFrame(hold)
                    }
                    requestAnimationFrame(hold)
                  }),
                result.sageCue.at,
              )
            }
            await page.evaluate(() => {
              const { events, images } = window.__interlude.snapshot()
              globalThis.__sageCaptureSnapshot = {
                interlude: { events: [...events], images: { ...images } },
                foreground: [...globalThis.__sageForeground.snapshot()],
              }
            })
            await capture.finish(page, {
              event: 'cliff-sage-first-line',
              scene: 's150',
              world: result.endpoint.state,
              dialogue: result.sageCue,
            })
            const { interlude, foreground } = await page.evaluate(
              () => globalThis.__sageCaptureSnapshot,
            )
            result.interlude = await writeInterlude(out, interlude)
            if (!game)
              result.foregroundSage = await writeEvidenceArtifact(
                out,
                'foreground-sage.json',
                foreground,
              )
            return
          }
        }
        if (!result.transferred && ended && ready(state)) {
          assert(!lastPillar, 'final victory left the party in the pillar scene')
          break
        }
        if (Date.now() >= deadline) {
          result.last = view
          throw new Error('Dragon collapse did not finish both cutscenes and land in s150')
        }
        const box = state.scene === scene ? state.box : null
        const line = lineKey(box)
        if (box?.text && waiting.has(box.phase) && line !== lastLine) {
          lastLine = line
          if (ended && box.text === '七根龙柱全部毁去' && !result.partyPalette.collapse) {
            result.partyPalette.collapse = await observeParty(page, until, out, 'collapse-cue')
            if (sampleOnly) return
          }
          if (capture.enabled)
            await capture.readable(box.text, line, async () =>
              lineKey((await read(page)).state.box),
            )
          await press(key, 'dialogue')
        } else if (Number.isInteger(live?.settlement) && live.settlement > lastScreen) {
          lastScreen = live.settlement
          await press(key, 'settlement')
        } else if (live?.selectingPlayerId) {
          const menu = game
            ? live.uiState === 'selectMove' && live.menuState === 'main'
            : live.selection?.phase === 'menu'
          if (flee && !fleeSent && !live.busy && menu && live.phase === 'selectAction') {
            fleeSent = true
            await press('KeyQ', 'battle-flee')
          }
          const input = planned.find(
            (cmd) => cmd.turn === live.turn && cmd.actorId === live.selectingPlayerId,
          )
          const button = nextBattleKey(live, input)
          if (button) await press(button, 'battle-select')
        }
        await page.evaluate(
          () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
        )
      }
      result.returned = await read(page)
      assert.deepEqual(result.returned.state.position, [...returned, 0])
      assert.deepEqual(result.returned.state.inventory, expectedLoot)
      assert.equal(result.returned.storyActors[0][1], flee ? (game ? 2 : null) : 0)
      assert(result.returned.storyActors.slice(1).every(([, state]) => state === (game ? 2 : null)))
      await withRecordedKey({
        keyboard: page.keyboard,
        key: 'ArrowRight',
        metadata: { phase: 'world-control', context: id },
        onInput: record,
        body: () =>
          wait(
            ({ state }) => ready(state) && state.position.join() === [...departure, 0].join(),
            'native movement after the pillar disappears',
          ),
      })
      result.departure = await read(page)
      assert.deepEqual(result.departure.state.inventory, expectedLoot)
      await capture.finish(page, {
        event: 'story-control-restored',
        scene,
        grid: departure,
        world: result.departure.state,
      })
    } finally {
      result.last ??= await read(page).catch(() => null)
      if (!result.interlude) {
        const sample = await page
          .evaluate(() => window.__interlude?.snapshot())
          .catch(() => undefined)
        if (sample) result.interlude = await writeInterlude(out, sample)
      }
      if (!game && !result.foregroundSage) {
        const foreground = await page
          .evaluate(() => globalThis.__sageForeground?.snapshot())
          .catch(() => undefined)
        if (foreground)
          result.foregroundSage = await writeEvidenceArtifact(
            out,
            'foreground-sage.json',
            foreground,
          )
      }
      const collapse = await page
        .evaluate(() => globalThis.__collapse?.snapshot())
        .catch(() => undefined)
      if (collapse)
        result.collapse = await writeEvidenceArtifact(out, 'collapse-presentation.json', collapse)
      const partyRenders = await page
        .evaluate(() => globalThis.__pillarParty?.snapshot())
        .catch(() => undefined)
      if (partyRenders)
        result.partyRenders = await writeEvidenceArtifact(out, 'red-party-draws.json', partyRenders)
      const trace = await page.evaluate(() => globalThis.__defeat?.trace()).catch(() => undefined)
      if (trace) result.raw = await writeEvidenceArtifact(out, `${id}-trace.json`, trace)
      await page.close()
    }
  },
})
