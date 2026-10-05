import assert from 'node:assert/strict'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { runBrowserJourney } from './browser-journey.mjs'
import { assertContinuousCheckpoint, CONTINUOUS_STORY_FRAGMENTS } from './continuous-story.mjs'
import { navigateInnRoute } from './inn-navigation.mjs'
import { readInnGame, readInnReforge } from './inn-observer.mjs'
import { kitchenGrid, kitchenReady } from './kitchen-contract.mjs'

const args = process.argv.slice(2),
  engine = args.includes('--reforge') ? 'reforge' : 'game',
  headless = args.includes('--headless'),
  hold = args.includes('--hold'),
  stopAt = args.includes('--stop-at') ? args[args.indexOf('--stop-at') + 1] : null,
  tapePath = args[args.indexOf('--tape') + 1]
assert(tapePath, 'continuous replay requires --tape')
const tape = JSON.parse(await readFile(resolve(tapePath), 'utf8'))
assert.equal(tape.mode, 'story-only')
const entries = tape.actions[engine]
assert.deepEqual(
  entries.map((entry) => entry.fragment),
  CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id),
)

const read =
  engine === 'game' ? () => page.evaluate(readInnGame) : () => page.evaluate(readInnReforge)
let page
let previousAtMs = null
const report = { engine, mode: 'continuous', storyOnly: true, fragments: [], actions: [] }
const stateKey = (state) =>
  JSON.stringify(
    engine === 'game'
      ? {
          scene: state.scene,
          mode: state.mode,
          frame: state.frame,
          dialog: state.dialog,
          menu: state.menu,
          event: state.event,
          loading: state.loading,
          fading: state.fading,
        }
      : {
          scene: state.scene,
          position: state.runtime?.position,
          facing: state.runtime?.facing,
          dialogue: state.runtime?.dialogue,
          scriptRunning: state.runtime?.scriptRunning,
          presentationBusy: state.runtime?.presentationBusy,
          menuActive: state.runtime?.menuActive,
        },
  )
const isDialogueWaiting = (state) =>
  engine === 'game'
    ? ['waiting-page-key', 'waiting-end-key'].includes(state.dialog?.phase)
    : state.runtime?.dialogue?.phase === 'waiting-input'
const isDialogueAction = (action) =>
  /dialogue|confirmation|interact|dialog|full-dialogue|rendered/iu.test(String(action.reason ?? ''))
const isContinuousBoundaryReady = (state) =>
  engine === 'game'
    ? state.ready &&
      state.mode === 'explore' &&
      !state.event &&
      !state.dialog &&
      !state.menu &&
      !state.loading &&
      !state.fading &&
      !state.video
    : !!state.runtime &&
      !state.runtime.scriptRunning &&
      !state.runtime.dialogue &&
      !state.runtime.presentationBusy &&
      !state.runtime.menuActive &&
      !state.runtime.battleActive &&
      state.runtime.fadeBlack === 0 &&
      !state.runtime.ditherActive
