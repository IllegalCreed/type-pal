import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
import { continuousScene } from './continuous-route.mjs'
import {
  readCheckpointInput,
  readEvidenceArtifact,
  writeEvidenceArtifact,
} from './evidence-artifact.mjs'
import { guardedEvidenceReader } from './evidence-diagnostics.mjs'
import { evidenceObserverScript } from './evidence-recorder.mjs'
import {
  assertFairyPoolGameTrace,
  FAIRY_POOL_GAME_TRACE_TARGETS,
} from './fairy-island-pool-game-observer.mjs'
import { executeFixedRoute } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import {
  assertWaterMoonPalaceGameTrace,
  installWaterMoonPalaceGameObserver,
} from './water-moon-palace-game-observer.mjs'
import { assertWaterMoonPalaceGameStory } from './water-moon-palace-game-oracle.mjs'
import { waterMoonPalaceRoutes } from './water-moon-palace-route.mjs'

const { values: options } = parseArgs({
  options: {
    from: { type: 'string' },
    verify: { type: 'boolean' },
    headless: { type: 'boolean' },
    headed: { type: 'boolean' },
    'visual-review': { type: 'boolean' },
  },
})
assert(
  options.from && isAbsolute(options.from),
  '010 Game requires --from an absolute 009 report path',
)
assert(!(options.headed && options.headless), 'choose one browser mode')

const routes = waterMoonPalaceRoutes('game')
const start = routes.exterior.steps[0]
const finish = routes.linger.completion
const visualReview = !!options['visual-review']
const samePosition = (actual, expected) => actual[0] === expected[0] && actual[1] === expected[1]
const at = (state, scene, position) =>
  !!state && continuousScene(state, 'game') === scene && samePosition(state.position, position)
const payloadPosition = ({ gs }) => [gs.party.x, gs.party.y]
const actor = (payload, id) => payload.gs.allEventObjects.find((npc) => npc.id === id)
const dialogueWaiting = (dialog) => ['waiting-page-key', 'waiting-end-key'].includes(dialog?.phase)

const predecessorRef = {
  report: options.from,
  sha256: JSON.parse(await readFile(options.from, 'utf8')).checkpoint?.sha256,
}
const { payload: predecessor, artifacts } = await readCheckpointInput(predecessorRef, 'game', '009')
const [predecessorReport, predecessorSave] = artifacts
const previous = predecessorReport.value
assert.equal(previous.kind, 'verify')
assert.equal(previous.profile, 'verify')
assert.equal(previous.case, 'story')
assert.equal(previous.checkpoint.path, '009.end.save.json')
assert.equal(previous.checks.terminalSave, 'passed')
assert.equal(previous.checks.terminalRestore, 'passed')
assert.equal(previous.persistence.freshContext, true)
assert.equal(previous.contextTraces.length, 2)
assert.equal(predecessor.gs.wNumScene, 17)
assert.deepEqual(payloadPosition(predecessor), start.from)
assert.equal(predecessor.gs.party.facing, 'up')
assert.equal(actor(predecessor, 221).sState, 0)
const [previousStory, previousRestored] = await Promise.all(
  previous.contextTraces.map(async (reference) => {
    const artifact = await readEvidenceArtifact(dirname(options.from), reference)
    assert.equal(artifact.binding.status, 'verified', '009 native trace lacks its byte binding')
    assertFairyPoolGameTrace(artifact.value)
    return artifact.value
  }),
)
assertSaveReceipt(previousStory, previous.checkpoint.captureProof, predecessor)
assert.equal(previousRestored.gameRestores.length, 1)
assert.equal(previousRestored.gameRestores[0].source, 'commit:loadGameFromSlot')
assertBoatGameRestore(predecessor, previousRestored.gameRestores[0].payload)
const inputBytes = await readFile(predecessorSave.path)
assert.equal(sha256(inputBytes), predecessorSave.sha256)

