import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { assertErrandCollector } from './errand-contract.mjs'
import {
  errandCausalObserverScript,
  readErrandGame,
  readErrandReforge,
} from './errand-observer.mjs'
import { readEvidenceArtifact } from './evidence-artifact.mjs'
import { hashRepositoryFiles } from './evidence-dependencies.mjs'
import { executeFixedRoute, fixedRoutePlan } from './fixed-route-plan.mjs'
import { readPredecessor } from './inn-contract.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'
import { readLongEvidenceArchive, writeLongEvidenceArtifact } from './long-evidence.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertReforgeRestoreInput } from './restore-input-contract.mjs'

const { values: options } = parseArgs({
  options: {
    engine: { type: 'string' },
    from: { type: 'string' },
    headed: { type: 'boolean' },
    headless: { type: 'boolean' },
  },
})
const { engine } = options
assert(['game', 'reforge'].includes(engine), 'choose --engine game or reforge')
assert(options.from, 'hidden room item requires a genuine formal 001 --from report')
assert(!(options.headed && options.headless), 'choose one browser mode')
const game = engine === 'game'
const reportPath = resolve(options.from)
const predecessor = await readPredecessor(reportPath, engine)
const predecessorBytes = await readFile(reportPath)
const predecessorReport = JSON.parse(predecessorBytes)
assert.equal(predecessorReport.profile, 'verify')
assert.equal(predecessorReport.matrixVerdict?.status, 'passed')
assert.deepEqual(
  await hashRepositoryFiles(repoRoot, Object.keys(predecessorReport.hashes)),
  predecessorReport.hashes,
  '001 source candidate changed before optional room guard',
)
const scene = game ? 2 : 's001'
const plan = fixedRoutePlan(engine, {
  id: 'bedroom-to-hidden-herb',
  scene: 's001',
  start: [60, -24],
  holds: [
    ['ArrowDown', 2],
    ['ArrowLeft', 3],
  ],
  completion: { scene: 's001', position: [57, -22], mode: 'ready' },
})
const ready = (state) => kitchenReady(state, engine)
const original = JSON.parse(
  await readFile(resolve(repoRoot, 'data/extracted/events/all.json')),
).segments[0].commands.slice(1902, 1908)
assert.deepEqual(
  original.map(({ op }) => op),
  ['raw', 'setDialogStyleNarration', 'showDialog', 'giveItem', 'raw', 'end'],
)
assert.equal(original[0].opcode, 0x47)
assert.equal(original[0].operands[0], 78)
assert.equal(original[2].messageIndex, 685)
assert.equal(original[3].itemId, 99)
assert.equal(original[4].opcode, 0x49)
assert.deepEqual(original[4].operands, [65535, 0, 0])
const leaf = (event) => event.occurrence?.command?.command

