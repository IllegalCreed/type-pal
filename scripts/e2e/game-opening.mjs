import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { assertActorRecording } from './actor-recording-contract.mjs'
import { repoRoot as root, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { readGame, readWorld } from './game-observer.mjs'
import { pressRecordedKey } from './input-ledger.mjs'
import { npcStoryBoundary } from './npc-story-scope.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertOpeningMatrix, readOpeningContract } from './opening-matrix.mjs'
import { openingCausalObserverScript } from './opening-matrix-observer.mjs'
import {
  appendBounded,
  assertOpeningEvidence,
  isControllableRoom,
  LIMITS,
  stateKey,
  storyAction,
} from './opening-policy.mjs'
import { openingTiming } from './opening-timing.mjs'
import { installOpeningTrace } from './opening-trace.mjs'
import { producerExtraInputs } from './producer-inputs.mjs'

const openingContract = await readOpeningContract(root)
const worldSummary = (world) => ({
  sha256: sha256(JSON.stringify(world)),
  scene: world.scene,
  party: world.party,
  members: world.members,
  cash: world.cash,
  inventory: world.inventory,
  levels: world.roles.rgwLevel,
  hp: world.roles.rgwHP,
  persistentActors: world.actors.length,
})

await runBrowserJourney({
  name: 'game-001',
  packageName: '@type-pal/game',
  environment: { E2E: '1' },
  traceConfig: 'scripts/e2e/game-trace.config.mts',
  viewport: { width: 1100, height: 760 },
  journeyTimeoutMs: LIMITS.timeoutMs,
  sources: [
    ...producerExtraInputs('001', 'game'),
    ...Object.keys(openingContract.hashes),
    'scripts/e2e/game-opening.mjs',
    'scripts/e2e/input-ledger.mjs',
    'scripts/e2e/evidence-recorder.mjs',
    'scripts/e2e/actor-recording-contract.mjs',
    'scripts/e2e/npc-story-scope.mjs',
    'scripts/e2e/game-observer.mjs',
    'scripts/e2e/opening-policy.mjs',
    'scripts/e2e/opening-trace.mjs',
    'scripts/e2e/opening-trace-plugin.mjs',
    'scripts/e2e/opening-causal-instrumentation.mjs',
    'scripts/e2e/script-causal-observer.mjs',
    'packages/game/src/core/mode.ts',
    'scripts/e2e/scene-lifecycle-trace.mjs',
    'packages/game/src/shell/bootstrap.ts',
    'scripts/e2e/opening-timing.mjs',
    'scripts/e2e/opening-matrix-observer.mjs',
    'scripts/e2e/opening-matrix.mjs',
    'scripts/e2e/opening-hold-intent.mjs',
    'scripts/e2e/script-terminal-intent.mjs',
    'scripts/e2e/opening-terminal-motion.mjs',
    'scripts/e2e/npc-transition-contract.mjs',
    'scripts/e2e/opening-frame.mjs',
    'scripts/e2e/game-trace.config.mts',
    'packages/game/src/core/event-system.ts',
    'packages/game/src/present/present.ts',
    'pnpm-lock.yaml',
    'data/extracted/data/scene/0.json',
    'data/extracted/data/scene/1.json',
    'data/extracted/videos/3.mp4',
  ],
  initScripts: [installOpeningTrace, openingCausalObserverScript()],
  journey: async ({ newPage, baseURL, out, report, until, health: checkHealth, capture }) => {
    let page
    Object.assign(report, {
      fragment: '001',
      engine: 'phase1-game',
      assets: {},
      scope: capture.enabled
        ? '001 local capture: natural story video, readable rendered dialogue and real control return; no save/restore'
        : '001 verify: rendered dialogue, participating actors, real input and genuine checkpoint restore',
      pending: ['002 and subsequent fragments', 'capture-ready video/audio verification'],
    })
    for (const name of [
      'data/extracted/data/scene/0.json',
      'data/extracted/data/scene/1.json',
      'data/extracted/videos/3.mp4',
    ]) {
      report.assets[name] = sha256(await readFile(resolve(root, name)))
    }
    async function snapshot() {
      const s = await page.evaluate(readGame)
      const key = stateKey(s)
      if (report.events.at(-1)?.key !== key)
        appendBounded(report.events, { atMs: Date.now(), key, state: s })
      return s
    }
    async function press(key, reason, frameDriven = true, scope = 'story') {
      const before = await page.evaluate(readGame)
      console.log(`[001] ${key}: ${reason}`)
      await pressRecordedKey({
        keyboard: page.keyboard,
        action: { key, reason, scene: before.scene, frame: before.frame, scope },
        record: (input) => appendBounded(report.actions, input, LIMITS.actions),
      })
      if (frameDriven) {
        await until(
          () => page.evaluate(readGame),
          (s) => s.frame > before.frame,
          `input frame consumed: ${key}`,
          10_000,
        )
      }
    }
    async function newContext(label) {
      page = await newPage(label)
      await page.goto(baseURL, { waitUntil: 'domcontentloaded' })
      report.contexts.at(-1).initialURL = page.url()
      await until(
        async () => {
          const optOut = page.getByRole('button', { name: '拒绝', exact: true })
          if (await optOut.isVisible()) await optOut.click()
          const enter = page.locator('#boot-loading-enter-btn')
          if (await enter.isVisible()) await enter.click()
          const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
          if (await start.isVisible()) await start.click()
          const s = await snapshot()
          if (s.video) {
            assert(
              ['/extracted/videos/1.mp4', '/extracted/videos/2.mp4'].includes(s.video.path),
              'unexpected prelude',
            )
            await press(
              'Enter',
              `skip title prelude ${s.video.path} (outside fragment 001)`,
              false,
              'boundary',
            )
            await until(
              () => page.evaluate(readGame),
              (next) => next.video?.path !== s.video.path,
              'prelude removed',
            )
            return null
          }
          return s.ready && s.menu?.kind === 'opening' ? s : null
        },
        Boolean,
        `${label}: normal opening menu`,
        60_000,
      )
      const count = await page.evaluate(async () => {
        const { Save } = await import('/src/core/save/api.ts')
        return (await Save.listSlots()).length
      })
      assert.equal(count, 0, 'new browser context must not inherit any save slots')
      report.contexts.at(-1).initialSlots = count
    }

    await newContext('new-story')
    assert.equal((await snapshot()).menu.cursor, 0, 'new story must be selected')
    if (capture.enabled)
      await capture.arm(
        page,
        { event: 'new-story-selected', state: await snapshot() },
        '/extracted/videos/3.mp4',
      )
    report.storyScope = {
      start: npcStoryBoundary(await page.evaluate(() => window.__readOpeningMatrix())),
    }
    await press('Enter', '新的故事')
    await until(
      () => snapshot(),
      (s) => s.video?.path === '/extracted/videos/3.mp4',
      'native story video 3 begins',
    )
    await until(
      async () => {
        const start = page.getByText('点击屏幕开始 / Click to start', { exact: true })
        if (await start.isVisible()) await start.click()
        return page.evaluate(() => window.__openingVideoEvidence())
      },
      (v) => v.events.some((e) => e.kind === 'ended' && e.path.endsWith('/3.mp4')),
      'video 3 natural end',
      50_000,
    )
    console.log('[001] video 3 ended naturally; following actual dialogue wait states')
    let final
    report.milestones = {}
    for (;;) {
      checkHealth()
      const s = await snapshot()
      const action = storyAction(s)
      if (action === 'confirm')
        for (const [id, needle] of [
          ['awake', '敢说老娘是什么鬼婆'],
          ['aunt-at-door', '一大早就有客人上门啦'],
          ['secret-passage', '这次就从这里溜出去吧'],
        ])
          if (!report.milestones[id] && s.dialog.text?.includes(needle)) {
            await page.screenshot({ path: resolve(out, `001-${id}.png`) })
            report.milestones[id] = { scene: s.scene, text: s.dialog.text }
          }
      if (action === 'finish') {
        final = s
        break
      }
      if (action === 'confirm') {
        const text = capture.enabled
          ? await page.evaluate(() =>
              window.__readOpeningMatrix().pages.at(-1)?.page.lines.join('\n'),
            )
          : s.dialog.text
        if (
          !(await capture.readable(text, JSON.stringify(s.dialog), async () =>
            JSON.stringify((await snapshot()).dialog),
          ))
        )
          continue
        await press('Enter', `dialogue ${s.dialog.phase}: ${s.dialog.text ?? ''}`)
      }
      const key = stateKey(s)
      await until(
        () => snapshot(),
        (next) => stateKey(next) !== key,
        'story state transition',
      )
    }
    const videoEvidence = await page.evaluate(() => window.__openingVideoEvidence())
    assert(!videoEvidence.overflow, 'video observation overflow')
    assert(!videoEvidence.events.some((e) => e.kind === 'error'), 'video decoding error')
    const lines = await page.evaluate(() => window.__tpgs.dialogHistory)
    report.videos = videoEvidence.events
    report.dialogueHistory = lines
    assertOpeningEvidence({ videos: videoEvidence.events, lines, final })
    assert.equal(Object.keys(report.milestones).length, 3, 'missing visual milestone')
    report.npcTrace = await page.evaluate(() => window.__readOpeningTrace())
    report.matrix = await page.evaluate(() => window.__readOpeningMatrix())
    report.actorRecording = assertActorRecording(report.matrix, 'game')
    report.storyScope.end = npcStoryBoundary(report.matrix)
    await writeFile(resolve(out, 'matrix.json'), JSON.stringify(report.matrix, null, 2))
    assert.deepEqual(
      (await readOpeningContract(root)).hashes,
      openingContract.hashes,
      'content changed during 001',
    )
    report.matrixVerdict = assertOpeningMatrix(report.matrix, 'game', openingContract)
    await writeFile(resolve(out, 'npc-trace.json'), `${JSON.stringify(report.npcTrace, null, 2)}\n`)
    report.timing = openingTiming(report.npcTrace, 'game')
    if (capture.enabled) {
      assert.equal(report.timing.status, 'passed', '001 semantic timing failed')
      report.endWorld = worldSummary(await page.evaluate(readWorld))
      report.endFrame = await waitForOpeningFrame(page, until)
      await capture.finish(page, {
        event: 'room-control-returned',
        frame: report.endFrame,
        world: report.endWorld,
      })
      report.pending = ['002 and subsequent fragments; full-series capture readiness']
    } else {
      await press('Escape', 'prove normal control: open actual in-game menu', true, 'boundary')
      await until(
        () => snapshot(),
        (s) => !!s.menu && s.menu.kind !== 'opening',
        'in-game menu opens',
      )
      await press('Escape', 'close actual in-game menu', true, 'boundary')
      await until(() => snapshot(), isControllableRoom, 'control restored')
      report.endWorld = worldSummary(await page.evaluate(readWorld))
      report.endFrame = await waitForOpeningFrame(page, until)
      await page.screenshot({ path: resolve(out, '001-end.png') })
      await press('F5', 'formal quick-save slot 1', true, 'boundary')
      const checkpoint = await until(
        () =>
          page.evaluate(async () => {
            const { Save } = await import('/src/core/save/api.ts')
            const { serializeSave } = await import('/src/tools/save-io.ts')
            const gs = await Save.loadSlot(1)
            return gs ? serializeSave(gs) : null
          }),
        Boolean,
        'formal quick-save committed',
      )
      await writeFile(resolve(out, '001.end.save.json'), checkpoint)
      report.checkpoint = {
        path: '001.end.save.json',
        sha256: sha256(checkpoint),
        source: 'this run / F5 / Save.loadSlot(1) / serializeSave',
      }

      // A second isolated origin storage, not the first page's in-memory world or old slot.
      await newContext('checkpoint-restore')
      const staged = await page.evaluate(async (text) => {
        const { Save } = await import('/src/core/save/api.ts')
        const { parseImportedSave, serializeSave } = await import('/src/tools/save-io.ts')
        await Save.saveSlot(1, parseImportedSave(text)) // same import operations as the production tools panel
        return serializeSave(await Save.loadSlot(1))
      }, checkpoint)
      assert.equal(sha256(staged), report.checkpoint.sha256, 'staged checkpoint bytes changed')
      await press('ArrowDown', 'select 旧的回忆', true, 'boundary')
      await until(
        () => snapshot(),
        (s) => s.menu?.kind === 'opening' && s.menu.cursor === 1,
        'load selected',
      )
      await press('Enter', 'open formal load-slot menu', true, 'boundary')
      await until(
        () => snapshot(),
        (s) => s.menu?.kind === 'save-slot',
        'load slot menu',
      )
      assert.equal((await snapshot()).menu.cursor, 0, 'slot 1 must be selected')
      await press('Enter', 'load real slot 1 through production restore', true, 'boundary')
      await until(() => snapshot(), isControllableRoom, 'checkpoint restored to controllable room')
      report.restoredWorld = worldSummary(await page.evaluate(readWorld))
      assert.deepEqual(report.restoredWorld, report.endWorld, 'formal restore world differs')
      await press('Escape', 'verify restored input control', true, 'boundary')
      await until(
        () => snapshot(),
        (s) => !!s.menu && s.menu.kind !== 'opening',
        'restored menu opens',
      )
      await press('Escape', 'return to restored room', true, 'boundary')
      await until(() => snapshot(), isControllableRoom, 'restored menu closes')
      report.restoredFrame = await waitForOpeningFrame(page, until, report.endFrame)
      await page.screenshot({ path: resolve(out, '001-restored.png') })
    }
    assert.equal(
      report.timing.status,
      'passed',
      '001 dialogue/movement ordering differs; inspect npc-trace.json',
    )
  },
})
