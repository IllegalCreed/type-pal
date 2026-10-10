import assert from 'node:assert/strict'
import { appendFile, readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { setTimeout as delay } from 'node:timers/promises'
import { runBrowserJourney } from './browser-journey.mjs'
import { readCaptureWorld } from './capture-local.mjs'
import {
  installCommittedRoutePlayback,
  replayCommittedRoute,
  replayFacingInput,
} from './committed-route.mjs'
import { assertContinuousAcceptance } from './continuous-acceptance.mjs'
import { continuousJourneyBudget, manualInteractionTarget } from './continuous-action-policy.mjs'
import {
  assertContinuousWorldCheckpoint,
  assertRecordedStoryEndpoint,
} from './continuous-checkpoint.mjs'
import { waitContinuousPreflightRelease } from './continuous-preflight-gate.mjs'
import {
  assertContinuousCheckpoint,
  CONTINUOUS_STORY_FRAGMENTS,
  continuousPlaybackActions,
} from './continuous-story.mjs'
import { innCausalObserverScript, readInnGame, readInnReforge } from './inn-observer.mjs'
import { assertInputLedger, withRecordedInputSession } from './input-ledger.mjs'
import { readKitchenContract } from './kitchen-contract.mjs'

const args = process.argv.slice(2),
  engine = args.includes('--reforge') ? 'reforge' : 'game',
  headless = args.includes('--headless'),
  hold = args.includes('--hold'),
  stopAt = args.includes('--stop-at') ? args[args.indexOf('--stop-at') + 1] : null,
  tapePath = args[args.indexOf('--tape') + 1]
assert(tapePath, 'continuous replay requires --tape')
const tape = JSON.parse(await readFile(resolve(tapePath), 'utf8'))
const acceptance = await assertContinuousAcceptance(tape)
assert.equal(tape.mode, 'story-only')
const entries = tape.actions[engine]
const contract = await readKitchenContract()
const worldCheckpoints = new Map()
assert.deepEqual(
  entries.map((entry) => entry.fragment),
  CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id),
)

const read =
  engine === 'game' ? () => page.evaluate(readInnGame) : () => page.evaluate(readInnReforge)
