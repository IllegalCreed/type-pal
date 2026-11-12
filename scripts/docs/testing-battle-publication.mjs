import assert from 'node:assert/strict'
import { parseTerminalJson } from './terminal-json.mjs'
import {
  assertTestingBridgeReference,
  restoreTestingBridgeHistory,
  testingBridgeSources,
} from './testing-source-bridge.mjs'

export const testingBattlePublicationBase = '43fea71735236272cfb7f6a1c61c3ac2e691a349'
export const testingBattleSessionMechanismBase = '3a921678f20950cccee3f631dfbb1e60bb8efa3b'
export const testingBattleSessionPortraitBase = '18bfe998333912bf2b1449e534133ce73cafca44'
export const testingBattleSessionPresentationBase = '5a3093c93746d6e04e8f569ef526e07778aa439f'
export const testingBattleSessionCadenceBase = 'd0020e0749483651d9b0f86cf79ef738ac34663e'
export const testingBattleSessionSourcePath = 'packages/reforge/src/battle/battle-session.ts'

const catalogPath = 'docs/testing/catalog.json'
const sessionId = 'runtime-battle-session-owners'
const sessionEvidencePath =
  'docs/testing/domains/runtime/battle/battle-session-owners/evidence.json'
const sessionReceipt = 'docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md'
const sessionBinding = {
  revision: testingBattlePublicationBase,
  action: 'q2-battle-session-source-rebinding',
  date: '2026-11-11',
}
const sessionMechanismBinding = {
  revision: testingBattleSessionMechanismBase,
  action: 'q2-battle-session-mechanism-source-rebinding',
  date: '2026-11-11',
}
const sessionPortraitBinding = {
  revision: testingBattleSessionPortraitBase,
  action: 'q2-battle-session-portrait-source-rebinding',
  date: '2026-11-11',
}
const sessionPresentationBinding = {
  revision: testingBattleSessionPresentationBase,
  action: 'q2-battle-session-presentation-source-rebinding',
  date: '2026-11-12',
}

const sessionCadenceBinding = {
  revision: testingBattleSessionCadenceBase,
  action: 'q2-battle-session-cadence-source-rebinding',
  date: '2026-11-12',
}

const publication = {
  id: 'q2-battle-foundation',
  kind: 'report',
  canonical: 'domains/cross-phase/battle-foundation/report.md',
  index: 'domains/cross-phase/battle-foundation/README.md',
  evidence: 'domains/cross-phase/battle-foundation/evidence.json',
}
const evidencePath = `docs/testing/${publication.evidence}`

export const isTestingBattleEvidencePath = (path) => path === evidencePath
export const isTestingBattleSessionEvidencePath = (path) => path === sessionEvidencePath

// Each published predecessor keeps its accepted source references and history.
function sessionRebindings(
  path,
  previousBytes,
  { readSource, fixed, mechanismFixed, portraitFixed, presentationFixed, cadenceFixed },
) {
  assert(
    fixed &&
      (!portraitFixed || mechanismFixed) &&
      (!presentationFixed || portraitFixed) &&
      (!cadenceFixed || presentationFixed),
    'battle session source bridge history gap',
  )
  const admitted = [
    { fixed, binding: sessionBinding },
    { fixed: mechanismFixed, binding: sessionMechanismBinding },
    { fixed: portraitFixed, binding: sessionPortraitBinding },
    { fixed: presentationFixed, binding: sessionPresentationBinding },
    { fixed: cadenceFixed, binding: sessionCadenceBinding },
  ].filter((stage) => stage.fixed)
  for (const stage of admitted)
    assert(
      stage.fixed.revision === stage.binding.revision &&
        typeof stage.fixed.readSource === 'function',
      'battle session source bridge requires the fixed accepted predecessor',
    )
  assert.equal(typeof readSource, 'function', 'battle session live source reader missing')
  assert(
    Buffer.isBuffer(previousBytes) && fixed.readSource(path)?.equals(previousBytes),
    'battle session predecessor differs from its fixed Git object',
  )
  const current = readSource(testingBattleSessionSourcePath)
  assert(Buffer.isBuffer(current), 'battle session live source missing')
  const currentStage = admitted.findIndex(({ fixed: snapshot }) => {
    const source = snapshot.readSource(testingBattleSessionSourcePath)
    assert(Buffer.isBuffer(source), 'battle session fixed source missing')
    return source.equals(current)
  })
  const rebindings = currentStage < 0 ? admitted : admitted.slice(0, currentStage)
  return rebindings.map((stage, index) => {
    const next = rebindings[index + 1]?.fixed
    const before = index === 0 ? previousBytes : stage.fixed.readSource(path)
    const after = next?.readSource(path)
    assert(
      Buffer.isBuffer(before) && (!next || Buffer.isBuffer(after)),
      'battle session publication missing',
    )
    return { ...stage, before, after, readSource: next?.readSource ?? readSource }
  })
}

