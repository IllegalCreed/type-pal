import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import {
  CONTINUOUS_STORY_FRAGMENTS,
  continuousStoryActions,
  continuousStoryPlan,
} from './continuous-story.mjs'
import { readNpcTrace } from './npc-transition-contract.mjs'
import { recompareRecording } from './recompare-recording.mjs'
import { readSaveHandoff } from './save-handoff.mjs'

/** Receipts are JSON artifacts: optional undefined fields are absent on the wire. */
export function assertComparisonReceipt(receipt, current) {
  assert.deepEqual(
    receipt,
    JSON.parse(JSON.stringify(current)),
    'comparison stale or not bound to complete current raw/provenance',
  )
  assert.equal(current.status, 'passed', 'current comparison not accepted')
}

/** Rebuild evidence/provenance from raw, not the receipt's self-declared file inventory. */
export async function verifyRecordedAcceptance(reference) {
  const bytes = await readFile(reference.path)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    reference.sha256,
    'comparison receipt bytes changed',
  )
  const receipt = JSON.parse(bytes)
  assert.equal(receipt.fragment, reference.fragment)
  assert.equal(receipt.status, 'passed', 'dual-track comparison not accepted')
  assert.deepEqual(
    receipt.recordings?.map((r) => r.engine),
    ['game', 'reforge'],
    'comparison engine pairing differs',
  )
  const paths = receipt.recordings.map((recording) => recording.report.path)
  const current = await recompareRecording(reference.fragment, ...paths)
  assertComparisonReceipt(receipt, current)
  assert(
    current.sourceChanges.every((change) => change.impact === 'declared-oracle'),
    'recorded execution/collection inputs changed; impact review or new evidence required',
  )
  const loaded = await Promise.all(paths.map(readNpcTrace))
  return {
    fragment: reference.fragment,
    reports: loaded.map((r) => r.report),
    paths,
    receipt: {
      fragment: reference.fragment,
      comparison: reference.sha256,
      verifier: current.verifier.sha256,
    },
  }
}

/** Binding contract only. Callers must supply independently verified recordings, not a status flag. */
export function assertContinuousTapeBinding(tape, validated, handoffs) {
  const fragments = CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id)
  assert.deepEqual(
    validated.map((v) => v.fragment),
    fragments,
    'continuous accepted chain differs',
  )
  assert.equal(tape.kind, 'continuous-story-action-tape')
  assert.equal(tape.mode, 'story-only')
  assert.deepEqual(tape.boundary, { fragmentLoad: false, fragmentSave: false })
  assert.deepEqual(tape.handoffs, handoffs, 'tape save handoffs differ from verified evidence')
  assert.deepEqual(
    handoffs?.map(({ fragment, engine }) => `${fragment}/${engine}`),
    ['004/game', '004/reforge', '005/game', '005/reforge'],
    'missing separate saves handoffs',
  )
  const reports = (index) => validated.map((v) => v.reports[index])
  assert.deepEqual(
    tape.plan,
    continuousStoryPlan({ gameReports: reports(0), reforgeReports: reports(1) }),
    'tape plan differs from accepted recordings',
  )
  for (const [index, engine] of ['game', 'reforge'].entries()) {
    assert.deepEqual(
      tape.actions?.[engine],
      validated.map((v) => ({
        fragment: v.fragment,
        actions: continuousStoryActions(v.reports[index]),
      })),
      'tape inputs differ from accepted recordings',
    )
    for (let i = 1; i < validated.length; i++) {
      const prior = validated[i - 1],
        next = validated[i].reports[index]
      const provider = handoffs.find((h) => h.fragment === prior.fragment && h.engine === engine)
      assert.equal(
        resolve(next.predecessor?.report ?? ''),
        resolve(provider?.report.path ?? prior.paths[index]),
        'independent predecessor report chain differs',
      )
      const checkpoint = provider?.checkpoint ?? prior.reports[index].checkpoint?.sha256
      assert(checkpoint, 'accepted recording lacks checkpoint')
      assert.equal(
        next.predecessor?.sha256,
        checkpoint,
        'independent predecessor checkpoint differs',
      )
    }
  }
}

/** Mandatory at both publication and direct replay, before any browser starts. */
export async function assertContinuousAcceptance(tape) {
  const { validated, handoffs } = await prepareContinuousAcceptance(tape.acceptance)
  assertContinuousTapeBinding(tape, validated, handoffs)
  return { status: 'passed', receipts: validated.map((v) => v.receipt), handoffs }
}

/** Derive save providers from accepted next-fragment inputs, without a second manual chain. */
export async function prepareContinuousAcceptance(references) {
  const fragments = CONTINUOUS_STORY_FRAGMENTS.map(({ id }) => id)
  assert.deepEqual(
    references?.map((r) => r.fragment),
    fragments,
    'continuous replay requires six ordered dual-track acceptance receipts',
  )
  const validated = []
  for (const reference of references) validated.push(await verifyRecordedAcceptance(reference))
  const handoffs = []
  for (const index of [3, 4])
    for (const engine of [0, 1]) {
      const next = validated[index + 1].reports[engine]
      assert(next.predecessor?.report, 'next fragment lacks actual saves predecessor')
      handoffs.push(
        await readSaveHandoff(next.predecessor.report, validated[index].reports[engine]),
      )
    }
  return { validated, handoffs }
}