let page
const report = {
  engine,
  mode: 'continuous',
  storyOnly: true,
  acceptance,
  fragments: [],
  actions: [],
  operations: [],
}
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
const isMenuAction = (action) =>
  /menu navigation toward|selected wine use|menu cancel/iu.test(String(action.reason ?? ''))
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
const waitForActionReady = async (action, until) => {
  if (action.key !== 'Enter' || !isDialogueAction(action)) return
  // Manual interaction is the input that opens the dialogue; waiting for a dialogue first
  // deadlocks on entities such as e62/e19. Only confirmation presses wait for an existing page.
  if (manualInteractionTarget(action)) return true
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

await waitContinuousPreflightRelease()

await runBrowserJourney({
  name: `continuous-${engine}`,
  packageName: `@type-pal/${engine}`,
  environment: engine === 'game' ? { E2E: '1' } : { VITE_PROJECT_ID: 'pal' },
  arguments: [headless ? '--headless' : '--headed'],
  browserArgs: headless
    ? []
    : [`--window-size=756,982`, `--window-position=${engine === 'game' ? 0 : 756},0`],
  viewport: { width: 756, height: 900 },
  journeyTimeoutMs: continuousJourneyBudget(entries.length, hold),
  traceConfig:
    engine === 'game' ? 'scripts/e2e/game-inn.config.mts' : 'scripts/e2e/reforge-inn.config.mts',
  initScripts: [innCausalObserverScript(), installCommittedRoutePlayback],
  sources: [
    'scripts/e2e/continuous-story.mjs',
    'scripts/e2e/continuous-story-replay-engine.mjs',
    'scripts/e2e/continuous-story-replay-both.mjs',
    'scripts/e2e/continuous-preflight-gate.mjs',
    'scripts/e2e/committed-route.mjs',
    'scripts/e2e/continuous-action-policy.mjs',
    'scripts/e2e/continuous-checkpoint.mjs',
    'scripts/e2e/inn-observer.mjs',
    'scripts/e2e/opening-trace-plugin.mjs',
    'scripts/e2e/scene-lifecycle-trace.mjs',
    'packages/game/src/shell/bootstrap.ts',
    'scripts/e2e/inn-trace-plugin.mjs',
    'scripts/e2e/reforge-render-evidence.mjs',
    'packages/reforge/src/world-scene-presentation.ts',
    'packages/reforge/src/render.ts',
  ],
  journey: async ({ newPage, baseURL, out, until, health }) => {
    page = await newPage(`continuous-${engine}`)
    try {
      await withRecordedInputSession({
        keyboard: page.keyboard,
        record: (action) => report.actions.push(action),
        body: async (execute) => {
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
              const video = await page.evaluate(
                () => document.querySelector('video')?.currentSrc ?? null,
              )
              if (video) {
                await execute({
                  key: 'Enter',
                  scope: 'boundary',
                  phase: 'bootstrap',
                  reason: 'close continuous title prelude',
                })
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
            for (const action of continuousPlaybackActions(entry.actions)) {
              health()
              const actionIndex = entry.actions.indexOf(action)
              const actionState = await read(),
                progress = {
                  atMs: Date.now(),
                  engine,
                  fragment: entry.fragment,
                  actionIndex,
                  action,
                  state: actionState,
                }
              await writeFile(
                resolve(out, 'continuous-progress.json'),
                `${JSON.stringify(progress, null, 2)}\n`,
              )
              await appendFile(
                resolve(out, 'continuous-progress-history.jsonl'),
                `${JSON.stringify(progress)}\n`,
              )
              if (action.scene && action.kind === 'down') {
                await until(
                  read,
                  (next) =>
                    next.scene ===
                    (engine === 'game' ? Number(action.scene.slice(1)) + 1 : action.scene),
                  `continuous route scene ${action.scene}`,
                  30000,
                )
              }
              if (action.routeReplay) {
                try {
                  await replayCommittedRoute({
                    page,
                    route: action.routeReplay,
                    health,
                    onInput: (event) =>
                      report.actions.push({
                        ...event,
                        scope: action.scope,
                        fragment: entry.fragment,
                        sourceActionIndex: actionIndex,
                        routeId: action.routeReplay.id,
                      }),
                  })
                } catch (error) {
                  await writeFile(
                    resolve(out, 'continuous-route-failure.json'),
                    JSON.stringify(
                      {
                        fragment: entry.fragment,
                        actionIndex,
                        action,
                        error: String(error),
                        state: await read(),
                        evidence: await page.evaluate(() => window.__readInnEvidence()),
                      },
                      null,
                      2,
                    ),
                  )
                  throw error
                }
                report.operations.push({
                  fragment: entry.fragment,
                  sourceActionIndex: actionIndex,
                  mode: 'committed-route',
                })
                fragmentReport.actionsApplied = (fragmentReport.actionsApplied ?? 0) + 1
                continue
              }
              let shouldRun
              try {
                if (action.holdTarget) {
                  await replayFacingInput(page, action, (event) =>
                    report.actions.push({
                      ...event,
                      scope: action.scope,
                      fragment: entry.fragment,
                      sourceActionIndex: actionIndex,
                    }),
                  )
                  report.operations.push({
                    fragment: entry.fragment,
                    sourceActionIndex: actionIndex,
                    mode: 'facing-hold',
                  })
                  fragmentReport.actionsApplied = (fragmentReport.actionsApplied ?? 0) + 1
                  continue
                }
                shouldRun = await waitForActionReady(action, until)
              } catch (error) {
                await writeFile(
                  resolve(out, 'continuous-action-failure.json'),
                  `${JSON.stringify(
                    {
                      engine,
                      fragment: entry.fragment,
                      actionIndex,
                      action,
                      state: await read(),
                      innEvidence: await page.evaluate(() => window.__readInnEvidence?.() ?? null),
                      error: String(error),
                    },
                    null,
                    2,
                  )}\n`,
                )
                throw error
              }
              if (shouldRun === false) {
                report.operations.push({
                  fragment: entry.fragment,
                  sourceActionIndex: actionIndex,
                  skipped: 'already-consumed',
                })
                continue
              }
              const before = stateKey(await read())
              await execute({ ...action, fragment: entry.fragment, sourceActionIndex: actionIndex })
              fragmentReport.actionsApplied = (fragmentReport.actionsApplied ?? 0) + 1
              await waitForActionProgress(before, action, until)
              await delay(isMenuAction(action) ? 120 : action.key === 'Enter' ? 80 : 20)
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
            const independent = tape.plan.fragments.find(
              (fragment) => fragment.id === entry.fragment,
            ).engines[engine]
            const world = await readCaptureWorld(page, engine)
            await writeFile(
              resolve(out, `continuous-${entry.fragment}-checkpoint.json`),
              `${JSON.stringify({ engine, fragment: entry.fragment, state, world }, null, 2)}\n`,
            )
            assertRecordedStoryEndpoint(state, engine, independent)
            assertContinuousWorldCheckpoint({
              fragment: entry.fragment,
              engine,
              payload: world,
              predecessor: worldCheckpoints.get('002'),
              contract,
            })
            worldCheckpoints.set(entry.fragment, world)
            fragmentReport.state = state
            fragmentReport.checkpoint = checkpoint
            fragmentReport.finishedAt = Date.now()
            await page.screenshot({
              path: resolve(out, `continuous-${entry.fragment}-checkpoint.png`),
            })
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
        },
      })
      assertInputLedger(report.actions, { requireReceipts: true })
      report.status = 'passed'
    } catch (error) {
      report.status = 'failed'
      report.error = String(error)
      throw error
    } finally {
      await writeFile(
        resolve(out, 'continuous-report.json'),
        `${JSON.stringify(report, null, 2)}\n`,
      )
    }
  },
})