function assertSessionReferences(before, current, { readSource, fixed }) {
  assert(
    Array.isArray(before) && Array.isArray(current) && current.length === before.length,
    'battle session reference membership changed',
  )
  const sources = testingBridgeSources(readSource)
  const fixedSources = testingBridgeSources(fixed.readSource)
  const changed = []
  for (const [index, old] of before.entries()) {
    const reference = current[index]
    if (old.path !== testingBattleSessionSourcePath) {
      assert.deepEqual(reference, old, 'reference outside battle session source bridge')
      continue
    }
    assert.deepEqual(
      { ...reference, sha256: old.sha256, lines: old.lines },
      old,
      'only battle session reference SHA and range may change',
    )
    assert.notEqual(reference.sha256, old.sha256, 'battle session reference must rebind its SHA')
    assertTestingBridgeReference(old, fixedSources)
    assertTestingBridgeReference(reference, sources)
    changed.push(old)
  }
  assert.equal(changed.length, 3, 'battle session bridge requires its three caller references')
  return changed
}

function restoreSessionHistory(before, current, changed, readSource, binding) {
  const restored = restoreTestingBridgeHistory(
    before,
    current,
    changed,
    readSource,
    binding.revision,
    sessionReceipt,
  )
  const event = current.at(-1)
  assert.equal(event.action, binding.action, 'battle session bridge history action differs')
  assert.equal(event.date, binding.date, 'battle session bridge history date differs')
  return restored
}

function assertSessionEvidenceRebinding(previousBytes, currentBytes, bridge, binding) {
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  assert.equal(before.id, sessionId, 'battle session evidence predecessor ID differs')
  assert.equal(current.id, sessionId, 'battle session evidence ID changed')
  const changed = assertSessionReferences(before.sourceRefs, current.sourceRefs, bridge)
  const history = restoreSessionHistory(
    before.history,
    current.history,
    changed,
    bridge.readSource,
    binding,
  )
  const claims = structuredClone(current.claims)
  const claimIndex = before.claims.findIndex(
    ({ id, result }) => id === `${sessionId}-source-contract` && result === 'source-backed',
  )
  assert(claimIndex >= 0, 'accepted battle session source claim missing')
  const oldPointers = before.claims[claimIndex].evidence
  for (const [index, old] of before.sourceRefs.entries()) {
    if (old.path !== testingBattleSessionSourcePath) continue
    const oldPointer = `${old.path}:${old.lines}`
    const pointerIndex = oldPointers.indexOf(oldPointer)
    assert(
      pointerIndex >= 0 && oldPointers.lastIndexOf(oldPointer) === pointerIndex,
      'accepted battle session source claim requires one exact pointer',
    )
    assert.equal(
      claims?.[claimIndex]?.evidence?.[pointerIndex],
      `${old.path}:${current.sourceRefs[index].lines}`,
      'battle session source claim pointer must follow its declared reference',
    )
    claims[claimIndex].evidence[pointerIndex] = oldPointer
  }
  assert.deepEqual(
    { ...current, sourceRefs: before.sourceRefs, claims, history },
    before,
    'battle session bridge changed publication, execution or unrelated evidence',
  )
}

/** Rebind the owner evidence to the current caller ranges while retaining the accepted audit. */
export function assertTestingBattleSessionSourceBridge(path, previousBytes, currentBytes, bridge) {
  assert(isTestingBattleSessionEvidencePath(path), 'unadmitted battle session evidence path')
  const rebindings = sessionRebindings(path, previousBytes, bridge)
  if (!rebindings.length)
    assert(
      previousBytes.equals(currentBytes),
      'battle session evidence changed without source drift',
    )
  for (const stage of rebindings)
    assertSessionEvidenceRebinding(stage.before, stage.after ?? currentBytes, stage, stage.binding)
}