await runBrowserJourney({
  name: `${engine}-001-hidden-item`,
  packageName: `@type-pal/${engine}`,
  environment: game ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
  traceConfig: `scripts/e2e/errand-${engine}.config.mts`,
  arguments: [options.headed ? '--headed' : '--headless'],
  initScripts: [errandCausalObserverScript(), installCommittedRoutePlayback],
  viewport: { width: 1280, height: 800 },
  sources: [
    'data/extracted/events/all.json',
    'data/extracted/data/event-objects.json',
    'projects/pal/content/scenes/s001.json',
    'projects/pal/content/maps/map-012.json',
    'projects/pal/content/items.json',
    'projects/pal/content/locale.json',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      engine,
      fragment: '001',
      kind: 'verify',
      case: 'hidden-item',
      predecessor: {
        report: reportPath,
        reportSha256: sha256(predecessorBytes),
        sha256: predecessor.sha256,
      },
      route: { status: 'running', inputs: [], legs: [] },
      contextTraces: [],
      contextsProof: [],
      source: { scene: 's001', entity: 'e4', originalEntry: 'L_1902', commands: original },
      scope:
        'Separate optional bedroom search from actual 001 checkpoint; formal 001–010 route unchanged.',
    })
    let page
    let phase = 'bootstrap'
    const snapshot = () => page.evaluate(game ? readErrandGame : readErrandReforge)
    const drive = () => page.evaluate(() => window.__readErrandDrive(Number.MAX_SAFE_INTEGER))
    const itemState = () =>
      page.evaluate((game) => {
        const gs = window.__tpgs
        const inventory = game ? gs.inventory : window.__rfWorld.inventory
        const object = game
          ? gs.allEventObjects.find((entity) => entity.id === 4)
          : window.__rfScene.entities.find((entity) => entity.id === 'e4')
        return {
          inventory: structuredClone(inventory),
          money: game ? gs.dwCash : window.__rfWorld.money,
          count: inventory.find(({ itemId }) => String(itemId) === '99')?.count ?? 0,
          hidden: game ? object.sState === 0 : object.hidden === true,
        }
      }, game)
    const press = (key, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, scene: 's001', key, reason }),
        record: (action) => report.actions.push(action),
      })
    const restore = async (bytes, payload, label) => {
      phase = 'bootstrap'
      page = await newPage(label)
      if (!game) {
        await page.route('**/__hidden-item.json', (route) =>
          route.fulfill({ contentType: 'application/json', body: bytes }),
        )
        await page.goto(`${baseURL}/?e2e-load=%2F__hidden-item.json`)
        await until(
          snapshot,
          (state) => state.boot?.checkpointLoad === 'loaded' && ready(state),
          'native bedroom checkpoint restored',
          60_000,
        )
      } else {
        await page.goto(baseURL)
        await until(
          async () => {
            const opt = page.getByRole('button', { name: '拒绝', exact: true })
            if (await opt.isVisible()) await opt.click()
            const boot = page.locator('#boot-loading-enter-btn')
            if (await boot.isVisible()) await boot.click()
            const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
            if (await start.isVisible()) await start.click()
            const video = await page.evaluate(
              () => document.querySelector('video')?.currentSrc ?? null,
            )
            if (video) {
              assert(
                ['/extracted/videos/1.mp4', '/extracted/videos/2.mp4'].some((path) =>
                  video.endsWith(path),
                ),
              )
              await press('Enter', 'close title prelude outside the room guard')
              await until(
                () => page.evaluate(() => document.querySelector('video')?.currentSrc ?? null),
                (next) => next !== video,
                'title prelude closes',
              )
              return false
            }
            return (await snapshot()).menu?.kind === 'opening'
          },
          Boolean,
          'formal opening menu',
          60_000,
        )
        const staged = await page.evaluate(async (text) => {
          const { Save } = await import('/src/core/save/api.ts')
          const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
          if ((await Save.listSlots()).length) throw new Error('nonempty fresh test save slots')
          await Save.saveSlot(1, parseImportedSave(text))
          return serializeSave(await Save.loadSlot(1))
        }, bytes)
        assert.equal(sha256(staged), sha256(bytes), 'native imported save bytes changed')
        await press('ArrowDown', 'select 旧的回忆')
        await until(
          snapshot,
          (state) => state.menu?.kind === 'opening' && state.menu.cursor === 1,
          'load selection',
        )
        await press('Enter', 'open actual slot menu')
        await until(
          snapshot,
          (state) => state.menu?.kind === 'save-slot' && state.menu.cursor === 0,
          'slot menu',
        )
        await press('Enter', 'load actual slot1')
        await until(snapshot, ready, 'native bedroom checkpoint restored', 60_000)
      }
      assert.equal((await snapshot()).scene, scene)
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, label)
      let proof
      if (game) {
        const expected = structuredClone(payload)
        assert([0, 1].includes(expected.gs.currentSaveSlot), 'unexpected native bedroom save slot')
        // The first new-game F5 records slot 0. loadGameFromSlot explicitly selects
        // slot 1 (bootstrap.ts); model that real menu choice without editing save bytes.
        expected.gs.currentSaveSlot = 1
        proof = {
          ...assertBoatGameRestore(expected, trace.gameRestores[0]?.payload),
          contract: 'bedroom-game-complete-save-domain/1',
          normalizedFields: ['needToFadeIn', 'currentSaveSlot'],
          savedSlot: payload.gs.currentSaveSlot,
          loadedSlot: 1,
        }
      } else proof = assertReforgeRestoreInput(trace, payload)
      report.contextsProof.push({ label, restore: proof })
      await waitForOpeningFrame(page, until)
    }
    const repeat = async (label) => {
      phase = label
      const before = await itemState()
      assert(before.hidden && before.count === 1, 'room search did not remain collected')
      const start = await drive()
      await press('Enter', 'search the same already collected place')
      await until(
        drive,
        (next) => next.worldRender?.tick > start.worldRender.tick + 2,
        'repeat input followed by actual native world ticks',
      )
      assert(ready(await snapshot()))
      assert.deepEqual(await itemState(), before, 'repeat changed the collected state or rewards')
      const end = await drive()
      const trace = await readLongEvidenceArchive(page)
      const within = ({ order }) => order > start.order && order <= end.order
      assert.deepEqual(
        trace.inputs.filter(within).map(({ type, key, repeat }) => [type, key, repeat]),
        [
          ['keydown', 'Enter', false],
          ['keyup', 'Enter', false],
        ],
        'repeat lacks its native Enter dispatch',
      )
      assert.equal(
        trace.pages.filter((event) => within(event) && event.page).length,
        0,
        'disabled room search displayed another prompt',
      )
      const commands = trace.causes.filter((event) => within(event) && event.phase === 'command')
      assert(
        commands.every((event) =>
          game
            ? !['giveItem', 'showDialog'].includes(event.occurrence?.command?.op) &&
              !(event.occurrence?.command?.op === 'raw' && event.occurrence.command.opcode === 0x47)
            : !['giveItem', 'giveMoney', 'dialog', 'playSound'].includes(leaf(event)?.kind),
        ),
        'disabled room search executed another acquisition',
      )
      const hidden = trace.events.filter(
        (event) =>
          event.id === 'e4' &&
          event.kind === 'actor-render' &&
          event.order <= end.order &&
          (event.throughOrder ?? event.order) > start.order,
      )
      assert(
        hidden.length > 0 &&
          hidden.every(({ state }) => !state.visible && state.drawStatus === 'not-drawn'),
        'disabled room search lacks hidden renderer evidence',
      )
      return { startOrder: start.order, endOrder: end.order, hiddenDraws: hidden.length }
    }
    const archive = async (name) => {
      const trace = await readLongEvidenceArchive(page)
      assertErrandCollector(trace, name)
      report.contextTraces.push(await writeLongEvidenceArtifact(out, `${name}.trace.json`, trace))
      await page.screenshot({ path: resolve(out, `${name}.png`) })
      await page.close()
    }
    try {
      await restore(predecessor.bytes, predecessor.payload, 'room-original001-restore')
      assert.deepEqual(kitchenGrid((await snapshot()).position, engine), [60, -24])
      const before = await itemState()
      assert(!before.hidden && before.count === 0)
      phase = 'hidden-herb-approach'
      await executeFixedRoute({
        page,
        engine,
        plan,
        scene: 's001',
        id: plan.id,
        phase,
        report,
        snapshot,
        ready,
        health,
        evidence: () => page.evaluate(() => window.__readErrandRouteEvidence()),
        finished: (state) =>
          ready(state) && JSON.stringify(kitchenGrid(state.position, engine)) === '[57,-22]',
      })
      assert.equal((await snapshot()).facing, 'left')
      report.route.status = 'passed'
      phase = 'first-hidden-herb-search'
      const start = await drive()
      await press('Enter', 'search the hidden bedroom herb')
      await until(snapshot, (state) => !ready(state), 'actual room search started')
      for (let i = 0; i < 4; i++) {
        const state = await until(
          snapshot,
          (state) =>
            ready(state) ||
            (game
              ? ['waiting-page-key', 'waiting-end-key'].includes(state.dialog?.phase)
              : state.runtime?.dialogue?.phase === 'waiting-input'),
          'hidden herb prompt or restored control',
        )
        if (ready(state)) break
        await waitForOpeningFrame(page, until)
        await page.screenshot({ path: resolve(out, `hidden-herb-prompt-${i}.png`) })
        await press('Enter', 'confirm fully displayed hidden herb prompt')
        await until(snapshot, ready, 'hidden herb grants and disables')
      }
      const after = await itemState()
      assert(after.hidden && after.count === 1)
      assert.equal(after.money, before.money)
      const counts = (inventory) =>
        Object.fromEntries(inventory.map(({ itemId, count }) => [String(itemId), count]))
      assert.deepEqual(
        counts(after.inventory),
        { ...counts(before.inventory), 99: 1 },
        'room search changed other rewards',
      )
      const actual = await readLongEvidenceArchive(page)
      const commands = actual.causes.filter(
        (event) => event.order > start.order && event.phase === 'command',
      )
      const owner = actual.causes.filter(
        (event) =>
          event.order > start.order &&
          event.phase === 'run-started' &&
          event.author?.entity === 'e4' &&
          event.author?.channel === 'trigger',
      )
      if (!game) assert.equal(owner.length, 1, 'room search lacks its unique real trigger')
      const acquisition = game
        ? commands.filter((event) => event.occurrence?.ip >= 1902 && event.occurrence.ip <= 1907)
        : commands.filter((event) => event.runId === owner[0].runId)
      if (game)
        assert.deepEqual(
          acquisition.map((event) => event.occurrence.command),
          original,
        )
      else {
        assert.deepEqual(
          acquisition.map((event) => leaf(event).kind),
          ['playSound', 'dialog', 'giveItem', 'setEntityState'],
        )
        assert.equal(leaf(acquisition[0]).asset, 'sound.pal.078')
        assert.equal(leaf(acquisition[2]).itemId, '99')
        assert.equal(leaf(acquisition[3]).state, 0)
        assert.deepEqual(leaf(acquisition[3]).target, { scene: 's001', entity: 'e4' })
      }
      const grant = acquisition.find((event) =>
        game ? event.occurrence.command.op === 'giveItem' : leaf(event).kind === 'giveItem',
      )
      const painted = actual.causes.filter(
        (event) =>
          start.order < event.order &&
          event.order < grant.order &&
          event.phase === 'dialogue-presentation' &&
          event.slots?.some(({ visibleText }) => visibleText === original[2].text),
      )
      assert(painted.length > 0, 'hidden herb prompt did not reach actual pixels before reward')
      report.acquisition = {
        before,
        after,
        commandOrders: acquisition.map(({ order }) => order),
        painted: painted.map(({ order }) => order),
        repeat: await repeat('hidden-herb-repeat'),
      }
      phase = 'save'
      let savedBytes, savedPayload
      if (game) {
        const previous = await page.evaluate(() => window.__readErrandStatus())
        await press('F5', 'save the native collected bedroom state')
        await until(
          () => page.evaluate(() => window.__readErrandStatus()),
          (state) => state.saveCompletions === previous.saveCompletions + 1,
          'native F5 completed',
        )
        savedBytes = await page.evaluate(async () => {
          const { Save } = await import('/src/core/save/api.ts')
          const { serializeSave } = await import('/src/tools/save-io.ts')
          return serializeSave(await Save.loadSlot(1))
        })
        savedPayload = JSON.parse(savedBytes)
        const trace = await readLongEvidenceArchive(page)
        const captured = trace.saveCaptures.at(-1),
          completed = trace.saveCompletions.at(-1)
        assert.equal(completed.captureSeq, captured.seq)
        assert(completed.order > captured.order)
        assertBoatGameSaveCapture(savedPayload, captured.payload)
        report.save = { captureOrder: captured.order, acknowledgementOrder: completed.order }
      } else {
        savedBytes = JSON.stringify(await page.evaluate(() => window.__tpE2e.dumpSave()))
        savedPayload = JSON.parse(savedBytes)
      }
      await writeFile(resolve(out, 'collected-room.save.json'), savedBytes, { flag: 'wx' })
      report.checkpoint = {
        path: 'collected-room.save.json',
        sha256: sha256(savedBytes),
        byteLength: Buffer.byteLength(savedBytes),
      }
      await archive('hidden-herb-collected')
      await restore(savedBytes, savedPayload, 'room-collected-fresh-restore')
      assert.deepEqual(kitchenGrid((await snapshot()).position, engine), [57, -22])
      assert.equal((await snapshot()).facing, 'left')
      assert.deepEqual(await itemState(), after)
      report.freshRepeat = await repeat('hidden-herb-fresh-repeat')
      await archive('hidden-herb-fresh')
      assert.deepEqual(
        await hashRepositoryFiles(repoRoot, Object.keys(report.hashes)),
        report.hashes,
      )
      assert.equal(sha256(await readFile(reportPath)), sha256(predecessorBytes))
      await readEvidenceArtifact(dirname(reportPath), predecessorReport.checkpoint)
      report.sourceHashesStable = true
    } catch (error) {
      if (page && !page.isClosed())
        await archive('hidden-herb-failed').catch((captureError) => {
          report.errors.push({ capture: String(captureError) })
        })
      throw error
    }
  },
})
