import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { installGameBattleAdapter } from './battle-game-adapter.mjs'
import { nextGameBattleKey } from './battle-game-input.mjs'
import { makeSpec, poisonCases } from './battle-poison-scenarios.mjs'
import { poisonSources, verifyPoisonSources } from './battle-poison-sources.mjs'
import { nextReforgeBattleKey } from './battle-reforge-input.mjs'
import { battleObserverScript } from './battle-trace-observer.mjs'
import { repoRoot, runBrowserJourney } from './browser-journey.mjs'
import { writeEvidenceArtifact } from './evidence-artifact.mjs'
import { pressRecordedKey } from './input-ledger.mjs'

const [engine, selector = 'all', mode] = process.argv.slice(2)
assert(
  ['game', 'reforge'].includes(engine),
  'usage: node scripts/e2e/battle-poison-items.mjs game|reforge [all|GROUP|CASE[,CASE]] [--capture]',
)
assert(mode === undefined || mode === '--capture', 'unknown poison runner option')
const selected = poisonCases(selector)
assert(!mode || selected.length === 1, 'audio review captures one real case')
const premises = await verifyPoisonSources(repoRoot)
const nextKey = engine === 'game' ? nextGameBattleKey : nextReforgeBattleKey
const semantic = ({ turn, actorId, actorSide, kind, itemId, skillId, targetId, targetSide }) => ({
  turn,
  actorId,
  ...(actorSide ? { actorSide } : {}),
  kind,
  ...(itemId ? { itemId } : {}),
  ...(skillId ? { skillId } : {}),
  targetId,
  ...(targetSide ? { targetSide } : {}),
})
const paint = (page) =>
  page.evaluate(
    () => new Promise((done) => requestAnimationFrame(() => requestAnimationFrame(done))),
  )
const sources = [...poisonSources, 'scripts/e2e/battle-poison-compare.mjs']

await runBrowserJourney({
  name: `q2-poison-boundaries-${engine}-${selector.replaceAll(',', '-')}`,
  packageName: `@type-pal/${engine}`,
  traceConfig: `scripts/e2e/battle-${engine}.config.mts`,
  environment: { E2E: '1', Q2_COUNTER: 'none' },
  arguments: ['--headless', ...(mode ? [mode] : [])],
  viewport: { width: 960, height: 720 },
  journeyTimeoutMs: 420_000,
  sources: [...(await battleFoundationInputSources(repoRoot)), ...sources],
  initScripts: engine === 'game' ? [installGameBattleAdapter] : [],
  async journey({ newPage, baseURL, out, report, until, health, capture }) {
    Object.assign(report, { engine, lane: 'Q2', counter: 'none', selector, premises })
    report.cases = []
    const failures = []
    for (const scenario of selected) {
      const { label, seed, commands, focus } = scenario
      const spec = makeSpec(scenario)
      const result = { label, configured: spec, planned: commands, focus }
      report.cases.push(result)
      const page = await newPage(label)
      await page.addInitScript(
        battleObserverScript({
          engine,
          scenarioId: spec.id,
          runId: label,
          random: { seed, algorithm: 'mulberry32' },
          observeMagicOverlays: true,
        }),
      )
      const read = () => page.evaluate(() => globalThis.__battleHarness?.read())
      try {
        await page.goto(baseURL + (engine === 'game' ? '/?skip-intro=1' : '/q2-battle.html'))
        await until(read, (current) => current?.ready, 'native battle readiness', 60_000)
        if (engine === 'game') {
          const reject = page.getByRole('button', { name: '拒绝', exact: true })
          if (await reject.isVisible()) {
            await reject.click()
            report.events.push({ kind: 'bootstrap-consent', runId: label, choice: 'denied' })
          }
          if (capture.enabled) await page.locator('#boot-loading').waitFor({ state: 'detached' })
        }
        await page.evaluate((input) => globalThis.__battleHarness.launch(input), spec)
        const initial = await until(
          read,
          (current) => current?.snapshot,
          'native fixture state',
          60_000,
        )
        if (capture.enabled) {
          report.fragment = `q2-poison-${label}`
          report.predecessor = { kind: 'battle-fixture', setup: spec }
          await capture.arm(page, {
            event: 'battle-fixture-ready',
            runId: label,
            state: initial.snapshot,
          })
        }
        let acknowledged = false
        let active = 0
        const started = Date.now()
        for (;;) {
          health()
          const current = await read()
          const commandIndex = Array.isArray(current.commands)
            ? current.commands.length
            : current.commands
          if (current.terminal) {
            if (capture.enabled)
              await capture.finish(page, {
                event: 'battle-result',
                runId: label,
                state: current.terminal,
              })
            break
          }
          assert(!current.failure && !current.errors?.length, JSON.stringify(current))
          if (!current.busy && current.phase === 'selectAction' && !commands[commandIndex])
            throw new Error(
              'Unplanned round: ' +
                JSON.stringify({
                  turn: current.turn,
                  commandIndex,
                  phase: current.phase,
                  selector: current.selectingPlayerId,
                  snapshot: current.snapshot,
                }),
            )
          assert(Date.now() - started < 35_000, JSON.stringify({ commandIndex, current }))
          // In Reforge a confirm remains readable until the settlement card advances.
          // Keep the established driver for menus and cap repeats to the visible card transition.
          const settlement = engine === 'reforge' && current.canConfirmSettlement
          const clock = Date.now()
          if (!settlement) acknowledged = false
          const key = nextKey(current, commands[commandIndex])
          if (key && (!settlement || !acknowledged || clock >= active)) {
            if (settlement) {
              acknowledged = true
              active = clock + 300
            }
            await pressRecordedKey({
              keyboard: page.keyboard,
              action: { key, phase: 'battle', scope: 'story', context: label, commandIndex },
              record: (input) => report.actions.push(input),
            })
          }
          await paint(page)
        }
      } catch (error) {
        result.failure = String(error)
        failures.push(`${label}: ${result.failure}`)
        await page.screenshot({ path: resolve(out, `${label}-failure.png`) }).catch(() => {})
      } finally {
        const trace = await page.evaluate(() => globalThis.__battleEvidence?.read())
        if (trace) {
          result.trace = await writeEvidenceArtifact(out, `${label}-trace.json`, trace)
          const actualCommands = trace.commands.map(semantic)
          const actualActions = trace.actions.map(semantic)
          if (trace.errors.length || trace.overflow)
            failures.push(`${label}: trace errors ${JSON.stringify(trace.errors)}`)
          if (!trace.terminal) failures.push(`${label}: incomplete terminal`)
          if (
            !actualCommands.every(
              (command, index) =>
                JSON.stringify(command) === JSON.stringify(semantic(commands[index] ?? {})),
            )
          )
            failures.push(
              `${label}: native command sequence diverged ${JSON.stringify(actualCommands)}`,
            )
          for (const index of focus) {
            const desired = semantic(commands[index])
            if (
              !actualActions.some((command) => JSON.stringify(command) === JSON.stringify(desired))
            )
              failures.push(`${label}: did not execute focused input ${JSON.stringify(desired)}`)
          }
          console.log(
            `[${engine}] ${label}: ${trace.actions.length} actions, ${trace.terminal?.result ?? 'no settlement'}`,
          )
        }
        await page.close()
      }
    }
    assert.deepEqual(failures, [])
  },
})
