import assert from 'node:assert/strict'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'
import {
  readCapturedAmbientAncestors,
  verifyCapturedAmbientCycle,
} from './captured-ambient-cycle.mjs'
import { verifyEntityActionTimelines } from './entity-action-contract.mjs'
import { verifyGameAutoBatches, verifyGameAutoCycles } from './game-auto-contract.mjs'
import { verifyInnGamePresentation } from './inn-presentation-intent.mjs'
import { verifyMotionSlotLifetimes } from './motion-slot-contract.mjs'
import {
  actorTransitions,
  canonicalPosition,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { verifyRuntimeHandoffs } from './runtime-handoff-contract.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'
import { verifyStoryPoses } from './story-pose-contract.mjs'
import { storyProofPrefix, verifyStoryWaits } from './story-presentation-intent.mjs'

// Opt-in real raw mutation experiment. Never writes acceptance or original files.
const { values } = parseArgs({ options: { game: { type: 'string' }, reforge: { type: 'string' } } })
assert(values.game && values.reforge, 'two real 004 story reports required')
const evidence = await Promise.all([values.game, values.reforge].map(readNpcTrace)),
  [game, reforge] = evidence.map((e) => storyProofPrefix(e.trace, e.rawTrace)),
  resources = await checkSpriteResources(evidence[1].trace, 'reforge', resolve('.')),
  ancestors = await readCapturedAmbientAncestors(
    evidence.map((e) => e.report),
    readNpcTrace,
    resources.frameCounts,
  ),
  actor = { scene: 's003', entity: 'e62' },
  handoffs = verifyRuntimeHandoffs(reforge),
  actions = verifyEntityActionTimelines(reforge),
  receipts = {
    handoffs,
    slots: verifyMotionSlotLifetimes(reforge.causes),
    motion: [],
    waits: verifyStoryWaits(reforge, handoffs),
    gameCycles: verifyGameAutoCycles(game, [actor], verifyGameAutoBatches(game)),
    gamePresentation: verifyInnGamePresentation(
      game,
      renderedPoseEvidence,
      actorTransitions,
      canonicalPosition,
      { scene: 's003', actors: ['e62'] },
    ),
    presentation: verifyStoryPoses(
      reforge,
      [actor],
      [],
      handoffs,
      actions,
      resources.frameCounts,
      renderedPoseEvidence,
      actorTransitions,
    ),
  },
  baseline = verifyCapturedAmbientCycle(game, reforge, receipts, ancestors),
  leaf = (e) => e.occurrence?.command?.command,
  starts = reforge.causes.filter(
    (e) => e.phase === 'run-started' && e.author?.entity === 'e62' && e.author.channel === 'auto',
  ),
  sourceStart = game.causes.find((e) => e.phase === 'auto-before' && e.actor === 62),
  loaded = reforge.causes.find((e) => e.phase === 'runtime-loaded' && e.scene === 's003'),
  firstConsumed = reforge.causes.find((e) => e.order === baseline.restoredWait),
  change = (trace, at, mutate) => {
    const value = trace.causes.find((e) => e.order === at),
      changed = structuredClone(value)
    assert(value, 'actual mutation input missing')
    mutate(changed)
    trace.causes = trace.causes.map((e) => (e === value ? changed : e))
  },
  cases = [
    [
      'saved bytes/payload separation',
      (_g, _r, a) => {
        a.predecessors[0].payload = structuredClone(a.predecessors[0].payload)
        a.predecessors[0].payload.gs.allEventObjects[62].scriptedFrame = 0
      },
    ],
    [
      'actual Game restored seed',
      (g) =>
        change(g, sourceStart.order, (e) => {
          e.before.frame = 0
        }),
    ],
    [
      'actual Reforge restored seed',
      (_g, r) =>
        change(r, starts[0].order, (e) => {
          e.poses.e62.state.frameDebug.override = 1
        }),
    ],
    [
      'loaded saved pose',
      (_g, r) =>
        change(r, loaded.order, (e) => {
          e.saved.entities.e62.fixedFrame = 1
        }),
    ],
    [
      'loaded saved wait',
      (_g, r) =>
        change(r, loaded.order, (e) => {
          e.saved.automatic.e62.wait.remainingMs += 100
        }),
    ],
    [
      'consumed real saved remainder',
      (_g, r) =>
        change(r, firstConsumed.order, (e) => {
          e.remainingMs += 100
        }),
    ],
    [
      'borrowed wait origin',
      (_g, r) =>
        change(r, firstConsumed.order, (e) => {
          e.origin.snapshotId++
        }),
    ],
    [
      'restarted restored control word',
      (_g, r) =>
        change(r, starts[0].order, (e) => {
          e.resume.frames.at(-1).index = 0
        }),
    ],
    [
      'missing automatic setter',
      (_g, r) => {
        const actual = r.causes.find(
          (e) =>
            e.phase === 'command' &&
            e.runId === starts[0].runId &&
            leaf(e)?.kind === 'setEntityFrame',
        )
        assert(actual)
        r.causes = r.causes.filter((e) => e !== actual)
      },
    ],
    [
      'wrong actual wait duration',
      (_g, r) => {
        const actual = r.causes.find(
          (e) => e.phase === 'command' && e.runId === starts[0].runId && leaf(e)?.kind === 'wait',
        )
        change(r, actual.order, (e) => {
          leaf(e).ms += 100
        })
      },
    ],
    [
      'missing foreground setter',
      (_g, r) => {
        r.causes = r.causes.filter((e) => e.order !== baseline.authoredSetter)
      },
    ],
    [
      'wrong foreground setter',
      (_g, r) =>
        change(r, baseline.authoredSetter, (e) => {
          leaf(e).frame = 3
        }),
    ],
    [
      'missing authored disable',
      (_g, r) => {
        const actual = r.causes.find(
          (e) =>
            e.phase === 'command' &&
            leaf(e)?.target?.entity === 'e62' &&
            leaf(e).kind === 'selectEntityBehavior' &&
            leaf(e).channel === 'auto' &&
            leaf(e).selection.kind === 'disabled',
        )
        assert(actual)
        r.causes = r.causes.filter((e) => e !== actual)
      },
    ],
    [
      'wrong source disable owner',
      (g) => {
        const actual = g.causes.find(
          (e) =>
            e.phase === 'command' && e.command?.opcode === 36 && e.command.operands[0] === 65535,
        )
        change(g, actual.order, (e) => {
          e.currentEventObjectId = 61
        })
      },
    ],
    [
      'missing source committed disable',
      (g) => {
        g.causes = g.causes.filter(
          (e) => !(e.phase === 'auto-selection-committed' && e.entity === 62),
        )
      },
    ],
    [
      'wrong revisit pose',
      (_g, r) =>
        change(r, starts[1].order, (e) => {
          e.poses.e62.state.frameDebug.override = 2
        }),
    ],
    [
      'wrong revisit remainder',
      (_g, r) => {
        const actual = r.causes.find(
          (e) => e.phase === 'runtime-wait-consumed' && e.runId === starts[1].runId && e.origin,
        )
        change(r, actual.order, (e) => {
          e.remainingMs += 100
        })
      },
    ],
    [
      'source cursor identity replaced',
      (g) => {
        const actual = g.causes.find(
          (e) =>
            e.phase === 'auto-before' && e.actor === 62 && e.sceneVisit !== sourceStart.sceneVisit,
        )
        change(g, actual.order, (e) => {
          e.runId++
        })
      },
    ],
    [
      'disabled owner never actually ended',
      (_g, r) => {
        r.causes = r.causes.filter(
          (e) => !(e.phase === 'run-ended' && e.runId === starts.at(-1).runId),
        )
      },
    ],
  ]
assert.equal(resources.status, 'proved')
assert.equal(starts.length, 2, 'actual experiment expects both recorded visits')
for (const [name, mutate] of cases) {
  const g = { ...game },
    r = { ...reforge },
    a = { ...ancestors, predecessors: ancestors.predecessors.map((p) => ({ ...p })) }
  mutate(g, r, a)
  assert.throws(() => verifyCapturedAmbientCycle(g, r, receipts, a), assert.AssertionError, name)
  console.log(`rejected: ${name}`)
}
for (const [engine, trace, before, frame] of [
  ['game', game, baseline.sourceSetter, 1],
  ['reforge', reforge, baseline.authoredSetter, 1],
  ['game', game, Infinity, 1],
  ['reforge', reforge, Infinity, 1],
]) {
  const actual = trace.events.find(
      (e) =>
        e.kind === 'actor-render' &&
        e.source === 'render:world' &&
        e.state.drawStatus === 'drawn' &&
        e.id === 'e62' &&
        e.scene === 's003' &&
        (e.throughOrder ?? e.order) > trace.renderScope.afterOrder &&
        e.order <= trace.renderScope.throughOrder &&
        (before === Infinity
          ? e.order < (engine === 'game' ? baseline.sourceSetter : baseline.authoredSetter) &&
            e.state.frame === 0
          : e.order > before && e.state.frame === 2),
    ),
    changed = structuredClone(actual)
  assert(actual, 'actual visible draw counter input missing')
  changed.state.frame = frame
  const modified = { ...trace, events: trace.events.map((e) => (e === actual ? changed : e)) }
  assert.throws(
    () =>
      verifyCapturedAmbientCycle(
        engine === 'game' ? modified : game,
        engine === 'reforge' ? modified : reforge,
        receipts,
        ancestors,
      ),
    assert.AssertionError,
    `${engine} real draw`,
  )
  console.log(`rejected: ${engine} actual ${before === Infinity ? 'cyclic' : 'terminal'} draw`)
}
console.log(
  JSON.stringify({
    status: 'diagnostic-counter-passed',
    baseline,
    rejected: cases.length + 4,
    sourceTraceSha256: evidence[0].traceSha256,
    reforgeTraceSha256: evidence[1].traceSha256,
    note: 'Original files untouched; no final E2E or acceptance credit.',
  }),
)