function assertSaveReceipt(trace, proof, payload) {
  const capture = trace.saveCaptures.at(-1)
  const ack = trace.saveCompletions.at(-1)
  assert.equal(capture.order, proof.inputOrder)
  assert.equal(ack.order, proof.acknowledgementOrder)
  assert.equal(capture.slot, 1)
  assert.equal(capture.source, 'before:Save.saveSlot:deepClone')
  assert.equal(ack.source, 'commit:Save.saveSlot')
  assert.equal(ack.captureSeq, capture.seq)
  assert(capture.order < ack.order)
  assertBoatGameSaveCapture(payload, capture.payload)
}

function verifyRestore(trace, payload) {
  assertWaterMoonPalaceGameTrace(trace)
  assert.equal(trace.gameRestores.length, 1, 'exactly one Game slot restore expected')
  assert.equal(trace.saveCaptures.length, 1, 'empty context must stage one slot')
  assert.equal(trace.saveCompletions.length, 1, 'empty context must stage one slot')
  const [commit] = trace.gameRestores
  const [capture] = trace.saveCaptures
  const [ack] = trace.saveCompletions
  assertSaveReceipt(trace, { inputOrder: capture.order, acknowledgementOrder: ack.order }, payload)
  assert(ack.order < commit.order, 'staging must finish before restore')
  assert.equal(commit.source, 'commit:loadGameFromSlot')
  return {
    source: commit.source,
    order: commit.order,
    completeGameDomain: assertBoatGameRestore(payload, commit.payload),
  }
}