function restoreSessionCatalogEntry(before, current, bridge, binding) {
  assert.equal(before?.id, sessionId, 'battle session owner is absent from the accepted catalog')
  assert.equal(current?.id, sessionId, 'battle session owner catalog identity or order changed')
  const changed = assertSessionReferences(before.sourceRefs, current.sourceRefs, bridge)
  const history = restoreSessionHistory(
    before.revision.history,
    current.revision.history,
    changed,
    bridge.readSource,
    binding,
  )
  return {
    ...current,
    sourceRefs: before.sourceRefs,
    revision: { ...current.revision, history },
  }
}

/** The accepted predecessor is verified by the historical bridges before this append. */
export function assertTestingBattlePublication(previousBytes, currentBytes, additions, bridge) {
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  const oldEntries = before?.entries
  const oldReadings = before?._governance?.entryReadings
  const entries = current?.entries
  const readings = current?._governance?.entryReadings
  assert(
    [oldEntries, oldReadings, entries, readings].every(Array.isArray),
    'battle publication requires catalog entries and entry readings',
  )
  const rebindings = bridge ? sessionRebindings(catalogPath, previousBytes, bridge) : []
  if (rebindings.length) {
    const index = oldEntries.findIndex(({ id }) => id === sessionId)
    assert(index >= 0, 'battle session owner is absent from the accepted catalog')
    let entry = entries[index]
    for (const stage of rebindings.toReversed()) {
      const previous =
        stage.before === previousBytes
          ? oldEntries[index]
          : parseTerminalJson(stage.before).entries[index]
      entry = restoreSessionCatalogEntry(previous, entry, stage, stage.binding)
      assert.deepEqual(entry, previous, 'battle publication changed existing catalog facts')
    }
    entries[index] = entry
  }
  assert.deepEqual(
    {
      ...current,
      entries: entries.slice(0, oldEntries.length),
      _governance: {
        ...current._governance,
        entryReadings: readings.slice(0, oldReadings.length),
      },
    },
    before,
    'battle publication changed existing catalog facts',
  )
  assert(
    !oldEntries.some((entry) => entry?.id === publication.id),
    'battle foundation was already published',
  )
  assert.deepEqual(
    entries.slice(oldEntries.length).map((entry) => {
      const { id, kind, canonical, index, evidence } = entry ?? {}
      return { id, kind, canonical, index, evidence }
    }),
    [publication],
    'only the admitted battle foundation entry may be appended',
  )
  const newReadings = readings.slice(oldReadings.length)
  assert.deepEqual(
    newReadings.map((reading) => reading?.id),
    [publication.id],
    'battle publication requires the corresponding appended reading',
  )
  assert(
    typeof newReadings[0]?.conclusion === 'string' && newReadings[0].conclusion.trim(),
    'battle publication requires a concrete reading conclusion',
  )
  for (const [path, templateId] of [
    [publication.canonical, 'test-domain-report-v1'],
    [publication.index, 'governance-index-v1'],
    [publication.evidence, 'test-machine-evidence-v1'],
  ]) {
    assert.equal(
      additions.get(`docs/testing/${path}`)?.templateId,
      templateId,
      `battle publication requires an admitted pair: ${path}`,
    )
  }
}

// This is the bounded identity/native-execution admission, not a replacement for
// check-testing's paired metadata, source references and actual artifact hashes.
export function assertTestingBattleEvidence(path, bytes) {
  assert(isTestingBattleEvidencePath(path), 'unadmitted testing battle evidence path')
  const evidence = parseTerminalJson(bytes)
  assert.equal(evidence?.id, publication.id, 'testing battle evidence identity differs')
  assert(
    evidence.schemaVersion === 2 &&
      evidence.kind === 'runtime-execution' &&
      evidence.runtimeExecution?.performed === true &&
      evidence._governance?.variant === 'execution' &&
      Array.isArray(evidence.claims) &&
      evidence.claims.some((claim) => claim?.result === 'runtime-backed'),
    'testing battle evidence must declare its actual native execution',
  )
}
