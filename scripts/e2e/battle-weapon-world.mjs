import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { setTimeout as pause } from 'node:timers/promises'
import {
  gameWorldCheckpoint,
  makeWorldWhipFixtures,
  plan,
  scriptFixtureRoutes,
  worldCase,
  worldWhipSources,
} from './battle-weapon-world-scenarios.mjs'
import { runBrowserJourney } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine) &&
    [undefined, '--probe', '--capture', '--wrong-slot'].includes(mode),
  'usage: node scripts/e2e/battle-weapon-world.mjs game|reforge [--probe|--capture|--wrong-slot]',
)
const isGame = engine === 'game'
const repeats = mode ? 1 : 2
const counter = mode === '--wrong-slot'
const route = counter ? plan.slice(0, 6) : plan
const fixtures = await makeWorldWhipFixtures(counter ? 2 : worldCase.weaponSlot)
const read = (page) => page.evaluate(() => globalThis.__whipWorldRead?.())
const evidence = (page) => page.evaluate(() => globalThis.__whipWorldEvidence.read())
const ready = (state) => state?.ready && state.scene === worldCase.scene
const started = ({ role, stock }) => ({ role, stock })

function installWitness(_context, makeRecorder) {
  const paints = [],
    removals = [],
    errors = []
  let overflow = false,
    lastPaint,
    quantity
  const { append } = makeRecorder({
    context: () => ({ atMs: performance.now() }),
    errors,
    onOverflow: () => {
      overflow = true
    },
  })
  globalThis.__whipWorldEvidence = Object.freeze({
    begin: () => {
      quantity = null
    },
    amount: (draw) => {
      quantity = draw
    },
    leave: () => {
      lastPaint = undefined
    },
    paint: (draw) => {
      const frame = { ...draw, quantity }
      const signature = JSON.stringify(frame)
      if (signature === lastPaint) return
      lastPaint = signature
      append(paints, frame, 128)
    },
    remove: (command) => append(removals, command, 8),
    read: () => ({ paints, removals, errors, overflow }),
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
        ['/__q2-world-equip-save.json', fixtures.save],
      ]
  for (const [url, payload] of routes)
    await page.route(`**${url}`, (consumer) =>
      consumer.fulfill({
        contentType: 'application/json',
        body: JSON.stringify(payload),
      }),
    )
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
    await setup.goto(`${baseURL}/?skip-intro=1&dev-scene=${worldCase.index}`)
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
    return gameWorldCheckpoint(baseline)
  } finally {
    await setup.close()
  }
}

