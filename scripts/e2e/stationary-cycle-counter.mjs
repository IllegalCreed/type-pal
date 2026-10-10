import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { verifyClosedAutomaticCycle } from './closed-automatic-cycle.mjs'
import { verifyInnGamePresentation } from './inn-presentation-intent.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import {
  actorTransitions,
  canonicalPosition,
  movementTransitions,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'
import { verifyStationaryAutomaticCycle } from './stationary-automatic-cycle.mjs'
import { verifyStoryMotion } from './story-motion-contract.mjs'
import { verifyStoryPoses } from './story-pose-contract.mjs'
import { storyProofPrefix } from './story-presentation-intent.mjs'

// Opt-in mutation experiment on real, independently recorded raw evidence.
// This diagnostic cannot publish acceptance or replace a fresh recording.
const { values } = parseArgs({
  options: {
    game: { type: 'string' },
    reforge: { type: 'string' },
    comparison: { type: 'string' },
    moving: { type: 'boolean', default: false },
  },
})
assert(values.game && values.reforge && values.comparison, 'three actual evidence paths required')
const [gameEvidence, reforgeEvidence, comparisonBytes] = await Promise.all([
    readNpcTrace(values.game),
    readNpcTrace(values.reforge),
    readFile(values.comparison),
  ]),
  comparison = JSON.parse(comparisonBytes),
  game = storyProofPrefix(gameEvidence.trace, gameEvidence.rawTrace),
  reforge = storyProofPrefix(reforgeEvidence.trace, reforgeEvidence.rawTrace)
assert.equal(comparison.npc.storyTiming.status, 'passed', 'actual presentation bridge prerequisite')
for (const [engine, path] of [
  ['game', values.game],
  ['reforge', values.reforge],
])
  assert.equal(
    comparison.children.find((child) => child.engine === engine && child.case === 'story')?.report,
    resolve(path),
    'comparison belongs to another raw recording',
  )
const language = comparison.npc.storyTiming.automaticLanguages
assert.equal(language.status, 'proved')
const motion = values.moving
    ? verifyStoryMotion(
        reforge,
        verifyMotionSlotLifetimes(reforge.causes),
        language.bindings,
        movementTransitions,
        verifyRuntimeHandoffs(reforge),
      )
    : [],
  receipts = { motion },
  verify = values.moving ? verifyClosedAutomaticCycle : verifyStationaryAutomaticCycle
let binding, baseline
for (const candidate of language.bindings) {
  try {
    baseline = verify(game, reforge, candidate, receipts)
    binding = candidate
    break
  } catch {
    /* An unsupported binding has no mutation credit. */
  }
}
assert(binding, 'no actual self-cycle candidate')
const actor = binding.entity,
  id = Number(actor.slice(1)),
  first = game.causes.find((e) => e.order === baseline.sourceSeed),
  start = reforge.causes.find(
    (e) => e.runId === binding.runs[0].runId && e.phase === 'run-started',
  ),
  sourceInitial = game.events.findLast(
    (e) => e.kind === 'actor' && e.id === actor && e.order < first.order,
  ),
  authoredInitial = reforge.events.findLast(
    (e) => e.kind === 'actor' && e.id === actor && e.order < start.order,
  )
