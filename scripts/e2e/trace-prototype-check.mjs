import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import {
  compareNpcStateTraces,
  readNpcTrace,
  renderedPoseEvidence,
} from './npc-transition-contract.mjs'
import { recompareRecording } from './recompare-recording.mjs'
import { checkSpriteResources } from './sprite-resource-contract.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const hash = async (path) =>
  createHash('sha256')
    .update(await readFile(path))
    .digest('hex')

/** Falsify obligations on a genuinely accepted recorded pair. Select witnesses by
 * semantic identity, never yesterday's order numbers. Raw artifacts remain immutable.
 * The result certifies these bounded counterexamples, not arbitrary-story equivalence. */
export async function checkTracePrototype(fragment, gamePath, reforgePath) {
  const archived = await recompareRecording(fragment, gamePath, reforgePath)
  assert.equal(
    archived.status,
    'passed',
    'counterexamples require a fully accepted baseline; unknown is not a positive control',
  )
  const [{ trace: game }, { trace: reforge }] = await Promise.all(
    [gamePath, reforgePath].map(readNpcTrace),
  )
  const counters = []
  const counter = (name, field, selectProof, change, expectedStatus) => {
    assert.equal(
      selectProof(archived.comparison)?.status,
      'proved',
      `${name}: baseline obligation unproved`,
    )
    const copy = structuredClone(reforge)
    change(copy)
    const result = compareNpcStateTraces(game, copy, fragment),
      proof = selectProof(result)
    assert.equal(proof.status, expectedStatus, `${name}: mutation escaped its obligation`)
    assert(
      result.findings.some((f) => f.field === field && f.proof === proof),
      `${name}: failed proof bypassed admission`,
    )
    counters.push({ name, field, status: proof.status, witness: proof.witness })
  }
  const execution = archived.comparison.storyExecutions.final.executions.find((e) => e.commands > 1)
  assert(execution, 'finite story requires a multi-command execution witness')
  counter(
    `删除完整演出：${execution.name}`,
    'required-story-executions',
    (c) => c.storyExecutions,
    (t) => {
      t.causes = t.causes.filter((e) => e.runId !== execution.runId)
    },
    'rejected',
  )
  counter(
    `交换依赖指令：${execution.name}`,
    'required-story-executions',
    (c) => c.storyExecutions,
    (t) => {
      const commands = t.causes.filter((e) => e.phase === 'command' && e.runId === execution.runId)
      ;[commands[0].occurrence, commands[1].occurrence] = [
        commands[1].occurrence,
        commands[0].occurrence,
      ]
    },
    'rejected',
  )
  const effect = archived.comparison.effects.persistentOverrides.witnesses[0]
  assert(effect, 'story requires a persistent-effect witness')
  counter(
    '删除效果自身截止点的实际世界快照',
    'persistentOverrides',
    (c) => c.effects.persistentOverrides,
    (t) => {
      delete t.causes.find((e) => e.order === effect.deadline).world
    },
    'unknown',
  )
  const lifecycleCauses = [...(reforge.initialCauses ?? []), ...reforge.causes].sort(
    (a, b) => a.order - b.order,
  )
  const checkpoints = new Set([
    'command',
    'run-started',
    'run-ended',
    'stage-settled',
    'authority-changed',
  ])
  const mutation = reforge.causes.find(
    (e) =>
      e.phase === 'authority-changed' &&
      ['before', 'after'].every((side) =>
        lifecycleCauses.some(
          (c) =>
            checkpoints.has(c.phase) &&
            c.lifecycle &&
            c.sceneVisit === e.sceneVisit &&
            c.lifecycle.sceneSession === e.lifecycle.sceneSession &&
            (side === 'before' ? c.order < e.order : c.order > e.order),
        ),
      ),
  )
  assert(
    mutation,
    'authority deletion counterexample needs independent same-session checkpoints on both sides',
  )
  counter(
    '删除实际接管或释放记录',
    'automatic-lifecycle',
    (c) => c.lifecycle,
    (t) => {
      t.causes = t.causes.filter((e) => e.order !== mutation.order)
    },
    'rejected',
  )
  for (const [engine, trace] of [
    ['game', game],
    ['reforge', reforge],
  ]) {
    const proof = archived.comparison.resources.find((p) => p.engine === engine)
    assert.equal(proof.status, 'proved')
    const ids = [
      ...new Set(
        trace.events.filter((e) => e.kind === 'actor-render' && e.id !== 'party').map((e) => e.id),
      ),
    ]
    const draw = ids
      .flatMap((id) => renderedPoseEvidence(trace, id))
      .find((e) => e.drawStatus === 'drawn')
    assert(draw, 'actual NPC draw required')
    const copy = structuredClone(trace),
      resource = copy.resources.find((r) => r.order === draw.frameResourceId)
    assert(resource, 'draw must reference actual decoded bytes')
    resource.opaque[0] ^= 1
    const rejected = await checkSpriteResources(copy, engine, root)
    assert.equal(rejected.status, 'rejected', `${engine} changed drawn mask escaped byte proof`)
    counters.push({
      name: `${engine} 实际精灵遮罩篡改`,
      field: 'actual-sprite-bytes',
      status: rejected.status,
      witness: rejected.witness,
    })
  }
  // Rebind complete acceptance after the in-memory mutations, including specialized artifacts.
  assert.deepEqual(await recompareRecording(fragment, gamePath, reforgePath), archived)
  for (const recording of archived.recordings)
    for (const artifact of [recording.report, recording.trace])
      assert.equal(await hash(artifact.path), artifact.sha256)
  return {
    kind: 'bounded-formal-trace-counterexamples',
    status: 'passed',
    fragment,
    scope:
      'same complete independent acceptance and obligation results; finite author order, effect deadline, actual lifecycle and decoded draw-resource negative controls',
    evidenceLimits: [
      'Does not assert browser rAF counts, audio hardware output or whole-frame RGBA equality.',
    ],
    counters,
    archived,
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const [fragment, game, reforge, output, ...extra] = process.argv.slice(2)
  assert(
    fragment && game && reforge && output && !extra.length,
    'usage: trace-prototype-check.mjs FRAGMENT GAME_REPORT REFORGE_REPORT NEW_OUTPUT_JSON',
  )
  const result = await checkTracePrototype(fragment, game, reforge)
  await writeFile(output, `${JSON.stringify(result, null, 2)}\n`, { flag: 'wx' })
  console.log(
    `${fragment}: ${result.status}; ${result.counters.length} witnessed negative controls; ${output}`,
  )
}
