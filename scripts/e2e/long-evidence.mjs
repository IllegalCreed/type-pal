import assert from 'node:assert/strict'
import {
  encodeEvidenceArtifact,
  readEvidenceArtifact,
  writeEvidenceArtifact,
} from './evidence-artifact.mjs'
import { readEvidenceArchive } from './evidence-transport.mjs'
import { createSnapshotGraph } from './snapshot-graph.mjs'

const originals = new WeakMap()
// 360 MiB total recorder/pool budgets + JSON separators and final small DTO.
// Keep physical serialization below V8's single-string ceiling.
export const LONG_EVIDENCE_MAX_BYTES = 384 * 1024 * 1024
const progressOriginals = new WeakMap()
function freezeTree(value) {
  if (!value || typeof value !== 'object' || Object.isFrozen(value)) return value
  for (const child of Object.values(value)) freezeTree(child)
  return Object.freeze(value)
}

/** 005/006 have one current wire format. The logical comparison DTO is unchanged. */
export function decodeLongEvidence(wire) {
  assert.equal(
    wire.evidenceFormat,
    'snapshot-graph/1',
    'long recording needs current snapshot format',
  )
  const { evidenceFormat: _, snapshotNodes, ...trace } = wire
  freezeTree(wire.causes)
  freezeTree(snapshotNodes)
  freezeTree(wire.events)
  const graph = createSnapshotGraph()
  trace.causes = graph.unpack(wire.causes, snapshotNodes)
  trace.events = graph.expandProgress(wire.events)
  originals.set(trace.causes, { causes: wire.causes, snapshotNodes })
  progressOriginals.set(trace.events, wire.events)
  return trace
}

export function encodeLongEvidence(trace) {
  const previous = originals.get(trace.causes),
    graph = createSnapshotGraph(),
    events = progressOriginals.get(trace.events) ?? graph.compactProgress(trace.events)
  if (previous) return { ...trace, events, evidenceFormat: 'snapshot-graph/1', ...previous }
  const causes = trace.causes.map(graph.pack)
  return {
    ...trace,
    events,
    evidenceFormat: 'snapshot-graph/1',
    causes,
    snapshotNodes: graph.nodes,
  }
}

export async function readLongEvidenceArchive(page) {
  return decodeLongEvidence(await readEvidenceArchive(page, '__readErrandArchive'))
}

export function longEvidenceArtifact(trace, maxBytes = LONG_EVIDENCE_MAX_BYTES) {
  return encodeEvidenceArtifact(encodeLongEvidence(trace), maxBytes)
}

export function writeLongEvidenceArtifact(directory, name, trace) {
  return writeEvidenceArtifact(directory, name, encodeLongEvidence(trace), LONG_EVIDENCE_MAX_BYTES)
}

export async function readLongEvidenceArtifact(directory, reference) {
  const artifact = await readEvidenceArtifact(directory, reference)
  assert(
    artifact.byteLength <= LONG_EVIDENCE_MAX_BYTES,
    'long archive exceeds physical byte budget',
  )
  return { ...artifact, value: decodeLongEvidence(artifact.value) }
}
