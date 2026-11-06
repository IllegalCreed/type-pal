import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { parseArgs } from 'node:util'
import { assertBoatGameRestore, assertBoatGameSaveCapture } from './boat-game-save-domain.mjs'
import { runBrowserJourney, sha256 } from './browser-journey.mjs'
import { installCommittedRoutePlayback } from './committed-route.mjs'
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
  installFairyPoolGameObserver,
} from './fairy-island-pool-game-observer.mjs'
import { assertFairyPoolGameStory } from './fairy-island-pool-game-oracle.mjs'
import { executeFixedRoute, fixedRoutePlan } from './fixed-route-plan.mjs'
import { canonicalInput, pressRecordedKey } from './input-ledger.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'

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
  '009 Game requires --from an absolute 008 report path',
)
assert(!(options.headed && options.headless), 'choose one browser mode')

const scene = 's016'
const sceneNumber = 17
const start = [304, 824]
const herbApproach = [880, 264]
const poolApproach = [1104, 1416]
const firstPoolEnd = [672, 1216]
const secondPoolStart = [1072, 1416]
const poolEnd = [1056, 1296]
const lingErExit = [1952, 992]
const herb = 99
const samePosition = (a, b) => a[0] === b[0] && a[1] === b[1]
const herbCount = (state) => state.inventory.find(({ itemId }) => itemId === herb)?.count ?? 0
const at = (state, position) =>
  !!state?.ready && state.scene === sceneNumber && samePosition(state.position, position)
const dialogueWaiting = (dialog) => ['waiting-page-key', 'waiting-end-key'].includes(dialog?.phase)
const payloadPosition = ({ gs }) => [gs.party.x, gs.party.y]
const actor = (state, id) => state.allEventObjects.find((npc) => npc.id === id)

const predecessorRef = {
  report: options.from,
  sha256: JSON.parse(await readFile(options.from, 'utf8')).checkpoint?.sha256,
}
const { payload: predecessor, artifacts } = await readCheckpointInput(predecessorRef, 'game', '008')
const [predecessorReport, predecessorSave] = artifacts
const previous = predecessorReport.value
assert.equal(previous.kind, 'verify')
assert.equal(previous.case, 'story')
assert.equal(previous.checkpoint.path, '008.end.save.json')
assert.equal(previous.checks.terminalSave, 'passed')
assert.equal(previous.checks.terminalRestore, 'passed')
assert.equal(previous.persistence.freshContext, true)
assert.equal(previous.contextTraces.length, 2)
assert.equal(predecessor.gs.wNumScene, sceneNumber)
assert.deepEqual(payloadPosition(predecessor), start)
assert.equal(herbCount(predecessor.gs), 0)
assert.equal(actor(predecessor.gs, 233).sState, 1)
const [previousStory, previousRestored] = await Promise.all(
  previous.contextTraces.map(async (reference) => {
    const artifact = await readEvidenceArtifact(dirname(options.from), reference)
    assert.equal(artifact.binding.status, 'verified', '008 native trace lacks its byte binding')
    assertFairyPoolGameTrace(artifact.value)
    return artifact.value
  }),
)
const previousCapture = previousStory.saveCaptures.at(-1)
const previousAck = previousStory.saveCompletions.at(-1)
assert.equal(previousCapture.order, previous.checkpoint.captureProof.inputOrder)
assert.equal(previousAck.order, previous.checkpoint.captureProof.acknowledgementOrder)
assert.equal(previousCapture.slot, 1)
assert.equal(previousCapture.source, 'before:Save.saveSlot:deepClone')
assert.equal(previousAck.source, 'commit:Save.saveSlot')
assert.equal(previousAck.captureSeq, previousCapture.seq)
assert(previousCapture.order < previousAck.order)
assertBoatGameSaveCapture(predecessor, previousCapture.payload)
assert.equal(previousRestored.gameRestores.length, 1)
assert.equal(previousRestored.gameRestores[0].source, 'commit:loadGameFromSlot')
assertBoatGameRestore(predecessor, previousRestored.gameRestores[0].payload)
const inputBytes = await readFile(predecessorSave.path)
assert.equal(sha256(inputBytes), predecessorSave.sha256)