const cases = [
  [
    'source activation position',
    (g) => {
      const changed = structuredClone(first)
      changed.before.position[0] += 4
      g.causes = g.causes.map((e) => (e === first ? changed : e))
    },
  ],
  [
    'borrowed old authored seed',
    (_g, r) => {
      const newer = structuredClone(authoredInitial)
      newer.order = start.order - 0.5
      newer.state.frameDebug.override = 1
      r.events = [...r.events, newer].sort((a, b) => a.order - b.order)
    },
  ],
  [
    'actual authored activation frame',
    (_g, r) => {
      const newer = structuredClone(authoredInitial)
      newer.order = start.order - 0.5
      newer.state.frameDebug.override = 1
      const run = structuredClone(start)
      run.poses[actor] = { state: newer.state, commitOrder: newer.order }
      r.events = [...r.events, newer].sort((a, b) => a.order - b.order)
      r.causes = r.causes.map((e) => (e === start ? run : e))
    },
  ],
  [
    'unproved actual continuation',
    (_g, r) => {
      const resumed = reforge.causes.find((e) => e.phase === 'run-started' && e.resume)
      assert(resumed, 'recording lacks a real continuation counter input')
      const changed = structuredClone(start)
      changed.resume = structuredClone(resumed.resume)
      r.causes = r.causes.map((e) => (e === start ? changed : e))
    },
  ],
  [
    'second active visit',
    (_g, _r, b) => {
      b.draws.at(-1).sceneVisit++
    },
  ],
  [
    'omitted source call',
    (_g, _r, b) => {
      b.sourceCalls.pop()
    },
  ],
  [
    'omitted leaf',
    (_g, _r, b) => {
      b.runs[0].leaves.pop()
    },
  ],
  [
    'omitted draw',
    (_g, _r, b) => {
      b.draws.pop()
    },
  ],
  [
    'duplicate draw',
    (_g, _r, b) => {
      b.draws.push(structuredClone(b.draws.at(-1)))
    },
  ],
  [
    'duplicate call',
    (_g, _r, b) => {
      b.sourceCalls.push(structuredClone(b.sourceCalls.at(-1)))
    },
  ],
  [
    'duplicate leaf',
    (_g, _r, b) => {
      b.runs[0].leaves.push(structuredClone(b.runs[0].leaves.at(-1)))
    },
  ],
  [
    'missing actual setter',
    (_g, r) => {
      const setter = r.causes.find(
        (e) =>
          e.phase === 'command' &&
          e.runId === start.runId &&
          e.occurrence?.command?.command?.kind === 'setEntityFrame',
      )
      r.causes = r.causes.filter((e) => e !== setter)
    },
  ],
  [
    'wrong actual waiting duration',
    (_g, r) => {
      const wait = r.causes.find(
          (e) =>
            e.phase === 'command' &&
            e.runId === start.runId &&
            e.occurrence?.command?.command?.kind === 'wait',
        ),
        changed = structuredClone(wait)
      changed.occurrence.command.command.ms += 100
      r.causes = r.causes.map((e) => (e === wait ? changed : e))
    },
  ],
  [
    'outside selector',
    (_g, r) => {
      const selector = r.causes.find(
          (e) =>
            e.phase === 'command' &&
            e.occurrence?.command?.command?.kind === 'selectEntityBehavior',
        ),
        changed = structuredClone(selector)
      changed.occurrence.command.command.target = { scene: binding.scene, entity: actor }
      r.causes = r.causes.map((e) => (e === selector ? changed : e))
    },
  ],
  [
    'outside authority',
    (_g, r) => {
      const authority = r.causes.find((e) => e.phase === 'authority-changed'),
        changed = structuredClone(authority)
      changed.actor = actor
      changed.scene = binding.scene
      r.causes = r.causes.map((e) => (e === authority ? changed : e))
    },
  ],
  [
    'outside source writer',
    (g) => {
      const writer = g.causes.find((e) => e.phase === 'command' && e.command?.opcode === 135),
        changed = structuredClone(writer)
      changed.actor = id
      changed.currentEventObjectId = id
      changed.channel = 'trigger'
      g.causes = g.causes.map((e) => (e === writer ? changed : e))
    },
  ],
]
if (values.moving) {
  const sourceTerminal = actorTransitions(game, actor, binding.scene)
      .filter((event) => event.sceneVisit === baseline.sourceVisit)
      .at(-1),
    authoredTerminal = actorTransitions(reforge, actor, binding.scene)
      .filter((event) => event.sceneVisit === baseline.authoredVisit)
      .at(-1),
    terminalMutation = (trace, terminal, mutate) => {
      const actual = trace.events.find(
          (event) => event.order === terminal.order && event.kind === 'actor',
        ),
        changed = structuredClone(actual)
      assert(actual, 'actual terminal counter input missing')
      mutate(changed.state)
      trace.events = trace.events.map((event) => (event === actual ? changed : event))
    }
  const firstStep = motion.find(
      (route) => route.actor === actor && route.scene === binding.scene && route.commits.length,
    ),
    sourceStep = game.causes.find(
      (event) =>
        event.phase === 'auto-step' &&
        event.actor === id &&
        event.scene === binding.scene &&
        JSON.stringify(event.before.position) !== JSON.stringify(event.after.position),
    )
  assert(firstStep && sourceStep, 'actual displacement counter inputs missing')
  const changeRoute = (proofs, mutate) => {
    const changed = structuredClone(firstStep)
    mutate(changed)
    proofs.motion = proofs.motion.map((route) => (route === firstStep ? changed : route))
  }
  cases.push(
    [
      'uncaused authored intermediate facing',
      (_g, r) => {
        const observed = r.events.find(
          (event) =>
            event.kind === 'actor' &&
            event.id === actor &&
            event.scene === binding.scene &&
            event.order > start.order &&
            event.order < firstStep.registration.order,
        )
        assert(observed, 'actual authored intermediate observation missing')
        terminalMutation(r, observed, (state) => {
          state.facing = 'up'
        })
      },
    ],
    [
      'uncaused source intermediate facing',
      (g) => {
        const observed = g.events.find(
          (event) =>
            event.kind === 'actor' &&
            event.id === actor &&
            event.scene === binding.scene &&
            event.order > first.order &&
            event.order < sourceStep.order,
        )
        assert(observed, 'actual source intermediate observation missing')
        terminalMutation(g, observed, (state) => {
          state.facing = 'up'
        })
      },
    ],
    [
      'changed outgoing cached facing',
      (_g, r) => {
        const tail = r.events.findLast(
          (event) =>
            event.kind === 'actor' &&
            event.id === actor &&
            event.scene === binding.scene &&
            event.sceneVisit !== baseline.authoredVisit,
        )
        assert(tail, 'actual outgoing cached observation missing')
        terminalMutation(r, tail, (state) => {
          state.facing = state.facing === 'up' ? 'down' : 'up'
        })
      },
    ],
    [
      'borrowed source invocation',
      (g) => {
        const command = g.causes.find(
            (event) => event.phase === 'command' && event.autoCallId === sourceStep.autoCallId,
          ),
          changed = structuredClone(command)
        assert(command, 'actual source command counter missing')
        changed.autoCallId++
        g.causes = g.causes.map((event) => (event === command ? changed : event))
      },
    ],
    [
      'unknown terminal frame priority',
      (_g, r) =>
        terminalMutation(r, authoredTerminal, (state) => {
          delete state.frameDebug.override
        }),
    ],
    [
      'source terminal facing',
      (g) =>
        terminalMutation(g, sourceTerminal, (state) => {
          state.facing = state.facing === 'up' ? 'down' : 'up'
        }),
    ],
    [
      'source terminal current frame',
      (g) =>
        terminalMutation(g, sourceTerminal, (state) => {
          state.frame = (state.frame + 1) % 4
        }),
    ],
    [
      'authored terminal facing',
      (_g, r) =>
        terminalMutation(r, authoredTerminal, (state) => {
          state.facing = state.facing === 'up' ? 'down' : 'up'
        }),
    ],
    [
      'authored terminal current frame',
      (_g, r) =>
        terminalMutation(r, authoredTerminal, (state) => {
          if (state.frameDebug.gait !== null) state.frameDebug.gait++
          else if (state.frameDebug.explicit !== null) state.frameDebug.explicit++
          else state.frameDebug.override = 1
        }),
    ],
    [
      'wrong source directional layout',
      (g) => {
        const changed = structuredClone(sourceStep)
        changed.after.layout = 3
        g.causes = g.causes.map((event) => (event === sourceStep ? changed : event))
      },
    ],
    [
      'missing source displacement',
      (g) => {
        const changed = structuredClone(sourceStep)
        changed.after.position = [...changed.before.position]
        g.causes = g.causes.map((event) => (event === sourceStep ? changed : event))
      },
    ],
    [
      'extra source displacement',
      (g) => {
        const changed = structuredClone(sourceStep)
        changed.after.position = changed.after.position.map(
          (value, index) => value + (value - changed.before.position[index]),
        )
        g.causes = g.causes.map((event) => (event === sourceStep ? changed : event))
      },
    ],
    [
      'wrong source animation phase',
      (g) => {
        const changed = structuredClone(sourceStep)
        changed.after.frame = (changed.after.frame + 1) % 4
        g.causes = g.causes.map((event) => (event === sourceStep ? changed : event))
      },
    ],
    [
      'wrong admitted slot origin',
      (_g, _r, _b, proofs) =>
        changeRoute(proofs, (route) => {
          route.registration.poses[actor].state.position[0] += 0.25
        }),
    ],
    [
      'double actual slot stride',
      (_g, _r, _b, proofs) =>
        changeRoute(proofs, (route) => {
          route.commits[0].to[0] += route.commits[0].to[0] - route.commits[0].from[0]
          route.commits[0].to[1] += route.commits[0].to[1] - route.commits[0].from[1]
        }),
    ],
    [
      'dropped automatic slot',
      (_g, _r, b) => {
        b.runs[0].leaves.find((leaf) => leaf.slot === firstStep.slotId).slot = 'droppedByAuthority'
      },
    ],
    [
      'uncommitted step projected as completed',
      (_g, _r, _b, proofs) =>
        changeRoute(proofs, (route) => {
          route.commits = []
        }),
    ],
  )
}
assert(sourceInitial, 'source root missing')
for (const [name, mutate] of cases) {
  const g = { ...game },
    r = { ...reforge },
    b = structuredClone(binding),
    changedReceipts = { ...receipts }
  mutate(g, r, b, changedReceipts)
  assert.throws(() => verify(g, r, b, changedReceipts), assert.AssertionError, name)
  console.log(`rejected: ${name}`)
}
// The formal certificate caller first recomputes actual presentation. Exercise
// that same real draw gate rather than feed a forged previously-passed proof.
const resources = await checkSpriteResources(reforgeEvidence.trace, 'reforge', resolve('.'))
assert.equal(resources.status, 'proved')
const verifyDraws = (r) =>
  verifyStoryPoses(
    r,
    [{ scene: binding.scene, entity: actor }],
    motion.filter((route) => route.actor === actor && route.scene === binding.scene),
    { projections: [] },
    { frames: [] },
    resources.frameCounts,
    renderedPoseEvidence,
    actorTransitions,
  )