async function openFixture(page, baseURL, boot, press, until) {
  await installRoutes(page)
  if (!isGame) {
    await page.goto(`${baseURL}/?e2e-load=%2F__q2-world-equip-save.json`)
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
  return until(
    () => read(page),
    (s) => ready(s) && s.role.weapon === worldCase.initialWeapon,
    'Game loaded real slot',
    60_000,
  )
}

async function selectInEquipMenu(page, wait, press, id, item, before, hold) {
  const readCurrent = () => read(page)
  for (let keys = 0; keys < 16; keys++) {
    const { menu } = await readCurrent()
    if (menu?.kind === 'equip' && menu.phase === 'list') break
    let key
    if (!menu || menu.kind === 'equip') key = 'Escape'
    else {
      const wanted =
        menu.kind === 'in-game'
          ? '5'
          : menu.kind === 'inventory-action'
            ? '22'
            : menu.entries.includes('item')
              ? 'item'
              : 'equip'
      assert(menu.entries.includes(wanted), `missing equipment menu entry ${wanted}`)
      key = menu.entries[menu.cursor] === wanted ? 'Enter' : 'ArrowDown'
    }
    await press(key, id)
    await wait((s) => JSON.stringify(s?.menu) !== JSON.stringify(menu), `${id} accepted ${key}`)
  }
  const current = (await readCurrent()).menu
  assert(current?.kind === 'equip' && current.phase === 'list')
  const desired = current.entries.indexOf(item)
  assert(desired >= 0, `${id}: real equip menu lacks the stocked item`)
  for (let i = current.cursor; i !== desired; ) {
    const delta = i < desired ? 1 : -1
    await press(delta > 0 ? 'ArrowRight' : 'ArrowLeft', id)
    i += delta
    await wait((s) => s?.menu?.cursor === i, `${id} moved equipment cursor`)
  }
  const previousOrder = (await evidence(page)).paints.at(-1)?.order ?? -1
  await press('Enter', id)
  const selected = await wait(
    (s) => s?.menu?.phase === 'pick-role' && s.menu.selected === item,
    `${id} confirmed the item in the actual equip list`,
  )
  assert.deepEqual(
    started(selected),
    started(before),
    'item selection equipped before role confirmation',
  )
  const preview = await hold(item, before.role.weapon, id, previousOrder)
  return { selected: started(selected), preview }
}

await runBrowserJourney({
  name: `q2-whip-world-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/battle-weapon-world.config.mts',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal', Q2_WHIP_WORLD_ENGINE: engine },
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: 180_000,
  sources: await worldWhipSources(),
  initScripts: [installCommittedRoutePlayback, evidenceObserverScript(installWitness)],
  async journey({ newPage, baseURL, out, report, until, capture }) {
    Object.assign(report, {
      engine,
      lane: 'Q2',
      repeats,
      counter: counter ? 'body-slot' : 'none',
      cases: [],
    })
    const checkpoint = isGame ? await makeGameFixture(newPage, baseURL, until) : fixtures.save
    report.fixture = await writeEvidenceArtifact(out, 'input.json', {
      checkpoint,
      event: fixtures.fixtureCommand,
      plan: route,
    })
    for (let repetition = 1; repetition <= repeats; repetition++) {
      const runId = `world-equip-${repetition}`
      const page = await newPage(runId)
      const result = { runId, steps: [], resourceErrors: [] }
      page.on('console', (message) => {
        if (
          message.type() === 'error' &&
          !message.location().url.endsWith('/projects/pal/.type-pal/save-state.json')
        )
          result.resourceErrors.push({ text: message.text(), location: message.location() })
      })
      page.on('response', (response) => {
        const { pathname } = new URL(response.url())
        if (response.status() >= 400 && !pathname.endsWith('/.type-pal/save-state.json'))
          result.resourceErrors.push({ url: pathname, status: response.status() })
      })
      report.cases.push(result)
      const press = (key, step, phase = 'world-equip') =>
        pressRecordedKey({
          keyboard: page.keyboard,
          action: { key, phase, scope: 'story', context: runId, step },
          record: (input) => report.actions.push(input),
        })
      const readCurrent = () => read(page)
      const wait = (accept, label) => until(readCurrent, accept, label, 3_500)
      const hold = async (selected, weapon, id, previousOrder) => {
        const row = await until(
          () => evidence(page),
          ({ paints }) => {
            const frame = paints.at(-1)
            return (
              frame?.selected === selected && frame.weapon === weapon && frame.order > previousOrder
            )
          },
          `${id} actual pick-role draw`,
          3_500,
        )
        if (capture.enabled) await pause(640)
        return row.paints.at(-1)
      }
      try {
        result.initial = await openFixture(page, baseURL, checkpoint, press, until)
        assert.equal(result.initial.role.weapon, worldCase.initialWeapon)
        assert.deepEqual(result.initial.grid, worldCase.grid)
        assert.equal(result.initial.music, worldCase.music)
        assert.equal(result.initial.facing, worldCase.facing)
        if (capture.enabled) {
          report.fragment = 'q2-whip-world-equip'
          report.predecessor = { kind: 'world-equip-fixture', ...report.fixture }
          await capture.arm(page, { event: 'before-world-equipment', runId, state: result.initial })
        }
        for (const { id, kind, item } of route) {
          const begin = report.actions.length
          const before = await readCurrent()
          if (kind === 'equip') {
            const candidate = await selectInEquipMenu(page, wait, press, id, item, before, hold)
            await press('Enter', id)
            const after = await wait(
              (s) => s?.role.weapon === item,
              `${id} actual role confirmation`,
            )
            if (after.menu?.phase === 'pick-role')
              await hold(before.role.weapon, item, id, candidate.preview.order)
            result.steps.push({
              id,
              kind,
              item,
              before,
              after,
              ...candidate,
              inputs: [begin, report.actions.length],
            })
          } else {
            assert.equal(before.role.weapon, item)
            for (let menu = before.menu; menu; menu = (await readCurrent()).menu) {
              await press('Escape', id)
              await wait(
                (s) => JSON.stringify(s?.menu) !== JSON.stringify(menu),
                `${id} back toward world`,
              )
            }
            await wait(ready, `${id} actual world control`)
            const old = (await evidence(page)).removals.length
            await press('Enter', id)
            const witness = await until(
              () => evidence(page),
              (native) => native.removals.length > old,
              `${id} production script removed a slot`,
              3_500,
            )
            const after = await wait(ready, `${id} script returned normal control`)
            result.steps.push({
              id,
              kind,
              item,
              before,
              after,
              inputWitness: witness.removals.at(-1),
              inputs: [begin, report.actions.length],
            })
            if (capture.enabled) await pause(800)
          }
        }
        result.final = await readCurrent()
        if (capture.enabled) {
          const begin = report.actions.length
          const { preview } = await selectInEquipMenu(
            page,
            wait,
            press,
            'show-empty-weapon',
            '165',
            result.final,
            hold,
          )
          result.finalPreview = preview
          result.finalPreviewInputs = [begin, report.actions.length]
          assert.deepEqual(started(await readCurrent()), started(result.final))
          await pause(800)
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
        const raw = await evidence(page).catch(() => null)
        result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, raw)
        await page.close()
      }
    }
  },
})
