import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { repoRoot, runBrowserJourney, sha256 } from './browser-journey.mjs'
import { waitForOpeningFrame } from './opening-frame.mjs'
import { assertOpeningHandoff, installOpeningHandoffObserver } from './opening-handoff.mjs'
import { assertOpeningMatrix, readOpeningContract } from './opening-matrix.mjs'
import { appendBounded } from './opening-policy.mjs'
import { openingTiming } from './opening-timing.mjs'
import {
  assertReforgeOpening,
  openingSaveView,
  reforgeRoomReady,
  reforgeStateKey,
  reforgeStoryAction,
} from './reforge-opening-policy.mjs'

const manifest = JSON.parse(await readFile(resolve(repoRoot, 'projects/pal/manifest.json'), 'utf8'))
const openingContract = await readOpeningContract(repoRoot)
const catalog = JSON.parse(
  await readFile(resolve(repoRoot, 'projects/pal/assets/index.json'), 'utf8'),
)
const entry = manifest.entryPoints.find((e) => e.id === 'new-game')
assert(entry, 'PAL new-game entry missing')
const videoPath = (id) => `/projects/pal/${catalog.assets[id].path}`
const introPath = videoPath(entry.introVideo)
const preludes = ['video.startupTrademark', 'video.startupSplash'].map((role) =>
  videoPath(manifest.assets.roles[role]),
)