assert.equal(verifyDraws(reforge).actors[0].draws, baseline.reforgeDraws)
const draw = reforge.events.find(
    (e) =>
      e.kind === 'actor-render' &&
      e.id === actor &&
      e.scene === binding.scene &&
      e.state.frame !== null,
  ),
  changedDraw = structuredClone(draw)
changedDraw.state.frame = changedDraw.state.frame === 0 ? 1 : 0
assert.throws(
  () =>
    verifyDraws({ ...reforge, events: reforge.events.map((e) => (e === draw ? changedDraw : e)) }),
  /incorrect actual rendered frame/,
)
console.log('rejected: wrong actual Reforge draw')
const verifySourceDraws = (g) =>
  verifyInnGamePresentation(g, renderedPoseEvidence, actorTransitions, canonicalPosition, {
    scene: binding.scene,
    actors: [actor],
  })
assert.equal(verifySourceDraws(game)[0].draws, baseline.gameDraws)
const sourceDraw =
    game.events.find(
      (e) =>
        e.kind === 'actor-render' &&
        e.id === actor &&
        e.scene === binding.scene &&
        e.state.frame !== null,
    ) ??
    game.events.find(
      (e) => e.kind === 'actor-render' && e.id === actor && e.scene === binding.scene,
    ),
  changedSourceDraw = structuredClone(sourceDraw)
