import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import {
  actors,
  equipmentCatalogue,
  equipmentScenario,
  gameWorldCheckpoint,
  loadEquipmentInputs,
  makeEquipmentFixture,
  room,
  scriptFixtureRoutes,
  worldEquipmentSources,
} from './battle-weapon-world-scenarios.mjs'
import { runBrowserJourney } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, ...options] = process.argv.slice(2)
const profileArgs = options.filter((arg) => arg.startsWith('--case='))
const [mode] = options.filter((arg) => !arg.startsWith('--case='))
assert(
  ['game', 'reforge'].includes(engine) &&
    profileArgs.length <= 1 &&
    options.length <= profileArgs.length + 1 &&
    [undefined, '--probe', '--capture', '--wrong-slot'].includes(mode),
  'usage: node scripts/e2e/battle-weapon-world.mjs game|reforge [--case=PROFILE] [--probe|--capture|--wrong-slot]',
)
const isGame = engine === 'game'
const inputs = await loadEquipmentInputs()
const scenario = equipmentScenario(
  profileArgs[0]?.slice('--case='.length) ?? 'whips',
  equipmentCatalogue(inputs),
  mode === '--wrong-slot',
)
assert(!scenario.wrongSlot || scenario.id === 'whips')
const repeats = mode ? 1 : 2
const fixtures = await makeEquipmentFixture(inputs, scenario)
const read = (page) => page.evaluate(() => globalThis.__worldEquipmentRead?.())
const evidence = (page, full = false) =>
  page.evaluate((all) => globalThis.__worldEquipmentEvidence.read(all), full)
const ready = (state) => state?.ready && state.scene === room.scene
const equipmentState = ({ party, stock }) => ({ party, stock })
const normalizedRole = (id) => (typeof id === 'number' ? id : actors.indexOf(id))

function installWitness(_context, makeRecorder) {
  const paints = []
  const equips = []
  const removals = []
  const errors = []
  let overflow = false
  let lastPaint, pending, quantity, icon, stats
  const { append, fail } = makeRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  function sampleFrame({ width, height, data }) {
    let digest = 2166136261
    const colors = new Set()
    // Sample the logical 320 × 200 board regardless of the backing canvas scale.
    for (let y = 0; y < 200; y += 5)
      for (let x = 0; x < 320; x += 5) {
        const offset = (Math.floor((y * height) / 200) * width + Math.floor((x * width) / 320)) * 4
        const rgb = data[offset] * 65536 + data[offset + 1] * 256 + data[offset + 2]
        colors.add(rgb)
        digest = Math.imul(digest ^ rgb, 16777619)
      }
    if (colors.size <= 1) throw new Error('equipment canvas sample is blank')
    return {
      width,
      height,
      colors: colors.size,
      digest: (digest >>> 0).toString(16).padStart(8, '0'),
    }
  }
  globalThis.__worldEquipmentEvidence = Object.freeze({
    begin: () => {
      quantity = null
      icon = null
      stats = []
    },
    amount: (value) => {
      quantity = value
    },
    icon: (value) => {
      icon = value
    },
    stat: (value) => {
      stats.push(value)
      return value
    },
    draw: (value) => {
      pending = { ...value, quantity, icon, stats }
    },
    present: (pixels) => {
      const draw = pending
      pending = undefined
      if (!draw) {
        lastPaint = undefined
        return
      }
      const signature = JSON.stringify(draw)
      if (signature === lastPaint) return
      lastPaint = signature
      try {
        append(paints, { ...draw, frame: sampleFrame(pixels()) }, 2048)
      } catch (error) {
        fail(error)
      }
    },
    equip: (command) => append(equips, command, 512),
    remove: (command) => append(removals, command, 256),
    read: (full) =>
      full
        ? { paints, equips, removals, errors, overflow, timeOrigin: performance.timeOrigin }
        : {
            paint: paints.at(-1) ?? null,
            equip: equips.at(-1) ?? null,
            removal: removals.at(-1) ?? null,
          },
  })
}

async function installRoutes(page) {
  const routes = isGame
    ? [
        [scriptFixtureRoutes.gameScene, fixtures.gameScene],
        [scriptFixtureRoutes.gameScripts, fixtures.scripts],
        [scriptFixtureRoutes.gameObjects, fixtures.objects],
      ]
    : [
        [scriptFixtureRoutes.reforgeScene, fixtures.reforgeScene],
        [scriptFixtureRoutes.reforgeSave, fixtures.save],
      ]
  for (const [url, payload] of routes) {
    const body = JSON.stringify(payload)
    await page.route(`**${url}`, (consumer) =>
      consumer.fulfill({ contentType: 'application/json', body }),
    )
  }
}

async function dismissBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const enter = page.locator('#boot-loading-enter-btn')
  if (await enter.isVisible()) await enter.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
}