const routeToHerb = fixedRoutePlan('game', {
  id: 'peach-grove-arrival-to-herb',
  scene,
  start: [61, 42],
  holds: [
    ['ArrowUp', 52],
    ['ArrowLeft', 7],
    ['ArrowUp', 1],
    ['ArrowLeft', 10],
  ],
  completion: { scene, position: [44, -11], mode: 'ready' },
})
const routeToPool = fixedRoutePlan('game', {
  id: 'herb-to-pool-clothes',
  scene,
  start: [44, -11],
  holds: [
    ['ArrowRight', 10],
    ['ArrowDown', 1],
    ['ArrowRight', 31],
    ['ArrowDown', 9],
    ['ArrowRight', 15],
    ['ArrowDown', 6],
    ['ArrowRight', 1],
    ['ArrowDown', 8],
    ['ArrowRight', 1],
    ['ArrowDown', 9],
    ['ArrowRight', 1],
    ['ArrowDown', 6],
    ['ArrowRight', 1],
    ['ArrowDown', 2],
    ['ArrowRight', 1],
    ['ArrowDown', 1],
    ['ArrowRight', 3],
    ['ArrowDown', 1],
    ['ArrowRight', 1],
    ['ArrowDown', 1],
    ['ArrowRight', 6],
    ['ArrowDown', 7],
    ['ArrowRight', 1],
    ['ArrowDown', 7],
    ['ArrowRight', 3],
    ['ArrowDown', 1],
    ['ArrowRight', 4],
    ['ArrowDown', 6],
  ],
  completion: { scene, position: [123, 54], mode: 'ready' },
})
const routeBackToPool = fixedRoutePlan('game', {
  id: 'return-to-pool-after-first-cutscene',
  scene,
  start: [97, 55],
  holds: [['ArrowRight', 25]],
  completion: { scene, position: [122, 55], mode: 'dialogue' },
})

function verifyRestore(trace, payload) {
  assertFairyPoolGameTrace(trace)
  assert.equal(trace.gameRestores.length, 1, 'exactly one Game slot restore expected')
  assert.equal(trace.saveCaptures.length, 1, 'empty context must stage one slot')
  assert.equal(trace.saveCompletions.length, 1, 'empty context must stage one slot')
  const [commit] = trace.gameRestores
  const [capture] = trace.saveCaptures
  const [ack] = trace.saveCompletions
  assert.equal(capture.slot, 1)
  assert.equal(ack.captureSeq, capture.seq)
  assert(
    capture.order < ack.order && ack.order < commit.order,
    'staging must finish before restore',
  )
  assert.equal(commit.source, 'commit:loadGameFromSlot')
  assertBoatGameSaveCapture(payload, capture.payload)
  return {
    source: commit.source,
    order: commit.order,
    completeGameDomain: assertBoatGameRestore(payload, commit.payload),
  }
}

