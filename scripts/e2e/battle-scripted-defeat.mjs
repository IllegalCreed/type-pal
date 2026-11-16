import assert from 'node:assert/strict'
import { scriptedDefeatObserver } from './battle-scripted-defeat-observer.mjs'
import {
  defeatScenario,
  defeatSources,
  makeGameDefeatSave,
  makeReforgeDefeatSave,
} from './battle-scripted-defeat-scenario.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback, replayCommittedRoute } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'

const [engine, mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine) &&
    (mode === undefined || ['--probe', '--capture'].includes(mode)) &&
    process.argv.length <= 4,
  'usage: node scripts/e2e/battle-scripted-defeat.mjs game|reforge [--probe|--capture]',
)
const spec = defeatScenario
const { id, scene, route } = spec
const observer = scriptedDefeatObserver({
  engine,
  scene,
  gameScene: spec.gameScene,
  owner: spec.owner,
  seed: spec.seed,
})
const read = (page) => page.evaluate(() => globalThis.__defeat?.read())
const routePlan = fixedRoutePlan(engine, {
  id: 'approach-yangzhou-thief',
  scene,
  start: route.start,
  holds: [['ArrowRight', 1]],
  completion: { scene, position: route.contact, mode: 'dialogue' },
})
const readTrace = (page) => page.evaluate(() => globalThis.__defeat.trace())
const ready = (state) => state?.scene === scene && state.ready

async function dismissGameBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const enter = page.locator('#boot-loading-enter-btn')
  if (await enter.isVisible()) await enter.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
}

async function gameFixture(page, baseURL, until) {
  await page.goto(`${baseURL}/?skip-intro=1&dev-scene=${spec.gameScene - 1}`)
  await until(
    async () => {
      await dismissGameBoot(page)
      return read(page)
    },
    ({ state } = {}) => ready(state),
    'boot current Game Yangzhou map',
    60_000,
  )
  const canonical = await page.evaluate(async () => {
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return serializeSave(globalThis.__tpgs)
  })
  return { payload: makeGameDefeatSave(canonical), canonicalSha256: sha256(canonical) }
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
    ({ state } = {}) => state?.menu?.kind === 'opening',
    'Game title menu',
    60_000,
  )
  const readback = await page.evaluate(async (save) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length !== 0) throw new Error('Game fixture slot is occupied')
    await Save.saveSlot(1, parseImportedSave(save))
    return serializeSave(await Save.loadSlot(1))
  }, JSON.stringify(payload))
  assert.deepEqual(JSON.parse(readback), payload, 'Game fixture changed across canonical codec')
  await press('ArrowDown', 'restore')
  await until(
    () => read(page),
    ({ state }) => state.menu?.cursor === 1,
    'select 旧的回忆',
  )
  await press('Enter', 'restore')
  await until(
    () => read(page),
    ({ state }) => state.menu?.kind === 'save-slot',
    'select slot 1',
  )
  await press('Enter', 'restore')
  return sha256(`${readback}\n`)
}

async function restoreReforge(page, baseURL, payload) {
  await page.route('**/__q2-scripted-defeat-save.json', (request) =>
    request.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(payload),
    }),
  )
  await page.goto(`${baseURL}/?e2e-load=%2F__q2-scripted-defeat-save.json`)
}

async function nextPress(page, key, phase, context, record) {
  const input = await pressRecordedKey({
    keyboard: page.keyboard,
    action: { key, phase, context, scope: 'story' },
    record,
  })
  if (engine !== 'game') return
  const previous = await page.evaluate(() => globalThis.__tpgs?.frameNum)
  if (previous === undefined) return
  const consumed = await page.waitForFunction(
    (frame) => globalThis.__tpgs.frameNum > frame && globalThis.__tpgs.frameNum,
    previous,
    { timeout: 3000 },
  )
  try {
    input.gameLogic = { dispatchedFrame: previous, observedFrame: await consumed.jsonValue() }
  } finally {
    await consumed.dispose()
  }
}

const confirmable = ({ box }) =>
  box && ['waiting-input', 'waiting-page-key', 'waiting-end-key'].includes(box.phase)
const activeLine = ({ box }) => (box ? JSON.stringify([box.at, box.id, box.page, box.text]) : null)

