import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { compareBattleRepeats } from './battle-comparison.mjs'
import {
  battleFoundationInputSources,
  battleFoundationScenario,
  battleFoundationScenarioGroup,
  battleLaunchSpec,
  verifyBattleFoundationSources,
} from './battle-foundation-scenarios.mjs'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { validateBattlePresentation } from './battle-presentation.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'
import { validateBattleRules } from './battle-rules.mjs'
import { validateBattleTrace } from './battle-trace-contract.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const args = process.argv.slice(2)
const option = (name, fallback) => {
  const values = args.filter((arg) => arg.startsWith(`--${name}=`))
  assert(values.length <= 1, `duplicate ${name}`)
  return values[0]?.slice(name.length + 3) ?? fallback
}
for (const arg of args)
  assert(
    arg === '--audio-review' ||
      arg === '--visual-review' ||
      /^--(engine|scenario|group|repeat|counter)=/.test(arg),
    `unknown argument ${arg}`,
  )
const audioReview = args.includes('--audio-review')
const visualReview = args.includes('--visual-review')
assert(!(audioReview && visualReview), 'choose one video capture mode')
const engine = option('engine', 'game')
const scenarioId = option('scenario')
const group = option('group', 'all')
const repeat = Number(option('repeat', audioReview ? '1' : '2'))
const counter = option('counter', 'none')
assert(['game', 'reforge'].includes(engine), 'choose game or reforge')
assert([1, 2].includes(repeat), 'repeat must be one or two fresh contexts')
assert(['none', 'double-herb'].includes(counter), 'unknown counter')
assert(!scenarioId || group === 'all', 'choose a scenario or a group')
assert(
  counter === 'none' || (engine === 'reforge' && scenarioId === 'herb-settlement' && repeat === 1),
  'counter is bounded to one isolated Reforge herb run',
)
assert(
  !audioReview || (scenarioId && scenarioId !== 'all' && repeat === 1 && counter === 'none'),
  'audio review records one normal scenario in one fresh context',
)
const scenarios =
  scenarioId && scenarioId !== 'all'
    ? [battleFoundationScenario(scenarioId)]
    : battleFoundationScenarioGroup(group).map((entry) => battleFoundationScenario(entry.id))
const premises = await verifyBattleFoundationSources(repoRoot)