await runBrowserJourney({
  name: options['visual-review'] ? 'game-009-visual-review' : 'game-009',
  packageName: '@type-pal/game',
  environment: { E2E: '1' },
  traceConfig: 'scripts/e2e/fairy-island-pool-game.config.mts',
  arguments: [options.headed ? '--headed' : '--headless'],
  browserArgs: ['--mute-audio'],
  journeyTimeoutMs: 360_000,
  initScripts: [
    installCommittedRoutePlayback,
    evidenceObserverScript(installFairyPoolGameObserver),
  ],
  sources: [
    ...FAIRY_POOL_GAME_TRACE_TARGETS,
    'data/extracted/data/event-objects.json',
    'data/extracted/data/scene/16.json',
    'data/extracted/data/items.json',
    'data/extracted/lookup/strings.json',
    'data/extracted/lookup/words.json',
    'data/extracted/data/tilemap/119.json',
    'data/extracted/events/all.json',
    'data/extracted/events/scene-016.json',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health }) => {
    Object.assign(report, {
      fragment: '009',
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
    const snapshot = () => page.evaluate(() => window.__fairyPoolGameRead())
    const evidence = () => page.evaluate(() => window.__fairyPoolGameRouteEvidence())
    const saveStatus = () => page.evaluate(() => window.__fairyPoolGameSaveStatus())
    const archive = guardedEvidenceReader({
      page: () => page,
      read: (page) => page.evaluate(() => window.__fairyPoolGameArchive()),
      diagnostics: report.secondaryDiagnostics,
    })
    const press = (key, reason) =>
      pressRecordedKey({
        keyboard: page.keyboard,
        action: canonicalInput({ phase, key, reason }),
        record: (action) => report.actions.push(action),
      })
    const lastReady = () =>
      page.evaluate(() =>
        window.__fairyPoolGameRouteEvidence().events.findLast(({ kind }) => kind === 'ready'),
      )
    const restore = async (bytes, position, label, visualReviewVideo = false) => {
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
        if ((await Save.listSlots()).length) throw new Error('009 restore inherited a Game slot')
        await Save.saveSlot(1, parseImportedSave(text))
        return serializeSave(await Save.loadSlot(1))
      }, bytes.toString('utf8'))
      assert.equal(sha256(staged), sha256(bytes), '009 staging altered checkpoint bytes')
      await press('ArrowDown', '旧的回忆')
      await until(
        snapshot,
        (s) => s?.menu?.kind === 'opening' && s.menu.cursor === 1,
        'load option',
      )
      await press('Enter', 'open slots')
      await until(snapshot, (s) => s?.menu?.kind === 'save-slot' && s.menu.cursor === 0, 'slot one')
      await press('Enter', 'restore formal slot 1')
      await until(snapshot, (s) => at(s, position), 'ready in the peach grove')
      await until(
        lastReady,
        (mark) => mark && samePosition(mark.position, position),
        'native ready record',
      )
      return verifyRestore(await archive.read(), JSON.parse(bytes))
    }

    const settle = async (finished, owner) => {
      const pages = []
      let lastPage
      for (;;) {
        const state = await until(
          snapshot,
          (s) =>
            finished(s) || (dialogueWaiting(s?.dialog) && JSON.stringify(s.dialog) !== lastPage),
          `e${owner} dialogue or story completion`,
        )
        if (finished(state)) return { state, pages }
        assert.equal(state.cursor?.owner, owner)
        pages.push(state.dialog)
        lastPage = JSON.stringify(state.dialog)
        if (options['visual-review']) await delay(700)
        await press('Enter', 'confirm actual native dialogue')
      }
    }

    const walk = (plan, finished) =>
      executeFixedRoute({
        page,
        engine: 'game',
        plan,
        scene,
        id: plan.id,
        phase,
        report,
        snapshot,
        evidence,
        ready: (s) => s.ready,
        finished,
        health,
      })

    try {
      const routePageStartedAt = Date.now()
      report.checks.predecessorRestore = await restore(
        inputBytes,
        start,
        '009-from-008',
        !!options['visual-review'],
      )
      const initial = await snapshot()
      assert.equal(herbCount(initial), 0)
      assert.deepEqual(
        [212, 213, 217, 233].map((id) => initial.objects[id].state),
        [1, 0, 1, 1],
      )
      phase = 'walk-to-herb'
      await walk(routeToHerb, (s) => at(s, herbApproach))
      phase = 'pick-herb'
      await press('Enter', 'search the visible 止血草 sprite')
      const collected = await settle(
        (s) => at(s, herbApproach) && s.objects[233].state === 0 && herbCount(s) === 1,
        233,
      )
      const pickupTrace = await evidence()
      const narration = pickupTrace.events.find(
        ({ kind, cursor, dialog }) =>
          kind === 'dialogue' && cursor?.owner === 233 && dialog?.text === '摘得止血草',
      )
      assert(narration, 'the herb native narration was missing')
      report.herb = { narration, before: initial.objects[233], after: collected.state.objects[233] }
      console.log('[game-009] picked 止血草')
      phase = 'repeat-herb-search'
      await press('Enter', 'search again at the same spot after the herb vanished')
      const repeated = await until(
        snapshot,
        (s) => at(s, herbApproach) && s.tick >= collected.state.tick + 2,
        'repeat search leaves free control after native scene updates',
      )
      assert.equal(herbCount(repeated), 1)
      phase = 'walk-to-pool'
      await walk(routeToPool, (s) => at(s, poolApproach))
      phase = 'pool-clothes-cutscene'
      await press('Enter', 'search the clothes beside the pool')
      const firstPool = await settle(
        (s) => at(s, firstPoolEnd) && s.objects[212].state === 0 && s.objects[213].state === 1,
        212,
      )
      assert.equal(firstPool.state.objects[217].state, 0)
      assert(
        [...firstPool.pages.at(-1).lines, firstPool.pages.at(-1).text].includes('仙女．．．．？'),
        'first pool cutscene did not reach its final line',
      )
      await until(
        lastReady,
        (mark) => mark && samePosition(mark.position, firstPoolEnd),
        'first pool cutscene returned native control',
      )
      report.firstPool = {
        pages: firstPool.pages,
        position: firstPool.state.position,
        facing: firstPool.state.facing,
        objects: firstPool.state.objects,
      }
      console.log('[game-009] first pool cutscene returned control')
      phase = 'return-to-pool'
      const returned = await walk(
        routeBackToPool,
        (s) => s?.dialog && s.cursor?.owner === 213 && samePosition(s.position, secondPoolStart),
      )
      assert.equal(returned.objects[213].state, 0)
      phase = 'pool-lightning-and-plea'
      const secondPool = await settle(
        (s) => at(s, poolEnd) && s.objects[216].state === 0 && s.objects[221].auto >= 5596,
        213,
      )
      await until(
        lastReady,
        (mark) => mark && samePosition(mark.position, poolEnd),
        'second pool cutscene returned native control',
      )
      assert(
        [...secondPool.pages.at(-1).lines, secondPool.pages.at(-1).text].includes(
          '好吧．．．你跟我来～',
        ),
        'second pool cutscene did not reach Zhao Ling’er’s invitation',
      )
      phase = 'wait-for-linger-exit'
      const end = await until(
        snapshot,
        (s) =>
          at(s, poolEnd) &&
          s.objects[221].state === 0 &&
          samePosition(s.objects[221].position, lingErExit),
        'Zhao Ling’er finished her background departure on the same map',
      )
      assert.equal(herbCount(end), 1)
      assert.equal(end.facing, 'up')
      report.secondPool = { pages: secondPool.pages, objects: end.objects }
      report.endWorld = { scene, position: end.position, facing: end.facing, controlReturned: true }
      console.log('[game-009] second pool scene ended and Zhao Ling’er left')
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '009-pool-ready.png') })

      phase = 'end-save'
      assert.deepEqual(await saveStatus(), { captures: 1, completions: 1 })
      await press('F5', 'formal Game 009 terminal save')
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
      report.contextTraces = [await writeEvidenceArtifact(out, '009-trace.json', trace)]
      assertFairyPoolGameTrace(trace)
      const capture = trace.saveCaptures.at(-1)
      const ack = trace.saveCompletions.at(-1)
      assert.equal(capture.slot, 1)
      assert.equal(capture.source, 'before:Save.saveSlot:deepClone')
      assert.equal(ack.source, 'commit:Save.saveSlot')
      assert.equal(ack.captureSeq, capture.seq)
      assert(capture.order < ack.order)
      report.storyProof = assertFairyPoolGameStory(trace, report)
      const payload = JSON.parse(bytes)
      assert.equal(payload.gs.wNumScene, sceneNumber)
      assert.deepEqual(payloadPosition(payload), poolEnd)
      assert.equal(payload.gs.party.facing, end.facing)
      assert.deepEqual(payload.gs.inventory, [
        ...predecessor.gs.inventory,
        { itemId: herb, count: 1 },
      ])
      assert.deepEqual(
        [212, 213, 216, 217, 221, 233].map((id) => actor(payload.gs, id).sState),
        [0, 0, 0, 0, 0, 0],
      )
      assert.deepEqual([actor(payload.gs, 221).x, actor(payload.gs, 221).y], lingErExit)
      assertBoatGameSaveCapture(payload, capture.payload)
      const timeOrigin = await page.evaluate(() => performance.timeOrigin)
      const proof = report.storyProof
      report.visualReviewMarks = [
        ['start-ready', proof.start],
        ['herb-collected', proof.picked],
        ['pool-start', proof.firstPool],
        ['pool-first-ready', proof.firstPoolReady],
        ['pool-second-start', proof.secondPool],
        ['pool-second-ready', proof.secondPoolReady],
        ['pool-ready', proof.departure],
      ].map(([name, event]) => ({
        name,
        elapsedMs: Math.round(timeOrigin + event.atMs - routePageStartedAt),
      }))
      await writeFile(resolve(out, '009.end.save.json'), bytes, { flag: 'wx' })
      report.checkpoint = {
        path: '009.end.save.json',
        sha256: sha256(bytes),
        byteLength: bytes.length,
        captureProof: { inputOrder: capture.order, acknowledgementOrder: ack.order },
      }
      report.checks.terminalSave = 'passed'
      await page.close()

      const persistence = await restore(bytes, poolEnd, '009-fresh-pool-restore')
      const fresh = await archive.read()
      assert(!fresh.inputs.some(({ key }) => key === 'F5'))
      assert(!fresh.events.some(({ kind, before }) => kind === 'actor' && before))
      assert.equal((await snapshot()).facing, end.facing)
      await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '009-pool-restored.png') })
      report.contextTraces.push(await writeEvidenceArtifact(out, '009-fresh-trace.json', fresh))
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
            '009-rejected-trace.json',
            await archive.read(),
          )
        })
      }
      throw error
    }
  },
})