async function makeGameFixture(newPage, baseURL, until) {
  const setup = await newPage('fixture')
  try {
    await installRoutes(setup)
    await setup.goto(`${baseURL}/?skip-intro=1&dev-scene=${room.index}`)
    await until(
      async () => {
        await dismissBoot(setup)
        return read(setup)
      },
      ready,
      'Game normal room baseline',
      60_000,
    )
    const baseline = await setup.evaluate(async () => {
      const { serializeSave } = await import('/src/tools/save-io.ts')
      return JSON.parse(serializeSave(globalThis.__tpgs))
    })
    return gameWorldCheckpoint(baseline, scenario)
  } finally {
    await setup.close()
  }
}

async function openFixture(page, baseURL, boot, press, until) {
  await installRoutes(page)
  if (!isGame) {
    await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent(scriptFixtureRoutes.reforgeSave)}`)
    return until(() => read(page), ready, 'Reforge normal room ready', 60_000)
  }
  await page.goto(baseURL)
  await until(
    async () => {
      await dismissBoot(page)
      const video = await page.evaluate(() => document.querySelector('video')?.currentSrc)
      if (video) {
        await press('Enter', 'title-prelude', 'restore')
        await until(
          () => page.evaluate(() => document.querySelector('video')?.currentSrc),
          (src) => src !== video,
          'normal title prelude closed',
        )
      }
      return read(page)
    },
    (s) => s?.menu?.kind === 'opening',
    'Game normal title',
    60_000,
  )
  const readback = await page.evaluate(async (value) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length) throw new Error('non-isolated Game slot')
    await Save.saveSlot(1, parseImportedSave(JSON.stringify(value)))
    return JSON.parse(serializeSave(await Save.loadSlot(1)))
  }, boot)
  assert.deepEqual(readback, boot)
  await press('ArrowDown', 'select-old-memories', 'restore')
  await until(
    () => read(page),
    (s) => s?.menu?.kind === 'opening' && s.menu.cursor === 1,
    'load selected',
  )
  await press('Enter', 'open-slot-list', 'restore')
  await until(
    () => read(page),
    (s) => s?.menu?.kind === 'save-slot' && s.menu.cursor === 0,
    'slot one selected',
  )
  await press('Enter', 'load-slot-one', 'restore')
  return until(() => read(page), ready, 'Game loaded real slot', 60_000)
}

function equipListKey(menu) {
  if (!menu || menu.kind === 'equip') return 'Escape'
  const wanted =
    menu.kind === 'in-game'
      ? '5'
      : menu.kind === 'inventory-action'
        ? '22'
        : menu.entries.includes('item')
          ? 'item'
          : 'equip'
  assert(menu.entries.includes(wanted), `missing equipment menu entry ${wanted}`)
  return menu.entries[menu.cursor] === wanted ? 'Enter' : 'ArrowDown'
}

async function selectItem(page, wait, press, { id, item }, before) {
  for (let keys = 0; keys < 16; keys++) {
    const { menu } = await read(page)
    if (menu?.kind === 'equip' && menu.phase === 'list') break
    const key = equipListKey(menu)
    await press(key, id)
    await wait((s) => JSON.stringify(s?.menu) !== JSON.stringify(menu), `${id} accepted ${key}`)
  }
  const { menu } = await read(page)
  assert(menu?.kind === 'equip' && menu.phase === 'list')
  const desired = menu.entries.indexOf(item)
  // The party case preserves the leader-only list as a product observation.
  if (desired < 0 && scenario.id === 'party') return { absentFromMenu: menu.entries }
  assert(desired >= 0, `${id}: real equip menu lacks the stocked item`)
  for (let cursor = menu.cursor; cursor !== desired; ) {
    const distance = desired - cursor
    const delta = Math.abs(distance) >= 3 ? Math.sign(distance) * 3 : Math.sign(distance)
    const keys = { '-3': 'ArrowUp', '-1': 'ArrowLeft', 1: 'ArrowRight', 3: 'ArrowDown' }
    await press(keys[delta], id)
    cursor += delta
    await wait((s) => s?.menu?.cursor === cursor, `${id} moved equipment cursor`)
  }
  const previousOrder = (await evidence(page)).paint?.order ?? -1
  await press('Enter', id)
  const selected = await wait(
    (s) => s?.menu?.phase === 'pick-role' && s.menu.selected === item,
    `${id} confirmed the item in the actual equip list`,
  )
  assert.deepEqual(
    equipmentState(selected),
    equipmentState(before),
    'item selection changed equipment',
  )
  return { selected, previousOrder }
}

await runBrowserJourney({
  name: `q2-equipment-${scenario.id}-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/battle-weapon-world.config.mts',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal', Q2_WHIP_WORLD_ENGINE: engine },
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: scenario.id.startsWith('catalogue-') ? 480_000 : 180_000,
  sources: await worldEquipmentSources(),
  initScripts: [installCommittedRoutePlayback, evidenceObserverScript(installWitness)],
  async journey({ newPage, baseURL, out, report, until, capture }) {
    Object.assign(report, {
      engine,
      lane: 'Q2',
      scenario: scenario.id,
      repeats,
      counter: scenario.wrongSlot ? 'body-slot' : 'none',
      cases: [],
    })
    const checkpoint = isGame ? await makeGameFixture(newPage, baseURL, until) : fixtures.save
    report.fixture = await writeEvidenceArtifact(out, 'input.json', {
      checkpoint,
      event: fixtures.event,
      scenario,
    })
    for (let repetition = 1; repetition <= repeats; repetition++) {
      const runId = `world-equip-${repetition}`
      const page = await newPage(runId)
      const result = { runId, steps: [], resourceErrors: [] }
      page.on('response', (response) => {
        const { pathname } = new URL(response.url())
        if (response.status() >= 400 && !pathname.endsWith('/.type-pal/save-state.json'))
          result.resourceErrors.push({ url: pathname, status: response.status() })
      })
      report.cases.push(result)
      const press = (key, step, phase = 'world-equip') =>
        pressRecordedKey({
          keyboard: page.keyboard,
          action: { key, phase, context: runId, step },
          record: (input) => report.actions.push(input),
        })
      const wait = (accept, label) => until(() => read(page), accept, label, 3_500)
      const native = (accept, label) => until(() => evidence(page), accept, label, 3_500)
      const hold = async (item, role, afterOrder, id) => {
        const { paint } = await native(
          ({ paint: draw }) =>
            draw?.selected === item &&
            normalizedRole(draw.role) === role &&
            draw.order > afterOrder,
          `${id} actual pick-role draw`,
        )
        if (capture.enabled) await pause(scenario.id.startsWith('catalogue-') ? 250 : 600)
        return paint
      }
      try {
        result.initial = await openFixture(page, baseURL, checkpoint, press, until)
        assert.deepEqual(
          result.initial.party.map(({ id, equipment }) => [id, equipment]),
          scenario.party.map((role, index) => [role, scenario.starting[index]]),
        )
        assert.deepEqual(result.initial.grid, room.grid)
        assert.equal(result.initial.music, room.music)
        assert.equal(result.initial.facing, room.facing)
        if (capture.enabled) {
          report.fragment = `q2-equipment-${scenario.id}`
          report.predecessor = { kind: 'world-equip-fixture', ...report.fixture }
          await capture.arm(page, { event: 'before-world-equipment', runId, state: result.initial })
        }
        for (const step of scenario.plan) {
          const { id, kind, item, role } = step
          const begin = report.actions.length
          const before = await read(page)
          let observed
          if (kind === 'equip') {
            const selection = await selectItem(page, wait, press, step, before)
            if (selection.absentFromMenu) observed = selection
            else {
              const first = await hold(
                item,
                selection.selected.menu.role,
                selection.previousOrder,
                id,
              )
              let navigated = selection.selected
              let preview = first
              if (role !== normalizedRole(first.role)) {
                // The party scenario uses exactly one normal down key to select its second member.
                assert.deepEqual(scenario.party, [0, role])
                await press('ArrowDown', id)
                // Game's field/menu update uses a slower tick than the browser's paint loop.
                // Observe both accepted and ignored navigation after that tick has elapsed.
                await pause(225)
                navigated = await read(page)
                if (navigated.menu.role !== selection.selected.menu.role)
                  preview = await hold(item, navigated.menu.role, first.order, id)
              }
              const old = (await evidence(page)).equip?.order ?? -1
              await press('Enter', id)
              const { equip } = await native(
                (row) => row.equip?.order > old,
                `${id} native equip commit`,
              )
              const after = await wait(
                (s) => s?.party.some(({ equipment }) => equipment.includes(item)),
                `${id} equipped after physical confirmation`,
              )
              let swapped = null
              if (after.menu?.phase === 'pick-role')
                swapped = await hold(after.menu.selected, after.menu.role, preview.order, id)
              observed = {
                selected: selection.selected,
                navigated,
                first,
                preview,
                equip,
                after,
                swapped,
              }
            }
          } else {
            for (let menu = before.menu; menu; menu = (await read(page)).menu) {
              await press('Escape', id)
              await wait(
                (s) => JSON.stringify(s?.menu) !== JSON.stringify(menu),
                `${id} back toward world`,
              )
            }
            await wait(ready, `${id} actual world control`)
            const old = (await evidence(page)).removal?.order ?? -1
            await press('Enter', id)
            const { removal } = await native(
              (row) => row.removal?.order > old,
              `${id} native room unequip`,
            )
            const after = await wait(ready, `${id} script returned normal control`)
            observed = { removal, after }
            if (capture.enabled && !scenario.id.startsWith('catalogue-')) await pause(650)
          }
          result.steps.push({
            ...step,
            before,
            ...observed,
            inputs: [begin, report.actions.length],
          })
        }
        result.final = await read(page)
        if (capture.enabled) {
          await pause(850)
          await capture.finish(page, {
            event: 'world-equipment-finished',
            runId,
            state: result.final,
          })
        }
      } catch (error) {
        result.failure = String(error)
        result.lastState = await read(page).catch(() => null)
        await page.screenshot({ path: resolve(out, `${runId}-failure.png`) }).catch(() => {})
        throw error
      } finally {
        const raw = await evidence(page, true).catch(() => null)
        result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, raw)
        await page.close()
      }
    }
  },
})