await runBrowserJourney({
  name: 'reforge-001',
  packageName: '@type-pal/reforge',
  environment: { VITE_PROJECT_ID: 'pal' },
  traceConfig: 'scripts/e2e/reforge-trace.config.mts',
  initScripts: [installOpeningHandoffObserver],
  sources: [
    'projects/pal/manifest.json',
    'projects/pal/assets/index.json',
    'projects/pal/content/locale.json',
    'packages/reforge/src/main.ts',
    'packages/reforge/src/dialog/dialog-box.ts',
    'packages/reforge/src/opening-menu.ts',
    'scripts/e2e/reforge-opening.mjs',
    'scripts/e2e/reforge-opening-policy.mjs',
    'scripts/e2e/browser-journey.mjs',
    'scripts/e2e/opening-trace.mjs',
    'scripts/e2e/opening-trace-plugin.mjs',
    'scripts/e2e/opening-timing.mjs',
    'scripts/e2e/opening-matrix-observer.mjs',
    'scripts/e2e/opening-matrix.mjs',
    'scripts/e2e/opening-frame.mjs',
    'scripts/e2e/opening-handoff.mjs',
    'scripts/e2e/reforge-trace.config.mts',
  ],
  journey: async ({ newPage, baseURL, out, report, until, health, capture }) => {
    report.fragment = '001'
    report.engine = 'reforge'
    report.pending = ['002 and subsequent fragments', 'capture-ready video/audio verification']
    let page = await newPage('new-story')
    const snapshot = async () => {
      const state = await page.evaluate(() => {
        const v = document.querySelector('video')
        return {
          boot: window.__tpObserve?.readBoot?.() ?? null,
          runtime: window.__tpObserve?.readRuntime?.() ?? null,
          video: v ? new URL(v.currentSrc || v.src, location.href).pathname : null,
        }
      })
      const key = reforgeStateKey(state)
      if (report.events.at(-1)?.key !== key)
        appendBounded(report.events, { key, atMs: Date.now(), state })
      return state
    }
    const press = async (key, reason) => {
      appendBounded(report.actions, { key, reason }, 240)
      console.log(`[reforge-001] ${key}: ${reason}`)
      await page.keyboard.down(key)
      await page.keyboard.up(key)
    }
    const autoplay = async () => {
      const overlay = page.getByText('点击屏幕开始 / Click to start', { exact: true })
      if (await overlay.isVisible()) await overlay.click()
    }
    await page.goto(`${baseURL}/?menu`)
    await until(
      async () => {
        await autoplay()
        const s = await snapshot()
        if (s.video) {
          assert(preludes.includes(s.video), `unexpected prelude ${s.video}`)
          await press('Enter', `skip title prelude outside 001: ${s.video}`)
          await until(snapshot, (next) => next.video !== s.video, 'prelude closes')
          return null
        }
        return s.boot?.opening ?? null
      },
      Boolean,
      'normal title menu ready',
      60_000,
    )
    assert.deepEqual((await snapshot()).boot.opening, {
      phase: 'menu',
      cursor: 0,
      selectedId: 'new-game',
    })
    await page.screenshot({ path: resolve(out, '001-title.png') })
    await page.evaluate((path) => window.__openingHandoff.arm(path), introPath)
    if (capture.enabled)
      await capture.arm(page, { event: 'new-story-selected', state: await snapshot() }, introPath)
    await press('Enter', '新的故事')
    await until(snapshot, (s) => s.video === introPath, 'native entry video starts')
    const videoEvidence = await until(
      async () => {
        await autoplay()
        return page.evaluate(() => window.__openingVideoEvidence())
      },
      (v) => v.events.some((e) => e.kind === 'ended' && e.path === introPath),
      'entry video natural end',
      50_000,
    )
    assert(!videoEvidence.overflow, 'video evidence overflow')
    assert(!videoEvidence.events.some((e) => e.kind === 'error'), 'video decode failure')
    report.videos = videoEvidence.events
    const handoff = await page.evaluate(() => window.__openingHandoff.read())
    for (const [name, frame] of [
      ['001-title-canvas.png', handoff.title],
      ['001-video-handoff.png', handoff.removals[0]?.frame],
    ])
      if (frame?.png)
        await writeFile(resolve(out, name), Buffer.from(frame.png.split(',')[1], 'base64'))
    report.handoff = {
      title: handoff.title ? { ...handoff.title, png: undefined } : null,
      removals: handoff.removals.map((removal) => ({
        ...removal,
        frame: { ...removal.frame, png: undefined },
      })),
    }
    assertOpeningHandoff(handoff, introPath)
    await until(snapshot, (s) => !!s.runtime, 'runtime initialized', 60_000)
    report.milestones = {}
    for (;;) {
      health()
      const s = await snapshot(),
        action = reforgeStoryAction(s.runtime)
      if (action === 'confirm')
        for (const [id, needle] of [
          ['awake', '敢说老娘是什么鬼婆'],
          ['aunt-at-door', '一大早就有客人上门啦'],
          ['secret-passage', '这次就从这里溜出去吧'],
        ])
          if (
            !report.milestones[id] &&
            s.runtime.dialogue.pageText.replace(/\s/g, '').includes(needle)
          ) {
            await page.screenshot({ path: resolve(out, `001-${id}.png`) })
            report.milestones[id] = {
              scene: s.runtime.sceneId,
              ids: s.runtime.dialogue.pageTextIds,
            }
          }
      if (action === 'finish') break
      if (action === 'confirm') {
        if (
          !(await capture.readable(
            s.runtime.dialogue.pageText,
            JSON.stringify(s.runtime.dialogue),
            async () => JSON.stringify((await snapshot()).runtime?.dialogue),
          ))
        )
          continue
        await press('Enter', `dialogue ${s.runtime.dialogue.rowTextIds.join(',')}`)
      }
      const key = reforgeStateKey(s)
      await until(snapshot, (next) => reforgeStateKey(next) !== key, 'story state transition')
    }
    assertReforgeOpening(report, introPath)
    assert.equal(Object.keys(report.milestones).length, 3, 'missing visual milestone')
    report.npcTrace = await until(
      () => page.evaluate(() => window.__readOpeningTrace()),
      (t) => t.events.at(-1)?.control,
      'committed final frame returns control',
      5000,
    )
    await writeFile(resolve(out, 'npc-trace.json'), `${JSON.stringify(report.npcTrace, null, 2)}\n`)
    report.matrix = await page.evaluate(() => window.__readOpeningMatrix())
    await writeFile(resolve(out, 'matrix.json'), JSON.stringify(report.matrix, null, 2))
    assert.deepEqual(
      (await readOpeningContract(repoRoot)).hashes,
      openingContract.hashes,
      'content changed during 001',
    )
    report.matrixVerdict = assertOpeningMatrix(report.matrix, 'reforge', openingContract)
    report.timing = openingTiming(report.npcTrace, 'reforge')
    if (capture.enabled) {
      assert.equal(report.timing.status, 'passed', '001 semantic timing failed')
      report.endFrame = await waitForOpeningFrame(page, until)
      await capture.finish(page, {
        event: 'room-control-returned',
        frame: report.endFrame,
        state: await snapshot(),
      })
      report.pending = ['002 and subsequent fragments; full-series capture readiness']
      return
    }
    await press('Escape', 'prove actual menu control')
    await until(snapshot, (s) => s.runtime?.menuActive, 'menu opens')
    await press('Escape', 'return to room')
    await until(snapshot, (s) => reforgeRoomReady(s.runtime), 'menu closes')
    report.endFrame = await waitForOpeningFrame(page, until)
    await page.screenshot({ path: resolve(out, '001-end.png') })
    const original = await page.evaluate(() => window.__tpE2e.dumpSave())
    const bytes = JSON.stringify(original)
    await writeFile(resolve(out, '001.end.save.json'), bytes)
    report.checkpoint = {
      path: '001.end.save.json',
      sha256: sha256(bytes),
      source: 'this run / production save barrier / dumpSave',
    }
    report.endWorldHash = sha256(JSON.stringify(openingSaveView(original)))

    page = await newPage('checkpoint-restore')
    await page.route('**/__e2e-checkpoint.json', (route) =>
      route.fulfill({ contentType: 'application/json', body: bytes }),
    )
    await page.goto(`${baseURL}/?e2e-load=${encodeURIComponent('/__e2e-checkpoint.json')}`)
    await until(
      snapshot,
      (s) => {
        assert.notEqual(
          s.boot?.checkpointLoad,
          'failed',
          'checkpoint rejected; fallback is not success',
        )
        return s.boot?.checkpointLoad === 'loaded' && reforgeRoomReady(s.runtime)
      },
      'formal SAVE10 checkpoint restored',
      60_000,
    )
    const restored = await page.evaluate(() => window.__tpE2e.dumpSave())
    await writeFile(resolve(out, '001.restored.save.json'), JSON.stringify(restored))
    report.restoredWorldHash = sha256(JSON.stringify(openingSaveView(restored)))
    assert.equal(report.restoredWorldHash, report.endWorldHash, 'restored persistent state differs')
    await press('Escape', 'restored control opens menu')
    await until(snapshot, (s) => s.runtime?.menuActive, 'restored menu opens')
    await press('Escape', 'restored control returns to room')
    await until(snapshot, (s) => reforgeRoomReady(s.runtime), 'restored menu closes')
    report.restoredFrame = await waitForOpeningFrame(page, until, report.endFrame)
    await page.screenshot({ path: resolve(out, '001-restored.png') })
    if (report.timing.status !== 'passed')
      throw new Error('001 dialogue/movement ordering differs; inspect npc-trace.json')
  },
})
