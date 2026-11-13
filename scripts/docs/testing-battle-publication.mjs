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
export const testingBattleSessionCasualtyBase = '58812c028ebd87dd75a9c5dda46a4ec997fb4b09'
export const testingBattleSessionCasualtyDialogueBase = 'f84bcd91dd71498e1099e7bf8f4b2d7900507090'
export const testingBattleSessionPlayerActionsBase = 'faae7bde3078a06d5072326327459994107607e2'
export const testingBattleSessionCooperativeRecoveryBase =
  'a86eea156e360bfb916a63afb8c8c7b5d5d0f018'
export const testingBattleSessionItemEffectsBase = '398a930d2c1ddb4c0fe1a8a96271dba70e3aa93c'
export const testingBattleSessionThrowFeedbackBase = '5a5a02a2f56eb4748d0415e902c334999121dcdb'
export const testingBattleSessionEnemyCastBase = 'a4d04282dbbdaecff8e97e37528b5c0d67659550'
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

const sessionCasualtyBinding = {
  revision: testingBattleSessionCasualtyBase,
  action: 'q2-battle-session-casualty-source-rebinding',
  date: '2026-11-12',
}

const sessionCasualtyDialogueBinding = {
  revision: testingBattleSessionCasualtyDialogueBase,
  action: 'q2-battle-session-casualty-dialogue-source-rebinding',
  date: '2026-11-12',
}

const sessionPlayerActionsBinding = {
  revision: testingBattleSessionPlayerActionsBase,
  action: 'q2-battle-session-player-actions-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionCooperativeRecoveryBinding = {
  revision: testingBattleSessionCooperativeRecoveryBase,
  action: 'q2-battle-session-cooperative-recovery-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionItemEffectsBinding = {
  revision: testingBattleSessionItemEffectsBase,
  action: 'q2-battle-session-item-effects-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionThrowFeedbackBinding = {
  revision: testingBattleSessionThrowFeedbackBase,
  action: 'q2-battle-session-throw-feedback-source-rebinding',
  date: '2026-11-13',
  requireExactExcerpt: true,
}

const sessionEnemyCastBinding = {
  revision: testingBattleSessionEnemyCastBase,
  action: 'q2-battle-session-enemy-cast-source-rebinding',
  date: '2026-11-14',
  requireExactExcerpt: true,
}

export const testingBattleDefeatSourceRevision = '31002d214bb106272f34af46c86c57872b9b2849'
const openingTraceTest = 'scripts/e2e/opening-trace.test.mjs'
const reforgeMain = 'packages/reforge/src/main.ts'
const reforgeBattleHost = 'packages/reforge/src/battle/battle-host.ts'
const defeatBindings = new Map([
  ['e2e/evidence/e2e-001.json', { id: 'e2e-001', paths: [openingTraceTest] }],
  ['e2e/evidence/e2e-common-issues.json', { id: 'e2e-common-issues', paths: [openingTraceTest] }],
  [
    'domains/runtime/scene/active-scene/evidence.json',
    { id: 'runtime-active-scene', paths: [reforgeMain] },
  ],
  [
    'domains/runtime/battle/battle-host/evidence.json',
    { id: 'runtime-battle-host', paths: [reforgeMain, reforgeBattleHost] },
  ],
  [
    'domains/runtime/world/world-runtime/evidence.json',
    { id: 'runtime-world-owners', paths: [reforgeMain] },
  ],
])
const defeatSourceRanges = new Map([
  [openingTraceTest, { '527-642': '538-653' }],
  [
    reforgeMain,
    { '407-414': '408-415', '448-455': '449-456', '434-445': '435-446', '1242-1261': '1245-1266' },
  ],
  [reforgeBattleHost, { '53-67': '55-69', '156-160': '165-169' }],
])
export const isTestingBattleDefeatSourcePath = (path) => defeatSourceRanges.has(path)

