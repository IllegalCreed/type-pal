import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { basename, dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isDeepStrictEqual as same } from 'node:util'
import { battleFoundationInputSources } from './battle-foundation-scenarios.mjs'
import { checkStatusRules } from './battle-status-rules.mjs'
import {
  battleStatusCases,
  battleStatusSources,
  prepareBattleStatusInputs,
} from './battle-status-scenarios.mjs'
import { projectBattleBusinessTrace, validateRecording } from './battle-trace-contract.mjs'
import { repoRoot } from './browser-journey.mjs'
import { readEvidenceArtifact, writeEvidenceArtifact } from './evidence-artifact.mjs'
import { assertDependencyClosure, recordingDependencies } from './evidence-dependencies.mjs'
import { assertInputLedger } from './input-ledger.mjs'

const entry = 'scripts/e2e/battle-status.mjs'
const judges = ['scripts/e2e/battle-status-compare.mjs', 'scripts/e2e/battle-status-rules.mjs']
const git = (...args) => execFileSync('git', args, { cwd: repoRoot })
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const rng = ({ index, value, purpose, queue, target }) => ({ index, value, purpose, queue, target })
const input = ({ key, commandIndex }) => ({ key, commandIndex })
const runIds = (scenarios) => scenarios.flatMap(({ id }) => [`${id}-1`, `${id}-2`])

function firstDifference(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right)) return { expected: left, actual: right }
  for (let index = 0; index < Math.max(left.length, right.length); index++)
    if (!same(left[index], right[index]))
      return { index, expected: left[index] ?? null, actual: right[index] ?? null }
}

function comparePair(first, second) {
  const repeat = first.trace.engine === second.trace.engine
  assert(!repeat || first.trace.runId !== second.trace.runId, 'replay reused one context')
  const l = projectBattleBusinessTrace(first.trace)
  const r = projectBattleBusinessTrace(second.trace)
  const findings = []
  const observations = []
  const check = (rule, left, right) => {
    if (!same(left, right)) findings.push({ rule, ...firstDifference(left, right) })
  }
  for (const key of ['start', 'commands', 'actions', 'rounds']) check(key, l[key], r[key])
  check('equipped starting stats', first.initialPlayers, second.initialPlayers)
  check('battle random draw order', first.gameplayDraws, second.gameplayDraws)
  if (!repeat && first.id === 'confused-enemy-draws-self') {
    // The original bees have a separate post-battle script at SSS 41027.
    // Require its exact result while keeping the full settlement visible in the receipt.
    const { inventory, ...after } = l.terminal.after
    check(
      'bee reward follow-up',
      [inventory, r.terminal.after.inventory],
      [[{ itemId: '115', count: 1 }], []],
    )
    check(
      'terminal outside bee reward',
      { ...l.terminal, after: { ...after, inventory: [] } },
      r.terminal,
    )
    observations.push({
      rule: 'bee post-battle loot',
      game: inventory,
      reforge: r.terminal.after.inventory,
      source: 'SSS 41027–41031',
    })
  } else {
    check('terminal', l.terminal, r.terminal)
  }
  if (repeat) {
    const native = (trace) => trace.actions.map(({ native: detail, guard }) => ({ detail, guard }))
    check('native repeat actions', native(first.trace), native(second.trace))
    check('repeat rewards random draw order', first.rewardDraws, second.rewardDraws)
    check('repeat physical keys', first.inputs.map(input), second.inputs.map(input))
  } else {
    const expected =
      first.id === 'confused-enemy-draws-self'
        ? [35, 6]
        : first.id === 'confused-enemy-strikes-ally'
          ? [54, 80]
          : []
    check(
      'settlement random tail in Game',
      first.rewardDraws.map(({ purpose, value }) => [purpose, 1 + Math.floor(value * 100)]),
      expected.map((roll) => ['battle-script-chance', roll]),
    )
    check('settlement random tail in Reforge', second.rewardDraws, [])
  }
  return {
    case: first.id,
    first: first.trace.runId,
    second: second.trace.runId,
    findings,
    observations,
  }
}

