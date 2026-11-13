import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'
import {
  battleStatusCases,
  battleStatusSources,
  prepareBattleStatusInputs,
} from './battle-status-scenarios.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, selector = 'all', mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine),
  'usage: node scripts/e2e/battle-status.mjs game|reforge [group|case[,case]] [--probe|--capture]',
)
assert(
  mode === undefined || mode === '--probe' || mode === '--capture',
  'unknown battle status mode',
)
const selected = battleStatusCases(selector)
assert(mode !== '--capture' || selected.length === 1, 'review capture is one fixed battle')
const repeats = mode ? 1 : 2
const prepare = await prepareBattleStatusInputs()
const nextKey = engine === 'game' ? nextGameBattleKey : nextReforgeBattleKey
const paint = (page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )

await runBrowserJourney({
  name: `q2-status-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
  environment: { E2E: '1', Q2_COUNTER: 'none' },
  arguments: ['--headless', ...(mode === '--capture' ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: Math.max(240_000, selected.length * repeats * 45_000),
  sources: [...(await battleFoundationInputSources(repoRoot)), ...battleStatusSources],
  initScripts: engine === 'game' ? [installGameBattleAdapter] : [],
  async journey({ newPage, baseURL, out, report, until, health, capture }) {
    const failures = []
    Object.assign(report, { engine, lane: 'Q2', selector, repeats, cases: [], counter: 'none' })
    for (const scenario of selected) {
      const spec = prepare(scenario)
      for (let index = 1; index <= repeats; index++) {
        const runId = `${scenario.id}-${index}`
        const result = { id: scenario.id, runId, configured: spec }
        report.cases.push(result)
        const page = await newPage(runId)
        await page.addInitScript(
          battleObserverScript({
            engine,
            scenarioId: spec.id,
            runId,
            observeMagicOverlays: true,
            observePhysicalOverlays: true,
            random: { algorithm: 'mulberry32', seed: spec.seed },
          }),
        )
        const read = () => page.evaluate(() => globalThis.__battleHarness?.read())
        try {
          await page.goto(baseURL + (engine === 'game' ? '/?skip-intro=1' : '/q2-battle.html'))
          await until(read, (state) => state?.ready, `${runId} normal battle entry`, 60_000)
          if (engine === 'game') {
            const reject = page.getByRole('button', { name: '拒绝', exact: true })
            if (await reject.isVisible()) {
              await reject.click()
              report.events.push({ kind: 'bootstrap-consent', runId, choice: 'denied' })
            }
            if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
          }
          await page.evaluate((input) => globalThis.__battleHarness.launch(input), spec)
          result.initial = await until(
            read,
            (state) => state?.snapshot,
            `${runId} battle start`,
            60_000,
          )
          if (capture.enabled) {
            report.fragment = `q2-${scenario.id}`
            report.predecessor = { kind: 'battle-fixture', setup: spec }
            await capture.arm(page, {
              event: 'battle-fixture-ready',
              runId,
              state: result.initial.snapshot,
            })
          }
          const started = Date.now()
          let settlementConfirmedAt = 0
          let menuProbed = false
          for (;;) {
            health()
            const state = await read()
            if (state.terminal) {
              result.terminal = state.terminal
              if (capture.enabled)
                await capture.finish(page, { event: 'battle-result', runId, state: state.terminal })
              break
            }
            assert(!state.failure && !state.errors?.length, JSON.stringify(state))
            const commandIndex = Array.isArray(state.commands)
              ? state.commands.length
              : state.commands
            const command = scenario.commands[commandIndex]
            if (!state.busy && state.phase === 'selectAction' && state.selectingPlayerId)
              assert(
                command &&
                  state.turn === command.turn &&
                  state.selectingPlayerId === command.actorId,
                `unexpected real menu in ${runId}: ${state.turn}/${state.selectingPlayerId} at ${commandIndex}`,
              )
            assert(
              Date.now() - started < 75_000,
              `battle did not finish: ${runId} ${JSON.stringify(state)}`,
            )
            const menuProbe = scenario.silenceMenuProbe
            if (
              !menuProbed &&
              menuProbe &&
              !state.busy &&
              state.phase === 'selectAction' &&
              state.turn === menuProbe.turn &&
              state.selectingPlayerId === menuProbe.actorId &&
              (state.menuState === 'main' || state.selection?.phase === 'menu')
            ) {
              const index = (readout) =>
                engine === 'game' ? readout.selectedAction : readout.selection?.menuIndex
              const before = index(state)
              await pressRecordedKey({
                keyboard: page.keyboard,
                action: {
                  key: 'ArrowLeft',
                  phase: 'battle',
                  scope: 'story',
                  context: runId,
                  commandIndex,
                },
                record: (input) => report.actions.push(input),
              })
              await paint(page)
              const after = await read()
              result.silenceMenuProbe = {
                turn: state.turn,
                actorId: state.selectingPlayerId,
                before,
                after: index(after),
                phase: engine === 'game' ? after.menuState : after.selection?.phase,
              }
              menuProbed = true
              continue
            }
            const key = nextKey(state, command)
            const confirming = engine === 'reforge' && state.canConfirmSettlement
            if (!confirming) settlementConfirmedAt = 0
            if (key && (!confirming || Date.now() - settlementConfirmedAt >= 300)) {
              if (confirming) settlementConfirmedAt = Date.now()
              await pressRecordedKey({
                keyboard: page.keyboard,
                action: { key, phase: 'battle', scope: 'story', context: runId, commandIndex },
                record: (input) => report.actions.push(input),
              })
            }
            await paint(page)
          }
        } catch (error) {
          result.failure = String(error)
          failures.push(`${runId}: ${result.failure}`)
          await page.screenshot({ path: resolve(out, `${runId}-failure.png`) }).catch(() => {})
        } finally {
          const trace = await page.evaluate(() => globalThis.__battleEvidence?.read())
          if (trace) {
            result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, trace)
            if (trace.errors.length || trace.overflow || !trace.terminal)
              failures.push(
                `${runId}: incomplete or invalid native trace ${JSON.stringify(trace.errors)}`,
              )
            console.log(
              `[${engine}] ${runId}: ${trace.actions.length} actions, ${trace.terminal?.result ?? 'incomplete'}`,
            )
          }
          await page.close()
        }
      }
    }
    assert.deepEqual(failures, [])
  },
})