function defeatReferences(before, current, paths, { source, fixed, predecessor }) {
  assert.equal(current.length, before.length, 'defeat source reference membership changed')
  const previous = []
  const clip = (bytes, range) => {
    const [first, last] = range.split('-').map(Number)
    return bytes
      .toString('utf8')
      .split('\n')
      .slice(first - 1, last)
      .join('\n')
  }
  for (const [index, old] of before.entries()) {
    const reference = current[index]
    if (!paths.includes(old.path)) {
      assert.deepEqual(reference, old, 'defeat bridge changed an unrelated source reference')
      continue
    }
    const nextRange = defeatSourceRanges.get(old.path)[old.lines]
    assert(nextRange, 'defeat bridge source range was not admitted')
    assert.deepEqual({ ...reference, sha256: old.sha256, lines: old.lines }, old)
    assert.equal(reference.lines, nextRange, 'defeat bridge referenced a different caller range')
    assertTestingBridgeReference(old, predecessor)
    assertTestingBridgeReference(reference, source)
    const actual = source.read(old.path)
    assert(
      actual.equals(fixed.read(old.path)),
      'defeat source differs from the frozen Q2 candidate',
    )
    let excerpt = clip(actual, nextRange)
    if (old.path === reforgeMain && old.lines === '1242-1261') {
      const added =
        '      worldDefeatFrameCapture: (signal) =>\n        ordinaryDefeatSignal === signal ? () => gameOverPresentation.hold(ctx, signal) : undefined,\n'
      assert.equal(excerpt.split(added).length, 2, 'defeat frame port changed')
      excerpt = excerpt.replace(added, '')
    }
    assert.equal(
      excerpt,
      clip(predecessor.read(old.path), old.lines),
      'defeat bridge changed the accepted caller excerpt',
    )
    previous.push(old)
  }
  assert(previous.length > 0, 'defeat bridge has no approved reference')
  return previous
}

function defeatHistory(before, current, previous, readSource) {
  const history = restoreTestingBridgeHistory(
    before,
    current,
    previous,
    readSource,
    testingBattleSessionCasualtyDialogueBase,
    sessionReceipt,
  )
  const event = current.at(-1)
  assert.equal(event.action, 'q2-ordinary-defeat-source-rebinding')
  assert.equal(event.date, '2026-11-13')
  return history
}

/** Restore the five older entry objects before replaying their original publication
 * guards. Only the admitted source coordinates and one applicability event may vary. */
