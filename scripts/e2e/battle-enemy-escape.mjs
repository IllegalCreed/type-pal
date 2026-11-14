import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { tsImport } from 'tsx/esm/api'
import { enemyEscapeObserver } from './battle-enemy-escape-observer.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { canonicalInput, pressRecordedKey, withRecordedKey } from './input-ledger.mjs'

const [engine, mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine) &&
    [undefined, '--probe', '--capture'].includes(mode) &&
    process.argv.length <= 4,
  'usage: node scripts/e2e/battle-enemy-escape.mjs game|reforge [--probe|--capture]',
)
const spec = {
  scene: 's036',
  nextScene: 's037',
  owner: 'e602',
  team: 25,
  field: 24,
  seed: 6,
  start: [72, 10, 0],
  contact: [73, 10, 0],
  party: ['li-xiaoyao', 'lin-yueru'],
}
const read = (page) => page.evaluate(() => globalThis.__enemyEscape?.read())
const trace = (page) => page.evaluate(() => globalThis.__enemyEscape.trace())
const ready = (state) => state?.scene === spec.scene && state.ready
const pageKey = (box) => JSON.stringify([box?.at, box?.text, box?.style])
const confirmable = (box) =>
  box && ['waiting-input', 'waiting-page-key', 'waiting-end-key'].includes(box.phase)

async function dismissGameBoot(page) {
  const reject = page.getByRole('button', { name: '拒绝', exact: true })
  if (await reject.isVisible()) await reject.click()
  const enter = page.locator('#boot-loading-enter-btn')
  if (await enter.isVisible()) await enter.click()
  const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
  if (await start.isVisible()) await start.click()
}

async function gameFixture(page, baseURL, until) {
  await page.goto(`${baseURL}/?skip-intro=1&dev-scene=36`)
  await until(
    async () => {
      await dismissGameBoot(page)
      return read(page)
    },
    ready,
    'Game predecessor map',
    60_000,
  )
  const canonical = await page.evaluate(async () => {
    const { serializeSave } = await import('/src/tools/save-io.ts')
    return serializeSave(globalThis.__tpgs)
  })
  const payload = JSON.parse(canonical)
  const gs = payload.gs
  const [col, row] = spec.start
  const x = 16 * (col - row),
    y = 8 * (col + row)
  gs.party = { x, y, facing: 'right' }
  gs.camera = { x: x - 160, y: y - 112 }
  gs.trail = Array.from({ length: 5 }, (_, i) => ({ x: x - i * 16, y: y - i * 8, dir: 'right' }))
  gs.partyMembers = [0, 2]
  gs.dwCash = 150
  gs.inventory = []
  // The s034 precursor enables the authored s036 encounter.
  for (const table of [gs.npcs, gs.allEventObjects]) {
    for (const [id, state] of [
      [601, 0],
      [602, 2],
      [603, 0],
    ]) {
      const actor = table.find((npc) => npc.id === id)
      assert(actor, `missing native e${id}`)
      actor.sState = state
    }
  }
  return { payload, canonicalSha256: sha256(canonical) }
}