const routeTargetReached = (state, target) => {
  if (!target) return true
  const expectedScene = engine === 'game' ? Number(target.scene.slice(1)) + 1 : target.scene
  const actualScene = engine === 'game' ? state.scene : state.scene
  const acceptedScenes = (target.acceptScenes ?? [target.scene]).map((scene) =>
    engine === 'game' ? Number(scene.slice(1)) + 1 : scene,
  )
  if (!acceptedScenes.includes(actualScene)) return false
  if (!target.position) return actualScene === expectedScene
  const actual =
    engine === 'game'
      ? state.position
      : state.runtime?.position
        ? [state.runtime.position.col, state.runtime.position.row, state.runtime.position.height]
        : null
  if (!Array.isArray(actual) || actual.length < target.position.length) return false
  // A standalone receipt records the last committed cell, but a continuous
  // page may enter the same semantic leg with background NPCs one cell apart.
  // Keep long legs exact; short one/two-step transitions use a bounded local
  // neighborhood and still require the scene/control barrier below.
  const tolerance = engine === 'game' ? 24 : (target.committedSteps ?? 0) <= 2 ? 2.5 : 0.2
  return (
    Math.hypot(
      ...target.position.slice(0, 2).map((value, index) => Number(actual[index]) - Number(value)),
    ) <= tolerance
  )
}
const SCENE_BOUNDARY_POSITIONS = {
  s001: { s003: [60, -13] },
  s002: { s003: [86, 12] },
  s003: { s001: [124, 62], s004: [137, 76] },
  s004: { s005: [140, 26] },
  s005: { s014: [126, 52] },
}
const DIRECT_SCENE_BOUNDARY_STARTS = {
  's003>s001': [124, 62],
}
const hasDialogue = (state) => (engine === 'game' ? !!state.dialog : !!state.runtime?.dialogue)
const driveRouteTarget = async (action, _entry, until, health) => {
  const target = action.routeTarget
  if (!target) return
  let current = await read()
  if (!isContinuousBoundaryReady(current))
    current = await until(
      read,
      (next) => isContinuousBoundaryReady(next),
      `continuous route settles before ${action.key}`,
      30000,
    )
  if (routeTargetReached(current, target)) return
  if (target.phaseStart) {
    const phaseTarget = { ...target, position: target.phaseStart, phaseStart: undefined }
    if (target.phaseStartPassive)
      await until(
        read,
        (next) => routeTargetReached(next, phaseTarget),
        `continuous passive phase start ${_entry.fragment}`,
        15000,
      )
    else await driveRouteTarget({ ...action, routeTarget: phaseTarget }, _entry, until, health)
    if (hasDialogue(await read())) return
    if (routeTargetReached(await read(), target)) return
  }
  if (target.inputKey) {
    await page.keyboard.down(target.inputKey)
    try {
      await until(
        read,
        (next) => routeTargetReached(next, target) || hasDialogue(next),
        `continuous held route ${target.inputKey}`,
        30000,
      )
    } finally {
      await page.keyboard.up(target.inputKey)
    }
    return
  }
  const actualScene =
    engine === 'game' ? `s${String(current.scene - 1).padStart(3, '0')}` : current.scene
  const scene = target.scene
  if (actualScene !== scene && target.position) {
    const boundary = SCENE_BOUNDARY_POSITIONS[actualScene]?.[scene]
    if (boundary) {
      const directStart = DIRECT_SCENE_BOUNDARY_STARTS[`${actualScene}>${scene}`]
      const currentGrid = kitchenGrid(current.position, engine)
      if (
        directStart &&
        Math.hypot(currentGrid[0] - directStart[0], currentGrid[1] - directStart[1]) <= 2
      ) {
        await page.keyboard.down(action.key)
        try {
          await until(
            read,
            (next) => routeTargetReached(next, target),
            `continuous scene boundary ${actualScene}->${scene}`,
            15000,
          )
        } finally {
          await page.keyboard.up(action.key)
        }
        return
      }
      const mapId =
        actualScene === 's001' || actualScene === 's002'
          ? '012'
          : actualScene === 's003'
            ? '010'
            : actualScene === 's004'
              ? '001'
              : '002'
      const map = JSON.parse(
        await readFile(
          resolve(process.cwd(), `projects/pal/content/maps/map-${mapId}.json`),
          'utf8',
        ),
      )
      const boundaryPosition =
        engine === 'game'
          ? [16 * (boundary[0] - boundary[1]), 8 * (boundary[0] + boundary[1])]
          : boundary
      await navigateInnRoute({
        engine,
        keyboard: page.keyboard,
        map,
        read,
        until,
        health,
        grid: (state) => kitchenGrid(state.position, engine),
        inScene: (state) =>
          state.scene === (engine === 'game' ? Number(actualScene.slice(1)) + 1 : actualScene),
        ready: (state) => kitchenReady(state, engine),
        destination: (...position) =>
          Math.hypot(
            position[0] - kitchenGrid(boundaryPosition, engine)[0],
            position[1] - kitchenGrid(boundaryPosition, engine)[1],
          ) <= (engine === 'game' ? 1.5 : 1),
        finished: (state) =>
          routeTargetReached(state, { ...target, position: null }) || hasDialogue(state),
        onInput: () => {},
        onProgress: () => {},
      })
      return driveRouteTarget(action, _entry, until, health)
    }
  }
  const mapId =
    {
      s001: '012',
      s002: '012',
      s003: '010',
      s004: '001',
      s005: '002',
    }[scene] ?? null
  if (!mapId || !target.position) return
  const map = JSON.parse(
    await readFile(resolve(process.cwd(), `projects/pal/content/maps/map-${mapId}.json`), 'utf8'),
  )
  const targetGrid = kitchenGrid(target.position, engine)
  const tolerance = engine === 'game' ? 1.5 : (target.committedSteps ?? 0) <= 2 ? 2.5 : 0.2
  const routeScenes = target.position ? [scene] : (target.acceptScenes ?? [scene])
  try {
    await navigateInnRoute({
      engine,
      keyboard: page.keyboard,
      map,
      read,
      until,
      health,
      grid: (state) => kitchenGrid(state.position, engine),
      inScene: (state) =>
        routeScenes.some(
          (candidate) =>
            state.scene === (engine === 'game' ? Number(candidate.slice(1)) + 1 : candidate),
        ),
      ready: (state) => kitchenReady(state, engine),
      destination: (col, row) => Math.hypot(col - targetGrid[0], row - targetGrid[1]) <= tolerance,
      finished: (state) => routeTargetReached(state, target) || hasDialogue(state),
      onInput: () => {},
      onProgress: () => {},
    })
  } catch (error) {
    console.error(
      '[continuous route failure]',
      JSON.stringify({ engine, fragment: _entry.fragment, target, state: await read() }),
    )
    if (!/no normal collision-safe inn route/u.test(String(error))) throw error
    await page.keyboard.down(action.key)
    try {
      await until(
        read,
        (next) => routeTargetReached(next, target),
        `continuous fallback route ${action.key}`,
        15000,
      )
    } finally {
      await page.keyboard.up(action.key)
    }
  }
}
const waitForActionReady = async (action, until) => {
  if (action.key !== 'Enter' || !isDialogueAction(action)) return
  const state = await until(
    read,
    (next) =>
      isDialogueWaiting(next) ||
      (engine === 'game' &&
        !next.dialog &&
        next.lastLine?.text &&
        String(action.reason).endsWith(String(next.lastLine.text))),
    `continuous dialogue ready: ${action.reason}`,
    90000,
  )
  return !(
    engine === 'game' &&
    !isDialogueWaiting(state) &&
    state.lastLine?.text &&
    String(action.reason).endsWith(String(state.lastLine.text))
  )
}
const waitForActionProgress = async (before, action, until) => {
  if (!isDialogueAction(action)) return
  await until(
    read,
    (next) => stateKey(next) !== before,
    `continuous dialogue consumed: ${action.reason}`,
    30000,
  )
}
const waitRelease = (fragment) =>
  new Promise((resolveRelease, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`barrier release timeout ${fragment}`)),
      hold ? 12 * 60 * 60 * 1000 : 180000,
    )
    process.once('message', (message) => {
      if (message?.release !== fragment)
        return reject(new Error(`unexpected barrier release ${message?.release}`))
      clearTimeout(timer)
      resolveRelease()
    })
  })

