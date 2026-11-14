import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tsImport } from 'tsx/esm/api'
import { createSeedableRng } from '../../packages/game/src/core/rng.ts'
import {
  beePartyMember,
  beeWorldArguments,
  beeWorldInput,
  honeycombItem,
  honeycombText,
} from './battle-world-bee-scenario.mjs'
import { runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { createEvidenceRecorder } from './evidence-recorder.mjs'
import { canonicalInput, createRecordedHold, pressRecordedKey } from './input-ledger.mjs'

const { cases, capture: captureRequested } = beeWorldArguments()
const { scene, start, stop, exit, hold, retreat } = beeWorldInput
const loot = (inventory) => inventory?.find(({ itemId }) => itemId === honeycombItem)?.count ?? 0
const grid = ({ col, row }) => [col, row]

async function createFixture() {
  const { buildWorld, equipItem, validateActors, validateItems } = await tsImport(
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
  // This snapshot has only the equipped weapon, as does the Game fixture.
  world.inventory = []
  return buildCurrentSavePayload(
    world,
    { sceneId: scene, pos: { col: start[0], row: start[1], height: 0 }, facing: 'right' },
    'pal',
  )
}

function installObserver(makeRng, createRecorder, seed, itemId) {
  const rng = makeRng(seed)
  const events = [],
    errors = []
  let overflow = false,
    activeSlot = null,
    surface = null,
    draws = 0,
    lastSettlement
  const numbers = new WeakSet(),
    notices = new Set()
  const { append } = createRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  const event = (kind, values) => append(events, { kind, ...values }, 512)
  const getCount = (world) => world.inventory.find(({ itemId: id }) => id === itemId)?.count ?? 0
  globalThis.__beeWorld = Object.freeze({
    event,
    read: () => ({ seed, events, errors, overflow }),
    activeSlot: () => activeSlot !== null,
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
    notice(id, text) {
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
  page.evaluate(() => {
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
    }
  })
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
const facts = ({ events, ...state }) => state

const fixture = await createFixture()
await runBrowserJourney({
  name: `q2-world-bee-reforge${captureRequested ? `-${cases[0].seed}-capture` : ''}`,
  packageName: '@type-pal/reforge',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal' },
  sources: [
    'projects/pal/content/scenes/s006.json',
    'projects/pal/content/maps/map-004.json',
    'projects/pal/content/enemies.json',
    'projects/pal/content/enemy-teams.json',
    'projects/pal/content/battle-fields.json',
    'projects/pal/content/actors.json',
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
    'projects/pal/manifest.json',
  ],
  traceConfig: 'scripts/e2e/battle-world-bee-reforge.config.mts',
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: 300_000,
  arguments: ['--headless', ...(captureRequested ? ['--capture'] : [])],
  async journey({ newPage, baseURL, out, report, until, capture }) {
    Object.assign(report, {
      engine: 'reforge',
      fragment: 'q2-world-bee',
      input: beeWorldInput,
      cases: [],
    })
    report.save = await writeEvidenceArtifact(out, 'reforge-input.json', fixture)
    report.predecessor = { kind: 'canonical-world-save-fixture', ...report.save }
    for (const spec of cases) {
      for (const repetition of capture.enabled ? [1] : [1, 2]) {
        const { seed } = spec
        const label = `seed-${seed}-run-${repetition}`
        const result = { ...spec, label, repetition, actionRange: { start: report.actions.length } }
        report.cases.push(result)
        const page = await newPage(label)
        await page.addInitScript(
          `(${installObserver})(${createSeedableRng}, ${createEvidenceRecorder}, ${seed}, ${JSON.stringify(honeycombItem)})`,
        )
        const record = (action) => report.actions.push(canonicalInput(action))
        const press = (key, phase) =>
          pressRecordedKey({
            keyboard: page.keyboard,
            action: { key, phase, context: label },
            record,
          })
        const wait = (accept, label, timeout) => until(() => read(page), accept, label, timeout)
        const move = async (key, phase, end) => {
          const holdId = phase
          const handle = createRecordedHold({
            keyboard: page.keyboard,
            key,
            onInput: record,
            metadata: { phase, scope: 'story', context: label, routeId: phase, holdId },
          })
          try {
            await handle.down()
            await wait((state) => at(state, end), `actual ${phase} position`, 12_000)
          } finally {
            await handle.up('committed movement reached')
          }
        }
        try {
          await page.route('**/__bee-checkpoint.json', (route) =>
            route.fulfill({ contentType: 'application/json', body: JSON.stringify(fixture) }),
          )
          await page.goto(`${baseURL}/?e2e-load=%2F__bee-checkpoint.json&collision`)
          const initial = await wait(
            (state) => state.boot?.checkpointLoad === 'loaded' && ready(state),
            'normal scene from current save codec',
            60_000,
          )
          assert(at(initial, start))
          assert.equal(initial.party[0].weapon, String(beePartyMember.weapon))
          assert.equal(loot(initial.inventory), 0)
          result.initial = facts(initial)
          await capture.arm(page, { event: 'before-world-movement', seed, scene, grid: start })
          await move(hold[0][0], 'world-approach', stop)
          const encounter = await wait(
            (state) => state.phase === 'menu' && observed(state, 'contact').length === 1,
            'native bee battle menu',
          )
          result.encounter = facts(encounter)
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
            (state) => performanceAge(state, 'settlement') >= 300,
            'native settlement confirm window',
          )
          await press('Enter', 'settlement')
          const returned = await wait(
            (state) =>
              ready(state) && state.entity?.hidden && observed(state, 'hidden').length === 1,
            'return to world after loot scripts',
            12_000,
          )
          assert(at(returned, stop))
          result.returned = facts(returned)
          await move(retreat[0][0], 'world-exit', exit)
          const end = await wait(
            (state) => ready(state) && at(state, exit),
            'world movement restored',
          )
          result.end = facts(end)
          assert.deepEqual(
            observed(end, 'notice').map(({ text }) => text),
            Array.from(
              { length: spec.grants.reduce((sum, count) => sum + count, 0) },
              () => honeycombText,
            ),
          )
          await capture.finish(page, { event: 'after-world-control-step', seed, scene, grid: exit })
        } finally {
          result.actionRange.end = report.actions.length
          const trace = await page.evaluate(() => globalThis.__beeWorld?.read())
          if (trace) result.raw = await writeEvidenceArtifact(out, `${label}-trace.json`, trace)
          if (!capture.enabled) await page.close()
        }
      }
    }
  },
})

function performanceAge(state, kind) {
  return state.now - observed(state, kind)[0]?.atMs
}