await runBrowserJourney({
  name: `q2-scripted-defeat-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: 'scripts/e2e/battle-scripted-defeat.config.mts',
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal', Q2_DEFEAT_ENGINE: engine },
  sources: defeatSources[engine],
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  initScripts: [installCommittedRoutePlayback],
  async journey({ newPage, until, health, baseURL, report, out, capture }) {
    Object.assign(report, { engine, fragment: id, input: spec, cases: [] })
    let fixture
    if (engine === 'game') {
      const setup = await newPage('canonical-boot')
      await setup.addInitScript(observer)
      try {
        fixture = await gameFixture(setup, baseURL, until)
      } finally {
        await setup.close()
      }
    } else {
      fixture = { payload: await makeReforgeDefeatSave() }
    }
    report.save = {
      ...(await writeEvidenceArtifact(out, 'input.json', fixture.payload)),
      ...(fixture.canonicalSha256 ? { canonicalSha256: fixture.canonicalSha256 } : {}),
    }
    report.predecessor = { kind: 'canonical-world-save-fixture', ...report.save }
    const count = mode ? 1 : 2
    for (let index = 1; index <= count; index++) {
      const context = `${id}-${index}`
      const result = { context, repetition: index, actionRange: { start: report.actions.length } }
      report.cases.push(result)
      const page = await newPage(context)
      await page.addInitScript(observer)
      const record = (action) => report.actions.push(canonicalInput(action))
      const press = (key, phase) => nextPress(page, key, phase, context, record)
      const wait = (accept, block, timeout) =>
        until(
          () => read(page),
          (details) => details?.state && accept(details),
          block,
          timeout,
        )
      let trace
      try {
        if (engine === 'game') {
          result.slotReadback = await restoreGame(page, baseURL, until, press, fixture.payload)
          assert.equal(result.slotReadback, report.save.sha256)
        } else await restoreReforge(page, baseURL, fixture.payload)
        const { state: initial } = await wait(
          ({ state }) => ready(state) && (engine === 'game' || state.checkpoint === 'loaded'),
          'current save restored on Yangzhou map',
          60_000,
        )
        result.initial = initial
        assert.deepEqual(initial.position, [...route.start, 0])
        assert.deepEqual(
          initial.party.map(({ id, hp, mp }) => [id, hp, mp]),
          [[spec.player, spec.hp, spec.mp]],
        )
        assert.deepEqual(
          initial.actors.map(({ id, state }) => [id, state]),
          spec.entities.map((id) => [id, 1]),
        )
        await capture.arm(page, { event: 'before-story-battle', scene, grid: route.start })
        await replayCommittedRoute({
          page,
          route: routePlan,
          health,
          onInput: (input) => record({ ...input, context, phase: 'approach' }),
        })
        let defended = false,
          confirms = 0
        for (;;) {
          const step = await wait(
            ({ state, ended }) =>
              (ended && ready(state)) || confirmable(state) || (state.battle?.menu && !defended),
            'live dialogue, battle command or script returning control',
            30_000,
          )
          const { state, ended } = step
          if (ended && ready(state)) break
          if (confirmable(state)) {
            assert(++confirms < 24, 'story did not finish within bounded confirm count')
            const display = activeLine(state)
            if (capture.enabled && state.box.text) {
              await capture.readable(state.box.text, display, async () => {
                const observed = await read(page)
                return activeLine(observed.state)
              })
            }
            await press(
              engine === 'game' ? 'Space' : 'Enter',
              ended ? 'post-defeat-dialogue' : 'pre-defeat-dialogue',
            )
            await wait(
              ({ state }) => !confirmable(state) || activeLine(state) !== display,
              'native confirmation consumed',
            )
            continue
          }
          assert.equal(defended, false, 'expected one defensive choice')
          result.commandMenu = state
          await press(spec.choice.key, 'battle')
          defended = true
        }
        assert(defended, 'scripted defeat never accepted a real battle command')
        await press('Escape', 'world-control')
        await wait(({ state }) => state.menuActive, 'world menu opens after scripted defeat')
        await press('Escape', 'world-control')
        const { state: returned } = await wait(
          ({ state, menuClosed }) => ready(state) && menuClosed,
          'close recovered world menu',
        )
        result.returned = returned
        trace = await readTrace(page)
        await capture.finish(page, {
          event: 'story-control-restored',
          engine,
          world: returned,
          scene,
          grid: returned.position,
        })
      } finally {
        result.actionRange.end = report.actions.length
        trace ??= await readTrace(page).catch(() => undefined)
        if (trace) result.raw = await writeEvidenceArtifact(out, `${context}-trace.json`, trace)
        await page.close()
      }
    }
  },
})
