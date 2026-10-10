import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { evidenceCounterexamples } from './evidence-counterexamples.mjs'
import {
  actorTransitions,
  compareNpcStateTraces,
  readNpcTrace,
} from './npc-transition-contract.mjs'

/** Re-run falsifiable defects against real captured callers, never a generated all-green trace. */
export function kitchenCounterexamples(game, reforge) {
  assert.deepEqual(
    compareNpcStateTraces(game, reforge, '003').findings,
    [],
    'counterexamples require a passing real baseline',
  )
  const body = (e) => e.occurrence?.command?.command
  const variants = [
    [
      'reforge wrong intermediate walking frame',
      (_g, r) => {
        const e = r.events.find(
          (e) => e.kind === 'actor-render' && e.id === 'e56' && e.state.frame === 4,
        )
        e.state.frame = 3
      },
    ],
    [
      'reforge lost actor draw span',
      (_g, r) => {
        r.events.splice(
          r.events.findIndex((e) => e.kind === 'actor-render' && e.id === 'e56'),
          1,
        )
      },
    ],
    [
      'reforge missing movement commit',
      (_g, r) => {
        const move = actorTransitions(r, 'e56', 's003').find(
          (e) => e.before && JSON.stringify(e.state.position) !== JSON.stringify(e.before.position),
        )
        r.events.splice(
          r.events.findIndex((e) => e.order === move.order),
          1,
        )
      },
    ],
    [
      'reforge changed auto hold duration',
      (_g, r) => {
        const e = r.causes.find(
          (e) => e.phase === 'wait-start' && e.occurrence?.self?.entity === 'e62',
        )
        e.ms += 100
      },
    ],
    [
      'reforge missing auto timer registration',
      (_g, r) => {
        r.causes.splice(
          r.causes.findIndex(
            (e) => e.phase === 'wait-start' && e.occurrence?.self?.entity === 'e62',
          ),
          1,
        )
      },
    ],
    [
      'reforge take consumed remaining time',
      (_g, r) => {
        r.causes.find((e) => e.phase === 'wait-pause').remainingMs = 0
      },
    ],
    [
      'reforge missing restore-boundary timer',
      (_g, r) => {
        const end = r.causes.find(
          (e) => e.phase === 'wait-end' && e.occurrence?.self?.entity === 'e62',
        )
        r.initialCauses.splice(
          r.initialCauses.findIndex((e) => e.phase === 'wait-start' && e.waitId === end.waitId),
          1,
        )
      },
    ],
    [
      'reforge wrong terminal cursor',
      (_g, r) => {
        r.causes.find((e) => e.phase === 'stage-settled' && e.self?.entity === 'e56').cursor = {
          kind: 'stage',
          stage: 'wrong',
        }
      },
    ],
    [
      'reforge stale terminal activation',
      (_g, r) => {
        r.causes.find((e) => e.phase === 'stage-settled').decision = 'stop'
      },
    ],
    [
      'reforge terminal belongs to another scene visit',
      (_g, r) => {
        r.causes.find((e) => e.phase === 'stage-settled').sceneVisit++
      },
    ],
    [
      'reforge missing portrait completion',
      (_g, r) => {
        r.causes.splice(
          r.causes.findIndex((e) => e.phase === 'io-end'),
          1,
        )
      },
    ],
    [
      'reforge portrait from another scene visit',
      (_g, r) => {
        r.causes.find((e) => e.phase === 'io-start').sceneVisit++
      },
    ],
    [
      'game missing interior automatic invocation',
      (g) => {
        // The first scoped invocation has no preceding receipt. Break a captured
        // before/after chain, not an unobserved initialization boundary.
        const calls = g.causes.filter((e) => e.phase === 'auto-step' && e.actor === 62)
        const target = calls.find((e, index) => index > 0 && e.before.idle === 4)
        assert(target, 'counter requires an interior automatic invocation')
        g.causes.splice(
          g.causes.findIndex((e) => e.order === target.order),
          1,
        )
      },
    ],
    [
      'game actual ambient frame detached from source auto',
      (g) => {
        g.events.find(
          (e) => e.kind === 'actor-render' && e.id === 'e62' && e.state.frame === 0,
        ).state.frame = 1
      },
    ],
    [
      'game coherent but unauthored turn-point leg lift',
      (g) => {
        const a = g.events.filter((e) => e.kind === 'actor' && e.id === 'e56')
        const at = a.findIndex((e) => e.source === 'observe:causal' && e.state.autoIp === 387)
        const from = a[at].order,
          to = a[at + 1].order
        a[at].state.localFrame = 1
        a[at].state.frame = 4
        a[at + 1].before.localFrame = 1
        a[at + 1].before.frame = 4
        for (const e of g.events.filter(
          (e) => e.kind === 'actor-render' && e.id === 'e56' && e.order > from && e.order < to,
        ))
          e.state.frame = 4
        for (const e of g.causes.filter((e) => e.order > from && e.order < to)) {
          if (e.poses?.e56) {
            e.poses.e56.state.frame = 4
            e.poses.e56.state.localFrame = 1
          }
        }
      },
    ],
    [
      'game ambient hold coherently changed in both actor and draw',
      (g) => {
        const steps = g.causes.filter((e) => e.phase === 'auto-step' && e.actor === 62)
        const start = steps.find((e) => e.before.ip === 737)
        const finish = steps.find((e) => e.order > start.order && e.before.ip === 735)
        assert(start && finish)
        for (const e of g.events.filter(
          (e) => e.id === 'e62' && e.order >= start.order && e.order < finish.order,
        )) {
          if (e.kind === 'actor') {
            e.state.localFrame = 1
            e.state.frame = 1
            if (e.before) {
              e.before.localFrame = 1
              e.before.frame = 1
            }
          }
          if (e.kind === 'actor-render' && e.state.frame !== null) e.state.frame = 1
        }
        for (const e of g.causes.filter(
          (e) => e.order >= start.order && e.order < finish.order && e.poses?.e62,
        )) {
          e.poses.e62.state.frame = 1
          e.poses.e62.state.localFrame = 1
        }
      },
    ],
    [
      'reforge missing whole authored dialogue',
      (_g, r) => {
        const cmd = r.causes.find((e) => e.phase === 'command' && body(e)?.kind === 'dialog')
        r.causes = r.causes.filter(
          (e) => e.occurrence?.id !== cmd.occurrence.id || e.runId !== cmd.runId,
        )
      },
    ],
  ]
  // Non-wait endings must not bypass the same successful-run receipt required by waits.
  for (const [actor, timing] of [
    ['e47', 'interactive'],
    ['e56', 'interactive'],
    ['e19', 'interactive'],
    ['e62', 'interactive'],
    ['e56', 'auto'],
  ]) {
    const find = (r, phase) =>
      r.causes.find(
        (e) =>
          e.phase === phase &&
          e.occurrence?.self?.entity === actor &&
          e.occurrence?.timing === timing,
      )
    variants.push(
      [
        `${actor}/${timing} stopped terminal`,
        (_g, r) => {
          find(r, 'stage-settled').decision = 'stop'
        },
      ],
      [
        `${actor}/${timing} missing successful end`,
        (_g, r) => {
          r.causes.splice(r.causes.indexOf(find(r, 'run-ended')), 1)
        },
      ],
      [
        `${actor}/${timing} aborted successful end`,
        (_g, r) => {
          find(r, 'run-ended').aborted = true
        },
      ],
    )
  }
  variants.push([
    'stair repeat lost an executed body command',
    (_g, r) => {
      const i = r.causes.findIndex(
        (e) =>
          e.phase === 'command' &&
          e.occurrence?.self?.entity === 'e47' &&
          e.occurrence.path.length > 2,
      )
      r.causes.splice(i, 1)
    },
  ])
  for (const phase of ['stage-settled', 'run-ended']) {
    for (const [field, corrupt] of [
      [
        'occurrence',
        (e) => {
          e.occurrence.id++
        },
      ],
      [
        'engine',
        (e) => {
          e.engine = 'game'
        },
      ],
      [
        'scene',
        (e) => {
          e.scene = 's003'
        },
      ],
      [
        'visit',
        (e) => {
          e.sceneVisit++
        },
      ],
      [
        'clock',
        (e) => {
          e.clock.frameId++
        },
      ],
    ])
      variants.push([
        `e19 ${phase} wrong ${field}`,
        (_g, r) => {
          corrupt(r.causes.find((e) => e.phase === phase && e.occurrence?.self?.entity === 'e19'))
        },
      ])
    variants.push([
      `e19 duplicated ${phase}`,
      (_g, r) => {
        const i = r.causes.findIndex(
          (e) => e.phase === phase && e.occurrence?.self?.entity === 'e19',
        )
        r.causes.splice(i, 0, structuredClone(r.causes[i]))
      },
    ])
  }
  variants.push([
    'e19 successful end after its first available draw',
    (_g, r) => {
      const end = r.causes.find(
        (e) => e.phase === 'run-ended' && e.occurrence?.self?.entity === 'e19',
      )
      end.order = r.worldRenders.find((e) => e.order > end.order).order + 1
    },
  ])
  return [
    ...evidenceCounterexamples(game, reforge, '003'),
    ...variants.map(([name, mutate]) => {
      const a = structuredClone(game),
        b = structuredClone(reforge)
      mutate(a, b)
      let errors
      try {
        const result = compareNpcStateTraces(a, b, '003')
        errors = [
          ...result.kitchenTiming.errors,
          ...result.findings.map((e) => `${e.id ?? ''}:${e.field ?? e.type}`),
        ]
      } catch (error) {
        errors = [error.message]
      }
      assert(errors.length, `comparator missed counterexample: ${name}`)
      return { name, status: 'rejected', errors }
    }),
  ]
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = process.argv.slice(2)
  assert.equal(
    args.length,
    3,
    'usage: kitchen-counterexamples.mjs GAME_REPORT REFORGE_REPORT OUTPUT_JSON',
  )
  const [game, reforge] = await Promise.all(args.slice(0, 2).map(readNpcTrace))
  const hash = async (path) =>
    createHash('sha256')
      .update(await readFile(path))
      .digest('hex')
  const results = kitchenCounterexamples(game.trace, reforge.trace)
  const report = {
    status: 'passed',
    inputs: await Promise.all(
      args.slice(0, 2).map(async (path) => ({ path, sha256: await hash(path) })),
    ),
    results,
  }
  await writeFile(args[2], `${JSON.stringify(report, null, 2)}\n`, { flag: 'wx' })
  console.log(
    `003 real-trace counterexamples: ${results.length}/${results.length} rejected; ${args[2]}`,
  )
}