await runBrowserJourney({
  name: `q2-battle-${engine}-${counter}${audioReview ? '-audio-review' : ''}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
  environment: { E2E: '1', Q2_COUNTER: counter },
  arguments: ['--headless', ...(audioReview ? ['--capture'] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: group === 'all' && (!scenarioId || scenarioId === 'all') ? 480_000 : 240_000,
  initScripts: engine === 'game' ? [installGameBattleAdapter] : [],
  sources: [
    ...(await battleFoundationInputSources(repoRoot)),
    'scripts/e2e/battle-foundation.mjs',
    'scripts/e2e/battle-foundation-compare.mjs',
    'scripts/e2e/battle-foundation-scenarios.mjs',
    'scripts/e2e/battle-comparison.mjs',
    'scripts/e2e/battle-presentation.mjs',
    'scripts/e2e/battle-casualty-presentation.mjs',
    'scripts/e2e/battle-enemy-cast-presentation.mjs',
    'scripts/e2e/battle-random-instrumentation.mjs',
    'scripts/e2e/battle-rules.mjs',
    'scripts/e2e/battle-trace-contract.mjs',
    'scripts/e2e/battle-trace-observer.mjs',
    'scripts/e2e/battle-reforge-input.mjs',
    'scripts/e2e/battle-game-input.mjs',
    'scripts/e2e/battle-game-adapter.mjs',
    'scripts/e2e/battle-game-instrumentation.mjs',
    'scripts/e2e/battle-reforge-adapter.mjs',
    'scripts/e2e/battle-reforge-instrumentation.mjs',
  ],
  async journey({ newPage, baseURL, out, report, until, health, capture }) {
    Object.assign(report, { engine, lane: 'Q2', counter, group, premises, results: [] })
    for (const scenario of scenarios) {
      let previous
      for (let index = 0; index < repeat; index++) {
        const runId = `${scenario.id}-${index + 1}`
        const page = await newPage(runId, { visualReviewVideo: index === 0 && visualReview })
        await page.addInitScript(
          battleObserverScript({
            engine,
            scenarioId: scenario.id,
            runId,
            random: scenario.random,
            ...(scenario.portraitProbe ? { portraitProbe: scenario.portraitProbe } : {}),
            ...(scenario.observeMagicOverlays ? { observeMagicOverlays: true } : {}),
          }),
        )
        let trace
        const result = { scenarioId: scenario.id, runId, configured: battleLaunchSpec(scenario) }
        report.results.push(result)
        try {
          await page.goto(`${baseURL}${engine === 'game' ? '/?skip-intro=1' : '/q2-battle.html'}`)
          await until(
            () => page.evaluate(() => globalThis.__battleHarness?.read()),
            (state) => state?.ready,
            `${runId}: public entry ready`,
            60_000,
          )
          if (engine === 'game') {
            const reject = page.getByRole('button', { name: '拒绝', exact: true })
            if (await reject.isVisible()) {
              await reject.click()
              report.events.push({ kind: 'bootstrap-consent', runId, choice: 'denied' })
            }
            if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
          }
          await page.evaluate((spec) => globalThis.__battleHarness.launch(spec), result.configured)
          result.initial = await until(
            () => page.evaluate(() => globalThis.__battleHarness.read()),
            (state) => {
              assert(!state?.failure && !state?.errors?.length, JSON.stringify(state))
              return Boolean(state?.snapshot)
            },
            `${runId}: actual battle start`,
            60_000,
          )
          result.canvas = await page.locator('canvas').first().boundingBox()
          if (capture.enabled) {
            report.fragment = `q2-${scenario.id}`
            report.predecessor = { kind: 'battle-fixture', setup: result.configured }
            await capture.arm(page, {
              event: 'battle-fixture-ready',
              runId,
              state: result.initial.snapshot,
            })
          }
          const started = Date.now()
          for (;;) {
            health()
            const state = await page.evaluate(() => globalThis.__battleHarness.read())
            result.last = state
            assert(!state.failure && !state.errors?.length, JSON.stringify(state))
            if (state.terminal) break
            assert(Date.now() - started < 90_000, `battle did not finish: ${JSON.stringify(state)}`)
            const consumed = Array.isArray(state.commands) ? state.commands.length : state.commands
            const command = scenario.expected.commands[consumed]
            const key = (engine === 'game' ? nextGameBattleKey : nextReforgeBattleKey)(
              state,
              command,
            )
            if (key) {
              await pressRecordedKey({
                keyboard: page.keyboard,
                action: {
                  key,
                  phase: 'battle',
                  scope: 'story',
                  context: runId,
                  commandIndex: consumed,
                },
                record: (input) => report.actions.push(input),
              })
            }
            // Observe a rendered frame after the physical key; never substitute a state change.
            await page.evaluate(
              () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
            )
          }
          await page.screenshot({ path: resolve(out, `${runId}-terminal.png`) })
          if (capture.enabled)
            await capture.finish(page, {
              event: 'battle-result',
              runId,
              state: result.last.terminal,
            })
        } finally {
          trace = await page.evaluate(() => globalThis.__battleEvidence?.read())
          if (trace) result.trace = await writeEvidenceArtifact(out, `${runId}-trace.json`, trace)
          await page.close()
        }
        result.judge = validateBattleTrace(trace, scenario)
        result.presentation = validateBattlePresentation(trace, scenario)
        if (result.judge.status === 'passed') result.rules = validateBattleRules(trace, scenario)
        if (counter !== 'none') {
          assert.equal(
            result.judge.status,
            'rejected',
            'real item counter escaped the common judge',
          )
          assert.equal(
            trace.errors.length,
            0,
            'collection errors cannot satisfy a business counter',
          )
          const item = trace.actions[0]
          assert.equal(item.kind, 'item')
          assert.deepEqual(item.before.inventory, [{ itemId: '99', count: 2 }])
          assert.deepEqual(item.after.inventory, [])
          assert.deepEqual(
            result.judge.findings.map(({ domain, rule, path }) => ({ domain, rule, path })),
            [{ domain: 'business', rule: 'action-after', path: 'actions[0].after' }],
            'counter must fail on a valid real action, not a malformed record',
          )
        } else {
          assert.equal(result.judge.status, 'passed', JSON.stringify(result.judge))
          if (audioReview) {
            assert.equal(
              result.presentation.status,
              'passed',
              JSON.stringify(result.presentation.findings),
            )
            assert.equal(result.rules.status, 'passed', JSON.stringify(result.rules.findings))
          }
          if (previous) {
            result.repeatJudge = compareBattleRepeats(previous, trace, scenario)
            assert.equal(result.repeatJudge.status, 'passed', JSON.stringify(result.repeatJudge))
          }
        }
        previous = trace
      }
    }
  },
})