changedSourceDraw.state.frame = changedSourceDraw.state.frame === 0 ? 1 : 0
assert.throws(
  () =>
    verifySourceDraws({
      ...game,
      events: game.events.map((e) => (e === sourceDraw ? changedSourceDraw : e)),
    }),
  /unexplained actual frame/,
)
console.log('rejected: wrong actual Game draw')
let prefixCounters = 0
if (values.moving) {
  const slot = motion.find(
      (route) => route.actor === actor && route.scene === binding.scene && route.commits.length,
    ),
    through = slot.registration.order,
    prefixDraws = reforge.worldRenders.filter((event) => event.order <= through),
    prefixEvents = reforge.events
      .filter((event) => event.order <= through)
      .map((event) => {
        if (
          event.kind !== 'actor-render' ||
          event.throughRenderId === undefined ||
          event.throughOrder <= through
        )
          return event
        const clocks = prefixDraws.filter(
            (draw) => draw.renderId >= event.renderId && draw.renderId <= event.throughRenderId,
          ),
          last = clocks.at(-1)
        assert(last, 'actual span prefix has no retained world clock')
        return {
          ...event,
          throughRenderId: last.renderId,
          throughOrder: last.order,
          throughAtMs: last.atMs,
        }
      }),
    prefix = {
      ...reforge,
      renderScope: { ...reforge.renderScope, throughOrder: through },
      events: prefixEvents,
      causes: reforge.causes.filter((event) => event.order <= through),
      worldRenders: prefixDraws,
    },
    prefixMotion = verifyStoryMotion(
      prefix,
      verifyMotionSlotLifetimes(prefix.causes),
      [binding],
      movementTransitions,
      verifyRuntimeHandoffs(prefix),
    ),
    prefixBinding = structuredClone(binding)
  prefixBinding.draws = prefixBinding.draws.filter((draw) => draw.order <= through)
  prefixBinding.runs[0].outcome = 'proved-prefix'
  prefixBinding.runs[0].leaves = prefixBinding.runs[0].leaves
    .filter((leaf) => leaf.command <= through)
    .map((leaf) => ({ ...leaf, completed: leaf.completed > through ? null : leaf.completed }))
  const provedPrefix = verify(game, prefix, prefixBinding, { motion: prefixMotion })
  assert.equal(provedPrefix.steps, 1)
  assert.equal(
    provedPrefix.committedSteps,
    0,
    'actual pending-slot prefix must not invent displacement',
  )
  const terminal = prefix.events.findLast(
      (event) => event.kind === 'actor' && event.id === actor && event.scene === binding.scene,
    ),
    prematurelyMoved = structuredClone(terminal)
  prematurelyMoved.order = through - 0.25
  const dir = slot.registration.occurrence.command.command.dir,
    delta = { down: [0, 0.25], left: [-0.25, 0], up: [0, -0.25], right: [0.25, 0] }[dir]
  prematurelyMoved.state.position = prematurelyMoved.state.position.map(
    (value, index) => value + (delta[index] ?? 0),
  )
  assert.throws(
    () =>
      verify(
        game,
        {
          ...prefix,
          events: [...prefix.events, prematurelyMoved].sort((a, b) => a.order - b.order),
        },
        prefixBinding,
        { motion: prefixMotion },
      ),
    /terminal position advances an uncommitted step/,
  )
  console.log(
    'proved: actual pending-slot prefix stays at origin; rejected: prematurely projected endpoint',
  )
  prefixCounters++
}
console.log(
  JSON.stringify({
    status: 'diagnostic-counter-passed',
    baseline,
    rejected: cases.length + 2 + prefixCounters,
    sourceFrameCounter:
      sourceDraw.state.frame === null ? 'culled-frame-insertion' : 'visible-frame-mutation',
    gameTraceSha256: gameEvidence.traceSha256,
    reforgeTraceSha256: reforgeEvidence.traceSha256,
  }),
)
