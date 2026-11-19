import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { battleOpponentScenarios, battleOpponentSources } from './battle-opponent-scenarios.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, selector = 'all', mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine) &&
    [undefined, '--probe', '--capture'].includes(mode) &&
    process.argv.length <= 5,
  'usage: node scripts/e2e/battle-opponents.mjs game|reforge [all|team-N[,team-N]] [--probe|--capture]',
)
const scenarios = await battleOpponentScenarios(repoRoot, selector)
const captures = mode === '--capture'
assert(!captures || scenarios.length === 1, 'capture one original formation per recording')
const repeats = mode ? 1 : 2
const nextKey = engine === 'game' ? nextGameBattleKey : nextReforgeBattleKey

async function acknowledgeGameKey(page, input) {
  const dispatchedFrame = await page.evaluate(() => globalThis.__tpgs.frameNum)
  const observed = await page.waitForFunction(
    (frame) => (globalThis.__tpgs.frameNum > frame ? globalThis.__tpgs.frameNum : false),
    dispatchedFrame,
    { timeout: 3000 },
  )
  try {
    input.gameLogic = { dispatchedFrame, observedFrame: await observed.jsonValue() }
  } finally {
    await observed.dispose()
  }
}

await runBrowserJourney({
  name: `q2-opponents-${engine}-${mode?.slice(2) ?? 'verify'}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
  environment: { E2E: '1', Q2_COUNTER: 'none' },
  arguments: ['--headless', ...(captures ? ['--capture'] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: Math.max(240_000, scenarios.length * repeats * 45_000),
  sources: await battleOpponentSources(repoRoot, scenarios),
  initScripts: engine === 'game' ? [installGameBattleAdapter] : [],
  async journey({ newPage, baseURL, out, report, until, health, capture }) {
    const failures = []
    Object.assign(report, { engine, lane: 'Q2', selector, repeats, cases: [] })
    for (const { id, scene, configured, commands } of scenarios) {
      for (let index = 1; index <= repeats; index++) {
        const runId = `${id}-${index}`
        const result = { id, scene, runId, configured }
        report.cases.push(result)
        const page = await newPage(runId)
        await page.addInitScript(
          battleObserverScript({
            engine,
            scenarioId: configured.id,
            runId,
            observeMagicOverlays: true,
            observePhysicalOverlays: true,
            random: { algorithm: 'mulberry32', seed: configured.seed },
          }),
        )
        const read = () => page.evaluate(() => globalThis.__battleHarness?.read())
        const press = async (key, commandIndex) => {
          const input = await pressRecordedKey({
            keyboard: page.keyboard,
            action: { key, phase: 'battle', scope: 'story', context: runId, commandIndex },
            record: (attempt) => report.actions.push(attempt),
          })
          if (engine === 'game') await acknowledgeGameKey(page, input)
        }
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
          await page.evaluate((spec) => globalThis.__battleHarness.launch(spec), configured)
          result.initial = await until(
            read,
            (state) => state?.snapshot,
            `${runId} battle start`,
            60_000,
          )
          if (capture.enabled) {
            report.fragment = `q2-opponents-${id}`
            report.predecessor = { kind: 'battle-fixture', setup: configured }
            await capture.arm(page, {
              event: 'battle-fixture-ready',
              runId,
              state: result.initial.snapshot,
            })
          }

          const started = Date.now()
          let settlementConfirmedAt = 0
          for (;;) {
            health()
            const state = await read()
            const submitted = Array.isArray(state.commands) ? state.commands.length : state.commands
            if (engine === 'game') assert.deepEqual(state.commands, commands.slice(0, submitted))
            if (state.terminal) {
              result.terminal = state.terminal
              assert.equal(submitted, commands.length, `${runId} ended before all commands`)
              assert.deepEqual(
                [state.terminal.result, state.terminal.settlementCount],
                ['victory', 1],
              )
              if (capture.enabled)
                await capture.finish(page, { event: 'battle-result', runId, state: state.terminal })
              break
            }
            assert(!state.failure && !state.errors?.length, JSON.stringify(state))
            const command = commands[submitted]
            if (!state.busy && state.phase === 'selectAction' && state.selectingPlayerId)
              assert(
                command &&
                  state.turn === command.turn &&
                  state.selectingPlayerId === command.actorId,
                `unexpected real menu in ${runId}: ${state.turn}/${state.selectingPlayerId} at ${submitted}`,
              )
            assert(
              Date.now() - started < 65_000,
              `battle did not finish: ${runId} ${JSON.stringify(state)}`,
            )

            const key = nextKey(state, command)
            const confirming = engine === 'reforge' && state.canConfirmSettlement
            if (!confirming) settlementConfirmedAt = 0
            if (key && (!confirming || Date.now() - settlementConfirmedAt >= 300)) {
              if (confirming) settlementConfirmedAt = Date.now()
              await press(key, submitted)
              if (engine === 'game') continue
            }
            await page.evaluate(
              () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
            )
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
              failures.push(`${runId}: incomplete native trace ${JSON.stringify(trace.errors)}`)
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