await runBrowserJourney({
  name: visualReview ? 'game-010-visual-review' : 'game-010',
  packageName: '@type-pal/game',
  environment: { E2E: '1' },
  traceConfig: 'scripts/e2e/fairy-island-pool-game.config.mts',
  arguments: [options.headed ? '--headed' : '--headless'],
  browserArgs: ['--mute-audio'],
  journeyTimeoutMs: 360_000,
  initScripts: [
    installCommittedRoutePlayback,
    evidenceObserverScript(installWaterMoonPalaceGameObserver),
  ],
  sources: [
    ...FAIRY_POOL_GAME_TRACE_TARGETS,
    'data/extracted/data/event-objects.json',
    ...[16, 19, 20].map((id) => `data/extracted/data/scene/${id}.json`),
    'data/extracted/data/items.json',
    'data/extracted/lookup/strings.json',
    'data/extracted/lookup/words.json',
    ...[119, 8, 9].map((id) => `data/extracted/data/tilemap/${id}.json`),
    'data/extracted/events/all.json',
    ...['016', '019', '020'].map((id) => `data/extracted/events/scene-${id}.json`),
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '010',
      engine: 'game',
      kind: 'verify',
      case: 'story',
      predecessor: { ...predecessorRef, reportSha256: predecessorReport.sha256 },
      route: { status: 'running', inputs: [], legs: [] },
      checks: {},
      secondaryDiagnostics: [],
    })
    let page
    let phase = 'restore'
    const snapshot = () => page.evaluate(() => window.__waterMoonGameRead())
    const evidence = () => page.evaluate(() => window.__waterMoonGameRouteEvidence())
    const saveStatus = () => page.evaluate(() => window.__waterMoonGameSaveStatus())
    const archive = guardedEvidenceReader({
      page: () => page,
      read: (currentPage) => currentPage.evaluate(() => window.__waterMoonGameArchive()),
      diagnostics: report.secondaryDiagnostics,
    })
    const press = (key, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, key, reason }),
        record: (action) => report.actions.push(action),
      })
    const restore = async (bytes, target, label, visualReviewVideo = false) => {
      phase = 'restore'
      page = await newPage(label, { visualReviewVideo })
      await page.goto(baseURL)
      await until(
        async () => {
          const reject = page.getByRole('button', { name: '拒绝', exact: true })
          if (await reject.isVisible()) await reject.click()
          const enter = page.locator('#boot-loading-enter-btn')
          if (await enter.isVisible()) await enter.click()
          const startHint = page.getByText('点击屏幕开始 / Click to start', { exact: true })
          if (await startHint.isVisible()) await startHint.click()
          const video = await page.evaluate(() => document.querySelector('video')?.currentSrc)
          if (video) {
            await press('Enter', 'close title prelude')
            await until(
              () => page.evaluate(() => document.querySelector('video')?.currentSrc),
              (next) => next !== video,
              'title prelude closed',
            )
            return false
          }
          return (await snapshot())?.menu?.kind === 'opening'
        },
        Boolean,
        'opening menu',
        60_000,
      )
      const staged = await page.evaluate(async (text) => {
        const { Save } = await import('/src/core/save/api.ts')
        const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
        if ((await Save.listSlots()).length) throw new Error('010 restore inherited a Game slot')
        await Save.saveSlot(1, parseImportedSave(text))
        return serializeSave(await Save.loadSlot(1))
      }, bytes.toString('utf8'))
      assert.equal(sha256(staged), sha256(bytes), '010 staging altered checkpoint bytes')
      await press('ArrowDown', '旧的回忆')
      await until(
        snapshot,
        (s) => s?.menu?.kind === 'opening' && s.menu.cursor === 1,
        'load option',
      )
      await press('Enter', 'open slots')
      await until(snapshot, (s) => s?.menu?.kind === 'save-slot' && s.menu.cursor === 0, 'slot one')
      await press('Enter', 'restore formal slot 1')
      await until(
        snapshot,
        (s) => s?.ready && at(s, target.scene, target.position),
        'control returned at the formal checkpoint',
      )
      const trace = await archive.read()
      assert(
        trace.events.some(
          (mark) =>
            mark.kind === 'ready' &&
            mark.scene === target.scene &&
            samePosition(mark.position, target.position),
        ),
        'native ready record missing after restore',
      )
      return verifyRestore(trace, JSON.parse(bytes))
    }

    const settle = async (owner, finished) => {
      let lastPage
      for (;;) {
        const state = await until(
          snapshot,
          (s) =>
            finished(s) || (dialogueWaiting(s?.dialog) && JSON.stringify(s.dialog) !== lastPage),
          `e${owner} dialogue or control return`,
        )
        if (finished(state)) return state
        assert.equal(state.cursor?.owner, owner)
        lastPage = JSON.stringify(state.dialog)
        if (visualReview) await delay(700)
        await press('Enter', 'confirm actual native dialogue')
      }
    }
    const walk = async (plan, owner) => {
      const { scene, position } = plan.completion
      phase = plan.id
      const result = await executeFixedRoute({
        page,
        engine: 'game',
        plan,
        scene: plan.steps[0].scene,
        id: plan.id,
        phase,
        report,
        snapshot,
        evidence,
        ready: (s) => s.ready,
        finished: (s) =>
          at(s, scene, position) &&
          (owner === undefined ? s.ready : s.dialog && s.cursor?.owner === owner),
        health,
      })
      console.log(`[game-010] ${plan.id}`)
      return result
    }
    const search = async (owner, reason, target) => {
      await press('Enter', reason)
      await until(snapshot, (s) => s?.cursor?.owner === owner, `native search starts e${owner}`)
      return settle(owner, (s) => s?.ready && at(s, target.scene, target.position))
    }

    try {
      const routePageStartedAt = Date.now()
      report.checks.predecessorRestore = await restore(
        inputBytes,
        { scene: start.scene, position: start.from },
        '010-from-009',
        visualReview,
      )
      await walk(routes.exterior)
      await walk(routes.guide, 270)
      phase = 'exterior-guide'
      await settle(
        270,
        (s) =>
          s?.ready &&
          at(s, routes.guide.completion.scene, routes.guide.completion.position) &&
          s.objects[270].state === 0,
      )
      await walk(routes.interior)
      await walk(routes.chest)
      phase = 'search-miao-saber-chest'
      for (let attempt = 1; attempt <= 4; attempt++) {
        await search(363, `search the same chest, attempt ${attempt}`, routes.chest.completion)
      }
      console.log('[game-010] finished four searches of the chest')
      await walk(routes.water)
      phase = 'drink-bath-water'
      await search(362, 'drink the bath water', routes.water.completion)
      await walk(routes.linger, 342)
      phase = 'receive-purple-gold-pellet'
      const end = await settle(
        342,
        (s) => s?.ready && at(s, finish.scene, finish.position) && s.objects[348].state === 2,
      )
      assert.equal(end.facing, 'left')
      report.endWorld = {
        scene: finish.scene,
        position: end.position,
        facing: end.facing,
        controlReturned: true,
      }
      console.log('[game-010] 紫金丹 story returned free control')
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '010-palace-ready.png') })

      phase = 'end-save'
      assert.deepEqual(await saveStatus(), { captures: 1, completions: 1 })
      await press('F5', 'formal Game 010 terminal save')
      await until(
        saveStatus,
        ({ completions }) => completions === 2,
        'native terminal slot save acknowledged',
      )
      const bytes = Buffer.from(
        await page.evaluate(async () => {
          const { Save } = await import('/src/core/save/api.ts')
          const { serializeSave } = await import('/src/tools/save-io.ts')
          return serializeSave(await Save.loadSlot(1))
        }),
      )
      const trace = await archive.read()
      report.contextTraces = [await writeEvidenceArtifact(out, '010-trace.json', trace)]
      assertWaterMoonPalaceGameTrace(trace)
      assert.equal(trace.saveCaptures.length, 2)
      assert.equal(trace.saveCompletions.length, 2)
      const captureProof = {
        inputOrder: trace.saveCaptures[1].order,
        acknowledgementOrder: trace.saveCompletions[1].order,
      }
      const payload = JSON.parse(bytes)
      assertSaveReceipt(trace, captureProof, payload)
      assert.equal(payload.gs.wNumScene, 21)
      assert.deepEqual(payloadPosition(payload), finish.position)
      assert.equal(payload.gs.party.facing, end.facing)
      assert.deepEqual(payload.gs.inventory, [
        ...predecessor.gs.inventory,
        { itemId: 61, count: 3 },
        { itemId: 179, count: 1 },
        { itemId: 273, count: 1 },
      ])
      assert.equal(actor(payload, 342).triggerMode, 2)
      assert.equal(actor(payload, 348).sState, 2)
      assert.equal(actor(payload, 363).scriptedFrame, 1)
      const story = assertWaterMoonPalaceGameStory(trace)
      report.storyProof = story
      const timeOrigin = await page.evaluate(() => performance.timeOrigin)
      report.visualReviewMarks = [
        ['start-ready', story.start],
        ['palace-exterior-ready', story.exterior],
        ['guide-start', story.guide.start],
        ['guide-ready', story.guide.end],
        ['palace-interior-ready', story.interior],
        ...story.chest.visits.map((visit, index) => [`chest-${index + 1}`, visit.start]),
        ['water-start', story.water.start],
        ['water-ready', story.water.end],
        ['pellet-start', story.pellet.start],
        ['palace-ready', story.pellet.end],
      ].map(([name, event]) => ({
        name,
        elapsedMs: Math.round(timeOrigin + event.atMs - routePageStartedAt),
      }))
      await writeFile(resolve(out, '010.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '010.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
        captureProof,
      }
      report.checks.terminalSave = 'passed'
      await page.close()

      const persistence = await restore(bytes, finish, '010-fresh-palace-restore')
      const fresh = await archive.read()
      report.contextTraces.push(await writeEvidenceArtifact(out, '010-fresh-trace.json', fresh))
      assert(!fresh.inputs.some(({ key }) => key === 'F5'))
      assert(!fresh.events.some(({ kind, before }) => kind === 'actor' && before))
      assert(
        !fresh.events.some(
          ({ kind, cursor }) => kind === 'cursor' && [342, 348].includes(cursor?.owner),
        ),
      )
      assert.equal((await snapshot()).facing, end.facing)
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '010-palace-restored.png') })
      report.checks.terminalRestore = 'passed'
      report.persistence = { ...persistence, freshContext: true }
      report.route.status = 'passed'
    } catch (error) {
      report.failedPhase = phase
      if (phase === 'end-save' && report.contextTraces?.[0]) {
        report.rejectedTrace = report.contextTraces[0]
      } else {
        await archive.diagnose(async () => {
          report.rejectedTrace = await writeEvidenceArtifact(
            out,
            '010-rejected-trace.json',
            await archive.read(),
          )
        })
      }
      throw error
    }
  },
})