export function restoreTestingBattleDefeatSourceBindings(
  path,
  currentBytes,
  { readSource, readBase, readFixed },
) {
  if (!path.startsWith('docs/testing/')) return currentBytes
  const binding = defeatBindings.get(path.slice('docs/testing/'.length))
  if (!binding && path !== catalogPath) return currentBytes
  const baseBytes = readBase(path)
  const before = parseTerminalJson(baseBytes)
  const current = parseTerminalJson(currentBytes)
  const sources = {
    source: testingBridgeSources(readSource),
    fixed: testingBridgeSources(readFixed),
    predecessor: testingBridgeSources(readBase),
  }
  if (path === catalogPath) {
    for (const { id, paths } of defeatBindings.values()) {
      const index = before.entries.findIndex((entry) => entry.id === id)
      const old = before.entries[index]
      const entry = current.entries[index]
      assert(index >= 0 && entry.id === old.id, 'defeat bridge changed catalog identity or order')
      const previous = defeatReferences(old.sourceRefs, entry.sourceRefs, paths, sources)
      const history = defeatHistory(
        old.revision.history,
        entry.revision.history,
        previous,
        readSource,
      )
      assert.deepEqual(
        { ...entry, sourceRefs: old.sourceRefs, revision: { ...entry.revision, history } },
        old,
      )
      current.entries[index] = old
    }
    return Buffer.from(JSON.stringify(current))
  }

  assert.equal(before.id, binding.id)
  assert.equal(current.id, binding.id)
  const previous = defeatReferences(before.sourceRefs, current.sourceRefs, binding.paths, sources)
  const history = defeatHistory(before.history, current.history, previous, readSource)
  const claimIndex = before.claims.findIndex(
    ({ id, result }) => id === `${binding.id}-source-contract` && result === 'source-backed',
  )
  assert(claimIndex >= 0, 'defeat bridge source claim missing')
  for (const old of previous) {
    const reference = current.sourceRefs[before.sourceRefs.indexOf(old)]
    const pointer = `${old.path}:${old.lines}`
    const previousPointers = before.claims[claimIndex].evidence
    const pointerIndex = previousPointers.indexOf(pointer)
    assert(pointerIndex >= 0 && previousPointers.lastIndexOf(pointer) === pointerIndex)
    const pointers = current.claims[claimIndex].evidence
    assert.equal(pointers[pointerIndex], `${reference.path}:${reference.lines}`)
    pointers[pointerIndex] = pointer
  }
  assert.deepEqual({ ...current, sourceRefs: before.sourceRefs, history }, before)
  return baseBytes
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
  {
    readSource,
    fixed,
    mechanismFixed,
    portraitFixed,
    presentationFixed,
    cadenceFixed,
    casualtyFixed,
    casualtyDialogueFixed,
    playerActionsFixed,
    cooperativeRecoveryFixed,
    itemEffectsFixed,
    throwFeedbackFixed,
    enemyCastFixed,
  },
) {
  assert(
    fixed &&
      (!portraitFixed || mechanismFixed) &&
      (!presentationFixed || portraitFixed) &&
      (!cadenceFixed || presentationFixed) &&
      (!casualtyFixed || cadenceFixed) &&
      (!casualtyDialogueFixed || casualtyFixed) &&
      (!playerActionsFixed || casualtyDialogueFixed) &&
      (!cooperativeRecoveryFixed || playerActionsFixed) &&
      (!itemEffectsFixed || cooperativeRecoveryFixed) &&
      (!throwFeedbackFixed || itemEffectsFixed) &&
      (!enemyCastFixed || throwFeedbackFixed),
    'battle session source bridge history gap',
  )
  const admitted = [
    { fixed, binding: sessionBinding },
    { fixed: mechanismFixed, binding: sessionMechanismBinding },
    { fixed: portraitFixed, binding: sessionPortraitBinding },
    { fixed: presentationFixed, binding: sessionPresentationBinding },
    { fixed: cadenceFixed, binding: sessionCadenceBinding },
    { fixed: casualtyFixed, binding: sessionCasualtyBinding },
    { fixed: casualtyDialogueFixed, binding: sessionCasualtyDialogueBinding },
    { fixed: playerActionsFixed, binding: sessionPlayerActionsBinding },
    { fixed: cooperativeRecoveryFixed, binding: sessionCooperativeRecoveryBinding },
    { fixed: itemEffectsFixed, binding: sessionItemEffectsBinding },
    { fixed: throwFeedbackFixed, binding: sessionThrowFeedbackBinding },
    { fixed: enemyCastFixed, binding: sessionEnemyCastBinding },
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

function sourceExcerpt(bytes, range) {
  const [first, last = first] = range.split('-').map(Number)
  let offset = 0
  let start = 0
  for (let line = 1; line <= last; line++) {
    if (line === first) start = offset
    const newline = bytes.indexOf(10, offset)
    offset = newline < 0 ? bytes.length : newline + 1
  }
  return bytes.subarray(start, offset)
}

function assertSessionReferences(before, current, { readSource, fixed, binding }) {
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
    if (binding.requireExactExcerpt)
      assert(
        sourceExcerpt(sources.read(reference.path), reference.lines).equals(
          sourceExcerpt(fixedSources.read(old.path), old.lines),
        ),
        'battle session bridge changed the accepted caller excerpt',
      )
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

function assertSessionEvidenceRebinding(previousBytes, currentBytes, bridge) {
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
    bridge.binding,
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
    assertSessionEvidenceRebinding(stage.before, stage.after ?? currentBytes, stage)
}

function restoreSessionCatalogEntry(before, current, bridge) {
  assert.equal(before?.id, sessionId, 'battle session owner is absent from the accepted catalog')
  assert.equal(current?.id, sessionId, 'battle session owner catalog identity or order changed')
  const changed = assertSessionReferences(before.sourceRefs, current.sourceRefs, bridge)
  const history = restoreSessionHistory(
    before.revision.history,
    current.revision.history,
    changed,
    bridge.readSource,
    bridge.binding,
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
      entry = restoreSessionCatalogEntry(previous, entry, stage)
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
