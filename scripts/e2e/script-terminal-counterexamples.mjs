import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { assertCounterBaseline, evidenceCounterexamples } from './evidence-counterexamples.mjs'
import { compareNpcStateTraces, readNpcTrace } from './npc-transition-contract.mjs'

/** Break real captured finite runs, including the intentionally superseded reception trigger. */
export function terminalCounterexamples(game, reforge, fragment) {
  assert(['001', '002'].includes(fragment), 'terminal counter scope must be 001 or 002')
  const baseline = compareNpcStateTraces(game, reforge, fragment)
  assertCounterBaseline(baseline)
  const terminals = (baseline.holdIntent ?? baseline.innTiming).terminals
  assert.equal(terminals.length, fragment === '001' ? 2 : 5)
  const variants = []
  for (const receipt of terminals) {
    for (const phase of ['stage-settled', 'run-ended'])
      variants.push([
        `run${receipt.runId} missing ${phase}`,
        (r) => {
          r.causes = r.causes.filter((e) => !(e.runId === receipt.runId && e.phase === phase))
        },
      ])
    variants.push([
      `run${receipt.runId} wrong ownership decision`,
      (r) => {
        r.causes.find((e) => e.order === receipt.terminal).decision =
          receipt.decision === 'stop' ? 'continue' : 'stop'
      },
    ])
  }
  const target = terminals.at(-1)
  for (const [name, mutate] of [
    [
      'aborted end',
      (e) => {
        e.aborted = true
      },
    ],
    [
      'end with wrong occurrence',
      (e) => {
        e.occurrence.id++
      },
    ],
    [
      'end with wrong visit',
      (e) => {
        e.sceneVisit++
      },
    ],
    [
      'end with wrong ready clock',
      (e) => {
        e.clock.frameId++
      },
    ],
    [
      'end after first available draw',
      (e) => {
        e.order = target.draw + 1
      },
    ],
  ])
    variants.push([name, (r) => mutate(r.causes.find((e) => e.order === target.ended))])
  if (fragment === '002') {
    const replacement = reforge.causes.find((e) => {
      const c = e.occurrence?.command?.command
      return (
        e.phase === 'command' &&
        c?.kind === 'selectEntityBehavior' &&
        c.target.entity === 'e56' &&
        c.channel === 'trigger'
      )
    })
    assert(replacement, 'real reception replacement not recorded')
    const oldEnd = terminals.find((e) => e.decision === 'stop')
    for (const [name, change] of [
      [
        'replacement target',
        (e) => {
          e.occurrence.command.command.target.entity = 'e59'
        },
      ],
      [
        'replacement channel',
        (e) => {
          e.occurrence.command.command.channel = 'auto'
        },
      ],
      [
        'replacement behavior',
        (e) => {
          e.occurrence.command.command.selection.value = 'default'
        },
      ],
      [
        'late replacement',
        (e) => {
          e.order = oldEnd.terminal + 1
        },
      ],
    ])
      variants.push([name, (r) => change(r.causes.find((e) => e.order === replacement.order))])
    variants.push([
      'missing replacement',
      (r) => {
        r.causes = r.causes.filter((e) => e.order !== replacement.order)
      },
    ])
  }
  return [
    ...evidenceCounterexamples(game, reforge, fragment),
    ...variants.map(([name, mutate]) => {
      const changed = structuredClone(reforge)
      mutate(changed)
      const comparison = compareNpcStateTraces(game, changed, fragment)
      assert(
        (comparison.holdIntent ?? comparison.innTiming).errors.length > 0,
        `terminal obligation missed counterexample: ${fragment} ${name}`,
      )
      return {
        name,
        status: 'rejected',
        errors: (comparison.holdIntent ?? comparison.innTiming).errors,
      }
    }),
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [fragment, gamePath, reforgePath, output, ...extra] = process.argv.slice(2)
  assert(
    fragment && gamePath && reforgePath && output && !extra.length,
    'usage: script-terminal-counterexamples.mjs FRAGMENT GAME_REPORT REFORGE_REPORT OUTPUT_JSON',
  )
  const [game, reforge] = await Promise.all([gamePath, reforgePath].map(readNpcTrace))
  const results = terminalCounterexamples(game.trace, reforge.trace, fragment)
  const inputs = await Promise.all(
    [gamePath, reforgePath].map(async (path) => ({
      path,
      sha256: createHash('sha256')
        .update(await readFile(path))
        .digest('hex'),
    })),
  )
  await writeFile(
    output,
    `${JSON.stringify({ status: 'passed', fragment, inputs, results }, null, 2)}\n`,
    { flag: 'wx' },
  )
  console.log(
    `${fragment} real-trace terminal counters: ${results.length}/${results.length} rejected; ${output}`,
  )
}