async function reforgeFixture() {
  const { buildWorld, validateActors } = await tsImport(
    '../../packages/content/src/index.ts',
    import.meta.url,
  )
  const { buildCurrentSavePayload } = await tsImport(
    '../../packages/reforge/src/save/ops.ts',
    import.meta.url,
  )
  const actors = validateActors(
    JSON.parse(
      await readFile(new URL('../../projects/pal/content/actors.json', import.meta.url)),
    ).filter(({ id }) => spec.party.includes(id)),
  )
  const byId = Object.fromEntries(actors.map((actor) => [actor.id, actor]))
  const world = buildWorld({ party: spec.party, money: 150, inventory: [] }, byId)
  world.script.entityState[spec.scene] = { e601: 0, e602: 2, e603: 0 }
  const [col, row, height] = spec.start
  return {
    payload: buildCurrentSavePayload(
      world,
      {
        sceneId: spec.scene,
        pos: { col, row, height },
        facing: 'right',
      },
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
    (state) => state?.menu?.kind === 'opening',
    'Game title menu',
    60_000,
  )
  const readback = await page.evaluate(async (saved) => {
    const { Save } = await import('/src/core/save/api.ts')
    const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
    if ((await Save.listSlots()).length !== 0) throw new Error('Game fixture slot is occupied')
    await Save.saveSlot(1, parseImportedSave(saved))
    return serializeSave(await Save.loadSlot(1))
  }, JSON.stringify(payload))
  assert.deepEqual(JSON.parse(readback), payload)
  await press('ArrowDown', 'restore')
  await until(
    () => read(page),
    (state) => state?.menu?.cursor === 1,
    'select Game 旧的回忆',
  )
  await press('Enter', 'restore')
  await until(
    () => read(page),
    (state) => state?.menu?.kind === 'save-slot',
    'Game slot list',
  )
  await press('Enter', 'restore')
  return sha256(`${readback}\n`)
}

async function restoreReforge(page, baseURL, payload) {
  await page.route('**/__q2-enemy-escape-save.json', (request) =>
    request.fulfill({
      contentType: 'application/json',
      body: JSON.stringify(payload),
    }),
  )
  await page.goto(`${baseURL}/?e2e-load=%2F__q2-enemy-escape-save.json`)
}

const sources =
  engine === 'game'
    ? [
        'data/extracted/events/all.json',
        'data/extracted/data/event-objects.json',
        'data/extracted/data/enemy-teams.json',
        'data/extracted/data/enemy-objects.json',
        'data/extracted/data/enemies.json',
        'data/extracted/data/scene/36.json',
        'data/extracted/data/scene/37.json',
        'data/extracted/data/tilemap/51.json',
        'data/extracted/music/047.mid',
        'data/extracted/sounds/45.wav',
      ]
    : [
        'projects/pal/manifest.json',
        'projects/pal/content/scenes/s034.json',
        'projects/pal/content/scenes/s036.json',
        'projects/pal/content/scenes/s037.json',
        'projects/pal/content/maps/map-051.json',
        'projects/pal/content/actors.json',
        'projects/pal/content/enemies.json',
        'projects/pal/content/enemy-teams.json',
        'projects/pal/content/locale.json',
        'projects/pal/assets/index.json',
        'projects/pal/assets/migrated/music/047.mid',
        'projects/pal/assets/migrated/sounds/045.wav',
      ]
const observer = enemyEscapeObserver({ ...spec, engine })
await runBrowserJourney({
  name: `q2-enemy-escape-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-enemy-escape-${engine}.config.mts`,
  environment: { E2E: '1', VITE_PROJECT_ID: 'pal' },
  sources,
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  initScripts: [installCommittedRoutePlayback, observer],
  async journey({ newPage, until, baseURL, report, out, capture }) {
    Object.assign(report, { engine, input: spec, cases: [] })
    let fixture
    if (engine === 'game') {
      const setup = await newPage('canonical-boot')
      try {
        fixture = await gameFixture(setup, baseURL, until)
      } finally {
        await setup.close()
      }
    } else fixture = await reforgeFixture()
    report.save = {
      ...(await writeEvidenceArtifact(out, 'input.json', fixture.payload)),
      ...(fixture.canonicalSha256 ? { canonicalSha256: fixture.canonicalSha256 } : {}),
    }
    for (let i = 1; i <= (mode ? 1 : 2); i++) {
      const context = `half-snake-${i}`
      const result = { context, actionRange: { start: report.actions.length } }
      report.cases.push(result)
      const page = await newPage(context)
      const record = (action) => report.actions.push(canonicalInput(action))
      const press = async (key, phase) => {
        await pressRecordedKey({ keyboard: page.keyboard, action: { key, phase, context }, record })
        if (engine === 'game') {
          const frame = await page.evaluate(() => globalThis.__tpgs?.frameNum)
          if (frame !== undefined) {
            const consumed = await page.waitForFunction(
              (prior) => globalThis.__tpgs.frameNum > prior,
              frame,
              { timeout: 3000 },
            )
            await consumed.dispose()
          }
        }
      }
      try {
        if (engine === 'game') {
          result.slotReadback = await restoreGame(page, baseURL, until, press, fixture.payload)
          assert.equal(result.slotReadback, report.save.sha256)
        } else await restoreReforge(page, baseURL, fixture.payload)
        const initial = await until(
          () => read(page),
          (state) => ready(state) && (engine === 'game' || state.checkpoint === 'loaded'),
          'native encounter fixture ready',
          60_000,
        )
        result.initial = initial
        assert.deepEqual(initial.position, spec.start)
        assert.deepEqual(
          initial.party.map(([id]) => id),
          spec.party,
        )
        assert.equal(initial.ownerState, 2)
        await capture.arm(page, {
          event: 'before-enemy-escape',
          scene: spec.scene,
          grid: spec.start,
        })
        let contact
        await withRecordedKey({
          keyboard: page.keyboard,
          key: 'ArrowRight',
          body: async () => {
            contact = await until(
              () =>
                page.evaluate(() =>
                  globalThis.__enemyEscape.trace().events.find(({ kind }) => kind === 'contact'),
                ),
              Boolean,
              'e602 contact after one right step',
              7000,
            )
          },
          onInput: (action) => record({ ...action, context, phase: 'approach' }),
        })
        assert.deepEqual(contact.position, spec.contact)
        let confirms = 0
        for (;;) {
          const state = await until(
            () => read(page),
            (value) => confirmable(value?.box),
            'next authored dialogue',
          )
          const key = pageKey(state.box)
          if (capture.enabled && state.box.text)
            await capture.readable(state.box.text, key, async () => pageKey((await read(page)).box))
          if (state.scene === spec.nextScene) {
            result.returned = state
            break
          }
          assert(++confirms < 10, 'enemy escape did not finish within bounded confirm count')
          await press(engine === 'game' ? 'Space' : 'Enter', 'dialogue')
          await until(
            () => read(page),
            (value) => !confirmable(value?.box) || pageKey(value.box) !== key,
            'native dialogue confirmation consumed',
          )
        }
        await capture.finish(page, {
          event: 'enemy-escape-scene-continuation',
          scene: result.returned.scene,
          grid: result.returned.position,
        })
      } finally {
        result.actionRange.end = report.actions.length
        const raw = await trace(page).catch(() => undefined)
        if (raw) result.raw = await writeEvidenceArtifact(out, `${context}-trace.json`, raw)
        await page.close()
      }
    }
  },
})