async function readReport(path, engine, selector, scenarios, prepare, commonSources) {
  const absolute = resolve(path)
  const bytes = await readFile(absolute)
  const report = JSON.parse(bytes)
  assert.equal(report.engine, engine)
  assert.match(report.revision, /^[a-f0-9]{40}$/u, 'invalid producer revision')
  assert.equal(git('cat-file', '-t', report.revision).toString().trim(), 'commit')
  assert.equal(report.selector, selector)
  assert.equal(report.profile, 'verify')
  assert.equal(report.status, 'passed', 'native battle did not finish')
  assert.equal(report.counter, 'none')
  assert.equal(report.repeats, 2)
  assert.deepEqual(report.errors, [])
  const { definition } = report.dependencies
  assert.equal(definition.entry, entry)
  assert.equal(definition.packageName, engine)
  assert.equal(definition.traceConfig, `scripts/e2e/battle-${engine}.config.mts`)
  for (const source of commonSources)
    assert(definition.declared.includes(source), `missing source binding ${source}`)
  const current = await recordingDependencies(repoRoot, definition)
  assertDependencyClosure(report.dependencies, current)
  assert.deepEqual(report.hashes, report.dependencies.hashes)
  const drift = Object.keys(current.hashes).filter(
    (path) => report.hashes[path] !== current.hashes[path],
  )
  assert.deepEqual(drift, [], 'producer sources have changed')
  const changed = git('diff', '--name-only', '-z', report.revision, '--').toString().split('\0')
  assert.deepEqual(
    changed.filter((path) => Object.hasOwn(current.hashes, path)),
    [],
    'tracked producer bytes differ from the recording revision',
  )
  assertInputLedger(report.actions, { requireReceipts: true })
  assert.deepEqual(report.inputExecution, { status: 'passed', actions: report.actions.length })
  const ids = runIds(scenarios)
  assert.deepEqual(
    report.contexts,
    ids.map((label) => ({ label, initialDatabases: [] })),
  )
  assert.deepEqual(
    report.cases.map(({ runId }) => runId),
    ids,
  )
  assert(
    report.actions.every(({ context }) => ids.includes(context)),
    'unbound physical input',
  )
  const runs = []
  for (const [index, result] of report.cases.entries()) {
    const scenario = scenarios[Math.floor(index / 2)]
    const configured = prepare(scenario)
    assert.equal(result.id, scenario.id)
    assert.deepEqual(result.configured, configured)
    const artifact = await readEvidenceArtifact(dirname(absolute), result.trace)
    assert.equal(artifact.binding.status, 'verified')
    const trace = artifact.value
    assert.equal(trace.engine, engine)
    assert.equal(trace.runId, result.runId)
    validateRecording(trace, {
      id: configured.id,
      random: { algorithm: 'mulberry32', seed: scenario.seed },
    })
    assert.deepEqual(
      result.initial.snapshot,
      trace.start.state,
      'runner start differs from native trace',
    )
    const terminal = {
      result: trace.terminal.result,
      settlementCount: trace.terminal.settlementCount,
      after: trace.terminal.after,
    }
    assert.deepEqual(result.terminal, terminal, 'runner terminal receipt differs from native trace')
    const inputs = report.actions.filter(({ context }) => context === result.runId)
    const lastAction = trace.actions.at(-1).order
    const gameplayDraws = trace.randomDraws.filter(({ order }) => order < lastAction).map(rng)
    const rewardDraws = trace.randomDraws.filter(({ order }) => order > lastAction).map(rng)
    const rules = checkStatusRules(trace, scenario, configured, inputs, result.silenceMenuProbe)
    assert.equal(result.initial.nativePlayers.length, configured.party.length)
    const initialPlayers = result.initial.nativePlayers.map(
      ({ gameRole: _gameRole, ...player }) => player,
    )
    runs.push({
      id: scenario.id,
      trace,
      inputs,
      initialPlayers,
      gameplayDraws,
      rewardDraws,
      rules,
      binding: result.trace,
    })
  }
  return { report: absolute, sha256: hash(bytes), revision: report.revision, engine, runs }
}

export async function compareStatusReports(gamePath, reforgePath, selector) {
  const scenarios = battleStatusCases(selector)
  const prepare = await prepareBattleStatusInputs()
  const judgeRevision = git('rev-parse', 'HEAD').toString().trim()
  const judgeHashes = {}
  for (const judge of judges) {
    judgeHashes[judge] = hash(await readFile(resolve(repoRoot, judge)))
    assert.equal(
      judgeHashes[judge],
      hash(git('show', `${judgeRevision}:${judge}`)),
      'commit the comparator before rejudging',
    )
  }
  const sources = [...(await battleFoundationInputSources(repoRoot)), ...battleStatusSources]
  const [game, reforge] = await Promise.all([
    readReport(gamePath, 'game', selector, scenarios, prepare, sources),
    readReport(reforgePath, 'reforge', selector, scenarios, prepare, sources),
  ])
  assert.equal(game.revision, reforge.revision, 'two recordings use different producer revisions')
  const paired = game.runs.map((run, index) => comparePair(run, reforge.runs[index]))
  const repeated = [game, reforge].flatMap(({ engine, runs }) =>
    runs
      .filter((_, index) => index % 2 === 0)
      .map((run, index) => ({
        engine,
        ...comparePair(run, runs[index * 2 + 1]),
      })),
  )
  const engines = [game, reforge].map(({ runs, ...report }) => ({
    ...report,
    runs: runs.map(({ id, trace, gameplayDraws, rewardDraws, rules, binding }) => ({
      id,
      runId: trace.runId,
      trace: binding,
      gameplayDraws: gameplayDraws.length,
      rewardDraws,
      ...rules,
    })),
  }))
  const findings = [
    ...engines.flatMap(({ engine, runs }) =>
      runs.flatMap(({ runId, findings: problems }) =>
        problems.map((problem) => ({ engine, runId, ...problem })),
      ),
    ),
    ...paired.flatMap(({ first, findings: problems }) =>
      problems.map((problem) => ({ runId: first, ...problem })),
    ),
    ...repeated.flatMap(({ engine, first, findings: problems }) =>
      problems.map((problem) => ({ engine, runId: first, ...problem })),
    ),
  ]
  return {
    schemaVersion: 1,
    selector,
    producerRevision: game.revision,
    judgeRevision,
    judgeHashes,
    status: findings.length ? 'rejected' : 'passed',
    engines,
    paired,
    repeated,
    findings,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [selector, game, reforge, path] = process.argv.slice(2)
  assert(
    selector && game && reforge && path,
    'usage: node scripts/e2e/battle-status-compare.mjs SELECTOR GAME_REPORT REFORGE_REPORT NEW_OUTPUT',
  )
  const result = await compareStatusReports(game, reforge, selector)
  const receipt = await writeEvidenceArtifact(dirname(resolve(path)), basename(path), result)
  console.log(
    JSON.stringify({ ...receipt, status: result.status, findings: result.findings.length }),
  )
  if (result.status !== 'passed') process.exitCode = 1
}