const LAYOUT_STYLE =
  'html,body{margin:0!important;width:100vw!important;height:100vh!important;overflow:hidden!important;background:#111!important;display:grid!important;place-items:center!important}' +
  '#screen{display:block!important;width:100vw!important;height:auto!important;max-width:100vw!important;max-height:100vh!important;aspect-ratio:8/5!important;object-fit:contain!important;image-rendering:pixelated!important}'

await runBrowserJourney({
  name: `continuous-${engine}`,
  packageName: `@type-pal/${engine}`,
  environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
  arguments: [headless ? '--headless' : '--headed'],
  browserArgs: headless
    ? []
    : [`--window-size=756,982`, `--window-position=${engine === 'game' ? 0 : 756},0`],
  viewport: { width: 756, height: 900 },
  journeyTimeoutMs: hold ? 12 * 60 * 60 * 1000 : 240_000,
  sources: ['scripts/e2e/continuous-story.mjs', 'scripts/e2e/continuous-story-replay-engine.mjs'],
  journey: async ({ newPage, baseURL, out, until, health }) => {
    page = await newPage(`continuous-${engine}`)
    // Install before navigation so the title menu, boot overlay, video handoff and scene all
    // share the same half-window geometry; a post-load style briefly exposes the 1280×800 RF
    // default (and the 960×600 game default) on the main menu.
    await page.addInitScript((css) => {
      const install = () => {
        if (!document.documentElement) return
        if (document.getElementById('continuous-layout')) return
        const style = document.createElement('style')
        style.id = 'continuous-layout'
        style.textContent = css
        document.head?.appendChild(style)
      }
      install()
      if (document.documentElement)
        new MutationObserver(install).observe(document.documentElement, { childList: true })
      else document.addEventListener('DOMContentLoaded', install, { once: true })
    }, LAYOUT_STYLE)
    await page.goto(engine === 'reforge' ? `${baseURL}/?menu` : baseURL)
    await page.addStyleTag({
      content: LAYOUT_STYLE,
    })
    await until(
      async () => {
        const optOut = page.getByRole('button', { name: '拒绝', exact: true })
        if (await optOut.isVisible()) await optOut.click()
        const overlay = page.getByText('点击屏幕开始 / Click to start', { exact: true })
        if (await overlay.isVisible()) await overlay.click()
        const video = await page.evaluate(() => document.querySelector('video')?.currentSrc ?? null)
        if (video) {
          await page.keyboard.press('Enter')
          await until(
            () => page.evaluate(() => document.querySelector('video')?.currentSrc ?? null),
            (next) => next !== video,
            'continuous title prelude closes',
            60000,
          )
          return null
        }
        const state = await read()
        return engine === 'game'
          ? state.ready && state.menu?.kind === 'opening'
          : state.boot?.opening?.phase === 'menu' || !!state.runtime
      },
      Boolean,
      'continuous browser boot',
      60000,
    )
    await page.screenshot({ path: resolve(out, 'continuous-title.png') })
    for (const entry of entries) {
      const fragmentReport = {
        fragment: entry.fragment,
        actions: entry.actions.length,
        startedAt: Date.now(),
        startState: await read(),
      }
      report.fragments.push(fragmentReport)
      let consumedRouteKey = null
      for (const action of entry.actions) {
        health()
        if (Number.isFinite(action.atMs) && previousAtMs !== null) {
          const gap = Math.max(0, Math.min(3000, action.atMs - previousAtMs))
          if (gap) await delay(gap)
        }
        previousAtMs = Number.isFinite(action.atMs) ? action.atMs : previousAtMs
        const routeKey = action.routeTarget
          ? JSON.stringify({ key: action.key, target: action.routeTarget })
          : null
        if (action.kind === 'up' && routeKey && routeKey === consumedRouteKey) {
          report.actions.push({
            fragment: entry.fragment,
            ...action,
            skipped: 'live-route-release',
          })
          consumedRouteKey = null
          continue
        }
        const shouldRun = await waitForActionReady(action, until)
        if (shouldRun === false) {
          report.actions.push({ fragment: entry.fragment, ...action, skipped: 'already-consumed' })
          continue
        }
        const before = stateKey(await read())
        if (action.kind === 'down' && action.routeTarget?.position) {
          await driveRouteTarget(action, entry, until, health)
          consumedRouteKey = routeKey
          report.actions.push({ fragment: entry.fragment, ...action, mode: 'live-route' })
          fragmentReport.actionsApplied = (fragmentReport.actionsApplied ?? 0) + 1
          continue
        }
        if (action.kind === 'down') await page.keyboard.down(action.key)
        else if (action.kind === 'up') await page.keyboard.up(action.key)
        else {
          await page.keyboard.down(action.key)
          await page.keyboard.up(action.key)
        }
        report.actions.push({ fragment: entry.fragment, ...action })
        fragmentReport.actionsApplied = (fragmentReport.actionsApplied ?? 0) + 1
        if (action.kind === 'up' && action.routeTarget)
          await driveRouteTarget(action, entry, until, health)
        if (
          action.kind === 'up' &&
          action.routeTarget?.expectDialogue &&
          !hasDialogue(await read())
        ) {
          await page.keyboard.down(action.key)
          try {
            await until(read, hasDialogue, `continuous route dialogue ${entry.fragment}`, 15000)
          } finally {
            await page.keyboard.up(action.key)
          }
        }
        await waitForActionProgress(before, action, until)
        await delay(action.key === 'Enter' ? 80 : 20)
      }
      const state = await until(
        read,
        (next) => {
          try {
            assertContinuousCheckpoint(entry.fragment, engine, next)
            return isContinuousBoundaryReady(next)
          } catch {
            return false
          }
        },
        `continuous ${entry.fragment} semantic boundary`,
        90000,
      )
      const checkpoint = assertContinuousCheckpoint(entry.fragment, engine, state)
      fragmentReport.state = state
      fragmentReport.checkpoint = checkpoint
      fragmentReport.finishedAt = Date.now()
      await writeFile(
        resolve(out, `continuous-${entry.fragment}-checkpoint.json`),
        `${JSON.stringify({ engine, fragment: entry.fragment, state }, null, 2)}\n`,
      )
      await page.screenshot({ path: resolve(out, `continuous-${entry.fragment}-checkpoint.png`) })
      if (process.send) process.send({ checkpoint: entry.fragment, engine, state })
      if (stopAt === entry.fragment) {
        await writeFile(
          resolve(out, 'continuous-report.json'),
          `${JSON.stringify(report, null, 2)}\n`,
        )
        return
      }
      if (entry.fragment !== '006') await waitRelease(entry.fragment)
    }
    if (hold) await waitRelease('finish')
    await writeFile(resolve(out, 'continuous-report.json'), `${JSON.stringify(report, null, 2)}\n`)
  },
})
