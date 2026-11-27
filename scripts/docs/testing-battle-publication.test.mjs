import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateCanonicalEvidence, validateCatalog } from './check-testing.mjs'
import { documentLocationAdmission } from './document-location-admission.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import {
  assertTestingAcquisitionSourceBridge,
  testingAcquisitionSourceBase,
} from './testing-acquisition-source-bridge.mjs'
import {
  assertTestingBattleClosureAddition,
  assertTestingBattleEvidence,
  assertTestingBattlePublication,
  assertTestingBattleSessionSourceBridge,
  assertTestingProjectVictoryVersionSource,
  isTestingBattleEvidencePath,
  isTestingBattleReviewSource,
  restoreTestingBattleClosureSourceBindings,
  restoreTestingBattleDefeatSourceBindings,
  restoreTestingBattleHandoffSourceBindings,
  restoreTestingBattleLifecycleSourceBindings,
  restoreTestingBattleReviewSourceBindings,
  restoreTestingBattleVictorySourceBindings,
  restoreTestingProjectVictoryVersionBindings,
  restoreTestingReforgeSceneOwnershipBindings,
  restoreTestingRuntimeOwnershipSourceBindings,
  testingBattleClosurePublicationBase,
  testingBattleDefeatSourceRevision,
  testingBattleHandoffPublicationBase,
  testingBattleHandoffSourceRevision,
  testingBattleLifecyclePublicationBase,
  testingBattlePublicationBase,
  testingBattleReviewPublicationBase,
  testingBattleSessionCadenceBase,
  testingBattleSessionCasualtyBase,
  testingBattleSessionCasualtyDialogueBase,
  testingBattleSessionMechanismBase,
  testingBattleSessionPlayerActionsBase,
  testingBattleSessionPortraitBase,
  testingBattleSessionPresentationBase,
  testingBattleSessionSourcePath,
  testingBattleVictoryPublicationBase,
  testingBattleVictorySourceRevision,
  testingProjectVictoryPublicationBase,
  testingProjectVictoryVersionPath,
  testingReforgeSceneOwnershipBase,
  testingRuntimeOwnershipPublicationBase,
} from './testing-battle-publication.mjs'

const repository = fileURLToPath(new URL('../../', import.meta.url))
const catalogPath = 'docs/testing/catalog.json'
const evidencePath = 'docs/testing/domains/cross-phase/battle-foundation/evidence.json'
const sessionEvidence = 'docs/testing/domains/runtime/battle/battle-session-owners/evidence.json'
const sessionReceipt = 'docs/tasks/evidence/E2E-Q2-1-battle-session-source-applicability.md'
const bytes = (value) => Buffer.from(JSON.stringify(value))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const fixed = new Map()
function readFixed(revision, path) {
  const key = `${revision}:${path}`
  if (!fixed.has(key))
    fixed.set(
      key,
      execFileSync('git', ['show', key], { cwd: repository, maxBuffer: 16 * 1024 * 1024 }),
    )
  return fixed.get(key)
}

test('runtime source replay preserves the published Q2 quest report and rejects later prose changes', () => {
  const path = 'docs/testing/domains/cross-phase/battle-foundation/report.md'
  const reviewedRevision = '3666efdf8e7afd1e87d601045b22fbd7c3e541b4'
  const { testingQ2QuestReportRevision, testingRuntimeOwnershipSourceRevision } =
    documentLocationAdmission
  const current = readFixed(testingQ2QuestReportRevision, path).toString().split('\n')
  const governed = readFixed(reviewedRevision, path).toString().split('\n')
  current[current.indexOf('<!-- testing-meta') + 1] =
    governed[governed.indexOf('<!-- testing-meta') + 1]
  const inputs = {
    readSource: (source) => readFixed(reviewedRevision, source),
    readBase: (source) => readFixed(testingRuntimeOwnershipPublicationBase, source),
    readFixed: (source) => readFixed(testingRuntimeOwnershipSourceRevision, source),
    readQ2QuestReport: (source) => readFixed(testingQ2QuestReportRevision, source),
  }
  const restore = (text) =>
    restoreTestingRuntimeOwnershipSourceBindings(path, Buffer.from(text), inputs)
  const report = current.join('\n')
  assert.deepEqual(restore(report), inputs.readBase(path))
  assert.throws(
    () => restore(report.replace('四件剧情道具的主线复验\n', '四件剧情道具的主线复验（改写）\n')),
    /runtime ownership report changed outside its source links/,
  )
})

function fixture() {
  const before = JSON.parse(readFixed(testingBattlePublicationBase, catalogPath))
  const entry = {
    id: 'q2-battle-foundation',
    kind: 'report',
    title: 'Synthetic battle publication validator fixture; no gameplay credit',
    status: 'verified',
    phase: ['phase1', 'phase2'],
    engines: ['game', 'reforge'],
    owner: 'Fixture',
    provenance: ['Synthetic validator input, not an engine acceptance receipt'],
    domain: 'cross-phase',
    module: 'battle-foundation',
    canonical: 'domains/cross-phase/battle-foundation/report.md',
    index: 'domains/cross-phase/battle-foundation/README.md',
    evidence: 'domains/cross-phase/battle-foundation/evidence.json',
    tags: ['battle-foundation'],
    lastVerified: '2026-11-07',
    dependsOn: [],
    sourceRefs: [
      {
        path: 'caller.mjs',
        lines: '1',
        anchor: 'export function selectLivingTarget',
        role: 'fixture-caller',
        sha256: hash(source),
      },
    ],
    publicCallers: ['selectLivingTarget([{ id: 1, hp: 1 }])'],
    legalInputs: ['One living fixture target; this validates publication, not battle behavior'],
    businessOracle: {
      type: 'fixture',
      assertions: ['Native receipt remains paired and byte-bound'],
    },
    dedupe: { result: 'reviewed', against: ['Existing native stage publication contract'] },
    revision: {
      currentSha: testingBattlePublicationBase,
      contentVersion: 23,
      minimumSaveVersion: 12,
      history: [{ action: 'synthetic-publication-fixture', runtimeCredit: false }],
    },
  }
  const current = structuredClone(before)
  current.entries.push(entry)
  current._governance.entryReadings.push({
    id: entry.id,
    conclusion: 'Synthetic schema-only fixture; no new engine execution or coverage acceptance.',
  })
  const additions = new Map(
    [
      [entry.canonical, 'test-domain-report-v1'],
      [entry.index, 'governance-index-v1'],
      [entry.evidence, 'test-machine-evidence-v1'],
    ].map(([path, templateId]) => [`docs/testing/${path}`, { templateId }]),
  )
  const evidence = {
    schemaVersion: 2,
    id: entry.id,
    kind: 'runtime-execution',
    status: entry.status,
    candidateSha: entry.revision.currentSha,
    versions: { content: 23, minimumSave: 12 },
    execution: {
      commands: [['node', 'caller.mjs']],
      cwd: '/synthetic-validator-fixture',
      exitCode: 0,
      signal: null,
      scope: 'Parser fixture only; this object is not published as engine execution',
    },
    ...Object.fromEntries(
      ['sourceRefs', 'publicCallers', 'legalInputs', 'businessOracle', 'dedupe'].map((key) => [
        key,
        structuredClone(entry[key]),
      ]),
    ),
    steps: [{ id: 'fixture', result: 'recorded' }],
    hashes: { fixture: hash(raw) },
    artifacts: [{ path: 'fixture.raw', sha256: hash(raw) }],
    runtimeExecution: { performed: true },
    claims: [{ id: 'fixture', result: 'runtime-backed', evidence: ['fixture.raw'] }],
    findings: [],
    failures: [],
    cleanup: { userStateWritten: false },
    history: structuredClone(entry.revision.history),
    _governance: {
      templateId: 'test-machine-evidence-v1',
      templateVersion: '1.5.0',
      variant: 'execution',
      lastReviewed: '2026-11-07',
      owner: 'Fixture',
      provenance: ['Synthetic parser input only'],
      sourceSha256: hash(source),
      sourceGitObject: 'a'.repeat(40),
      scope: 'No actual engine execution or runtime acceptance is asserted by this unit fixture',
      beforeAfter: 'One appended synthetic record; predecessor unchanged',
      stopLine: 'No gameplay credit',
      nextStep: 'Actual engine evidence belongs to the separately reviewed Q2 report',
    },
  }
  return {
    before,
    current,
    entry,
    evidence,
    additions,
    check: () => assertTestingBattlePublication(bytes(before), bytes(current), additions),
  }
}

const source = 'export function selectLivingTarget(targets) { return targets[0].id }\n'
const raw = 'Synthetic schema validator fixture; no gameplay execution credit.\n'
const registry = JSON.parse(
  readFileSync(join(repository, 'docs/phase-governance/templates/registry.json')),
)

function sessionRebindingFixture(revision = testingBattlePublicationBase, changeSource) {
  const original = fixture()
  const published = revision !== testingBattlePublicationBase
  const portrait = revision === testingBattleSessionPortraitBase
  const presentation = revision === testingBattleSessionPresentationBase
  const cadence = revision === testingBattleSessionCadenceBase
  const playerActions = revision === testingBattleSessionPlayerActionsBase
  const casualtyDialogue = revision === testingBattleSessionCasualtyDialogueBase || playerActions
  const casualty = revision === testingBattleSessionCasualtyBase || casualtyDialogue
  const current = published ? JSON.parse(readFixed(revision, catalogPath)) : original.current
  const previousCatalog = readFixed(testingBattlePublicationBase, catalogPath)
  const previousEvidence = readFixed(testingBattlePublicationBase, sessionEvidence)
  const evidence = JSON.parse(readFixed(revision, sessionEvidence))
  const owner = current.entries.find(({ id }) => id === evidence.id)
  const oldSource = readFixed(revision, testingBattleSessionSourcePath).toString('utf8')
  const sessionSource = Buffer.from(`\n${changeSource ? changeSource(oldSource) : oldSource}`)
  const snapshot = (fixedRevision) => ({
    revision: fixedRevision,
    readSource: (path) => readFixed(fixedRevision, path),
  })
  const bridge = {
    readSource(path) {
      if (path === testingBattleSessionSourcePath) return sessionSource
      if (path === sessionReceipt) return Buffer.from('# Synthetic test receipt\n')
      return undefined
    },
    fixed: snapshot(testingBattlePublicationBase),
    ...(published ? { mechanismFixed: snapshot(testingBattleSessionMechanismBase) } : {}),
    ...(portrait || presentation || cadence || casualty
      ? { portraitFixed: snapshot(testingBattleSessionPortraitBase) }
      : {}),
    ...(presentation || cadence || casualty
      ? { presentationFixed: snapshot(testingBattleSessionPresentationBase) }
      : {}),
    ...(cadence || casualty ? { cadenceFixed: snapshot(testingBattleSessionCadenceBase) } : {}),
    ...(casualty ? { casualtyFixed: snapshot(testingBattleSessionCasualtyBase) } : {}),
    ...(casualtyDialogue
      ? { casualtyDialogueFixed: snapshot(testingBattleSessionCasualtyDialogueBase) }
      : {}),
    ...(playerActions
      ? { playerActionsFixed: snapshot(testingBattleSessionPlayerActionsBase) }
      : {}),
  }
  const previousSourceRefs = evidence.sourceRefs.filter(
    ({ path }) => path === testingBattleSessionSourcePath,
  )
  const newRefs = evidence.sourceRefs.map((reference) => {
    if (reference.path !== testingBattleSessionSourcePath) return reference
    const lines = reference.lines.replace(/\d+/gu, (line) => String(Number(line) + 1))
    const claimPointers = evidence.claims[0].evidence
    const pointerIndex = claimPointers.indexOf(`${reference.path}:${reference.lines}`)
    assert(pointerIndex >= 0)
    claimPointers[pointerIndex] = `${reference.path}:${lines}`
    return { ...reference, lines, sha256: hash(sessionSource) }
  })
  const event = {
    action: {
      [testingBattlePublicationBase]: 'q2-battle-session-source-rebinding',
      [testingBattleSessionMechanismBase]: 'q2-battle-session-mechanism-source-rebinding',
      [testingBattleSessionPortraitBase]: 'q2-battle-session-portrait-source-rebinding',
      [testingBattleSessionPresentationBase]: 'q2-battle-session-presentation-source-rebinding',
      [testingBattleSessionCadenceBase]: 'q2-battle-session-cadence-source-rebinding',
      [testingBattleSessionCasualtyBase]: 'q2-battle-session-casualty-source-rebinding',
      [testingBattleSessionCasualtyDialogueBase]:
        'q2-battle-session-casualty-dialogue-source-rebinding',
      [testingBattleSessionPlayerActionsBase]: 'q2-battle-session-player-actions-source-rebinding',
    }[revision],
    base: revision,
    date: playerActions
      ? '2026-11-13'
      : presentation || cadence || casualty
        ? '2026-11-12'
        : '2026-11-11',
    evidence: sessionReceipt,
    previousSourceRefs,
    scope: 'Synthetic source shift for the admitted battle session callers.',
  }
  evidence.sourceRefs = newRefs
  owner.sourceRefs = structuredClone(newRefs)
  evidence.history.push(structuredClone(event))
  owner.revision.history.push(structuredClone(event))
  return {
    catalog: current,
    owner,
    evidence,
    checkCatalog: () => {
      const currentCatalog = bytes(current)
      const beforeDefeat = playerActions
        ? restoreTestingBattleDefeatSourceBindings(catalogPath, currentCatalog, {
            readSource: (path) => readFixed(revision, path),
            readBase: (path) => readFixed(testingBattleSessionCasualtyDialogueBase, path),
            readFixed: (path) => readFixed(testingBattleDefeatSourceRevision, path),
          })
        : currentCatalog
      assertTestingBattlePublication(previousCatalog, beforeDefeat, original.additions, bridge)
    },
    checkEvidence: () =>
      assertTestingBattleSessionSourceBridge(
        sessionEvidence,
        previousEvidence,
        bytes(evidence),
        bridge,
      ),
  }
}

test('ordinary defeat source rebinding preserves the exact previous execution record', () => {
  const hostEvidence = 'docs/testing/domains/runtime/battle/battle-host/evidence.json'
  const readBase = (path) => readFixed(testingBattleSessionCasualtyDialogueBase, path)
  const readCandidate = (path) => readFixed(testingBattleDefeatSourceRevision, path)
  const readDefeatPublication = (path) => readFixed(testingBattleVictoryPublicationBase, path)
  const bridge = { readBase, readFixed: readCandidate, readSource: readDefeatPublication }
  const current = JSON.parse(readDefeatPublication(hostEvidence))
  const check = () => restoreTestingBattleDefeatSourceBindings(hostEvidence, bytes(current), bridge)
  assert.deepEqual(check(), readBase(hostEvidence))

  const previousRange = current.claims[0].evidence[0]
  current.claims[0].evidence[0] = 'packages/reforge/src/main.ts:1242-1261'
  assert.throws(check, /Expected values to be strictly equal/u)
  current.claims[0].evidence[0] = previousRange
  current.runtimeExecution.performed = !current.runtimeExecution.performed
  assert.throws(check, /Expected values to be strictly deep-equal/u)
})

test('world victory source rebinding restores the published defeat evidence and rejects forged scope', () => {
  const hostEvidence = 'docs/testing/domains/runtime/battle/battle-host/evidence.json'
  const readBase = (path) => readFixed(testingBattleVictoryPublicationBase, path)
  const readCandidate = (path) => readFixed(testingBattleVictorySourceRevision, path)
  const readVictoryPublication = (path) => readFixed(testingBattleHandoffPublicationBase, path)
  const bridge = { readBase, readFixed: readCandidate, readSource: readVictoryPublication }
  const current = JSON.parse(readVictoryPublication(hostEvidence))
  const check = (evidence, inputs = bridge) =>
    restoreTestingBattleVictorySourceBindings(hostEvidence, bytes(evidence), inputs)
  assert.deepEqual(check(current), readBase(hostEvidence))

  const movedClaim = structuredClone(current)
  movedClaim.claims[0].evidence[0] = 'packages/reforge/src/main.ts:1245-1266'
  assert.throws(() => check(movedClaim), /Expected values to be strictly equal/u)

  const promotedExecution = structuredClone(current)
  promotedExecution.runtimeExecution.performed = !current.runtimeExecution.performed
  assert.throws(() => check(promotedExecution), /Expected values to be strictly deep-equal/u)

  const changedPort = structuredClone(current)
  const main = 'packages/reforge/src/main.ts'
  const changedSource = Buffer.from(
    readVictoryPublication(main).toString().replace('deferRecovery: true', 'deferRecovery: false'),
  )
  const reference = changedPort.sourceRefs.find(({ path }) => path === main)
  reference.sha256 = hash(changedSource)
  assert.throws(
    () =>
      check(changedPort, {
        ...bridge,
        readSource: (path) => (path === main ? changedSource : readVictoryPublication(path)),
      }),
    /encounter source differs from the frozen Q2 candidate/u,
  )
})

test('hostile handoff source bindings preserve published owners and their original execution', () => {
  const paths = [
    'docs/testing/domains/runtime/battle/battle-host/evidence.json',
    sessionEvidence,
    'docs/testing/domains/runtime/scene/active-scene/evidence.json',
    'docs/testing/domains/runtime/world/world-runtime/evidence.json',
    'docs/testing/domains/cross-phase/script-corrections/evidence.json',
    'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
  ]
  const readBase = (path) => readFixed(testingBattleHandoffPublicationBase, path)
  const readCandidate = (path) => readFixed(testingBattleHandoffSourceRevision, path)
  const readLive = (path) => readFixed(testingBattleLifecyclePublicationBase, path)
  const bridge = { readBase, readFixed: readCandidate, readSource: readLive }
  const versionBridge = {
    ...bridge,
    readBase: (path) => readFixed(testingProjectVictoryPublicationBase, path),
  }
  const restore = (path, value, inputs = bridge) =>
    restoreTestingBattleHandoffSourceBindings(path, value, inputs)
  const priorVersion = (path) =>
    restoreTestingProjectVictoryVersionBindings(path, readLive(path), versionBridge)

  for (const path of paths)
    assert.deepEqual(JSON.parse(restore(path, priorVersion(path))), JSON.parse(readBase(path)))
  const opening = 'docs/testing/e2e/evidence/e2e-001.json'
  const openingBytes = readLive(opening)
  assert.equal(restore(opening, openingBytes), openingBytes)
  const session = JSON.parse(priorVersion(sessionEvidence))
  const catalog = JSON.parse(restore(catalogPath, priorVersion(catalogPath)))
  const previous = JSON.parse(readBase(catalogPath))
  const ids = new Set(paths.map((path) => JSON.parse(readBase(path)).id))
  assert.deepEqual(
    catalog.entries.filter(({ id }) => ids.has(id)),
    previous.entries.filter(({ id }) => ids.has(id)),
  )

  const liveVersion = assertTestingProjectVictoryVersionSource(versionBridge)
  const wrongVersion = Buffer.from(
    liveVersion.toString().replace('CONTENT_VERSION = 23', 'CONTENT_VERSION = 24'),
  )
  assert.notDeepEqual(wrongVersion, liveVersion)
  assert.throws(
    () =>
      assertTestingProjectVictoryVersionSource({
        ...versionBridge,
        readSource: (path) =>
          path === testingProjectVictoryVersionPath ? wrongVersion : readLive(path),
      }),
    /version source differs from the frozen project victory candidate/u,
  )

  const hostEvidence = paths[0]
  const host = JSON.parse(readLive(hostEvidence))
  host.history[0].date = '2026-10-03'
  assert.throws(
    () => restoreTestingProjectVictoryVersionBindings(hostEvidence, bytes(host), versionBridge),
    /old history changed/u,
  )

  const correctionsPath = 'docs/testing/domains/cross-phase/script-corrections/evidence.json'
  const corrections = JSON.parse(readLive(correctionsPath))
  corrections.claims[0].result = 'source-backed'
  assert.throws(
    () => restore(correctionsPath, bytes(corrections)),
    /Expected values to be strictly deep-equal/u,
  )

  const rotationPath = 'docs/testing/domains/phase1-runtime/control-rotation/evidence.json'
  const rotation = JSON.parse(readLive(rotationPath))
  const direction = rotation.sourceRefs.find(({ role }) => role === 'movement-oracle')
  assert(direction)
  const changedMovement = Buffer.from(
    readLive(direction.path)
      .toString()
      .replace('down: { dx: -X_STEP, dy: Y_STEP }', 'down: { dx: 0, dy: Y_STEP }'),
  )
  direction.sha256 = hash(changedMovement)
  assert.throws(
    () =>
      restore(rotationPath, bytes(rotation), {
        ...bridge,
        readSource: (path) => (path === direction.path ? changedMovement : readLive(path)),
      }),
    /encounter source differs from the frozen Q2 candidate/u,
  )

  const wrongPointer = structuredClone(session)
  wrongPointer.claims[0].evidence[1] = `${session.history.at(-1).previousSourceRefs[1].path}:381-392`
  assert.throws(
    () => restore(sessionEvidence, bytes(wrongPointer)),
    /Expected values to be strictly equal/u,
  )

  const changedSource = Buffer.from(
    readLive(testingBattleSessionSourcePath)
      .toString()
      .replace(
        '...(opts.worldSettlement ? { worldSettlement: opts.worldSettlement } : {}),',
        '...(opts.worldSettlement ? { worldSettlement: { boss: true } } : {}),',
      ),
  )
  const forged = structuredClone(session)
  for (const ref of forged.sourceRefs)
    if (ref.path === testingBattleSessionSourcePath) ref.sha256 = hash(changedSource)
  assert.throws(
    () =>
      restore(sessionEvidence, bytes(forged), {
        ...bridge,
        readSource: (path) =>
          path === testingBattleSessionSourcePath ? changedSource : readLive(path),
      }),
    /encounter source differs from the frozen Q2 candidate/u,
  )
})

test('battle lifecycle sources bind their current ranges while retaining the prior native claims', () => {
  const readBase = (path) => readFixed(testingBattleLifecyclePublicationBase, path)
  const readSource = (path) => readFixed(testingBattleClosurePublicationBase, path)
  const readCandidate = (path) =>
    readFixed(documentLocationAdmission.testingBattleLifecycleSourceRevision, path)
  const bridge = { readBase, readFixed: readCandidate, readSource }
  const current = JSON.parse(readSource(sessionEvidence))
  const check = (value, inputs = bridge) =>
    restoreTestingBattleLifecycleSourceBindings(sessionEvidence, bytes(value), inputs)
  assert.deepEqual(check(current), readBase(sessionEvidence))

  const changedClaim = structuredClone(current)
  changedClaim.claims[0].evidence[0] = `${testingBattleSessionSourcePath}:1`
  assert.throws(() => check(changedClaim), /Expected values to be strictly equal/u)

  const changedSource = Buffer.concat([
    readSource(testingBattleSessionSourcePath),
    Buffer.from('\n'),
  ])
  const tampered = structuredClone(current)
  for (const ref of tampered.sourceRefs)
    if (ref.path === testingBattleSessionSourcePath) ref.sha256 = hash(changedSource)
  assert.throws(
    () =>
      check(tampered, {
        ...bridge,
        readSource: (path) =>
          path === testingBattleSessionSourcePath ? changedSource : readSource(path),
      }),
    /encounter source differs from the frozen Q2 candidate/u,
  )
})

test('battle presentation review preserves the accepted shell callers and opening render oracle', () => {
  const readBase = (path) => readFixed(testingBattleReviewPublicationBase, path)
  const readCandidate = (path) => readFixed('af644d2fd07b2d1ed528e50680ac0ad99a891116', path)
  const bridge = { readBase, readFixed: readCandidate, readSource: readCandidate }
  const opening = 'scripts/e2e/opening-trace.test.mjs'
  const oldCatalog = JSON.parse(readBase(catalogPath))
  const currentCatalog = structuredClone(oldCatalog)
  const reviewedIds = []

  for (const entry of currentCatalog.entries) {
    const previousSourceRefs = entry.sourceRefs.filter(({ path }) =>
      isTestingBattleReviewSource(path),
    )
    if (!previousSourceRefs.length) continue
    reviewedIds.push(entry.id)
    const historyEvent = {
      action: 'q2-battle-review-source-rebinding',
      base: testingBattleReviewPublicationBase,
      date: '2026-11-15',
      evidence: sessionReceipt,
      previousSourceRefs,
      scope: 'The original caller and opening render excerpts retain their approved bytes.',
    }
    entry.sourceRefs = entry.sourceRefs.map((ref) =>
      isTestingBattleReviewSource(ref.path)
        ? {
            ...ref,
            lines: ref.path === opening ? '554-669' : ref.lines,
            sha256: hash(readCandidate(ref.path)),
          }
        : ref,
    )
    entry.revision.history.push(historyEvent)
    const path = `docs/testing/${entry.evidence}`
    const prior = readBase(path)
    const evidence = JSON.parse(prior)
    evidence.sourceRefs = entry.sourceRefs
    evidence.history.push(historyEvent)
    const oldPointer = `${opening}:551-666`
    const newPointer = `${opening}:554-669`
    const openingClaim = evidence.claims.find((claim) => claim.evidence.includes(oldPointer))
    if (openingClaim) openingClaim.evidence[openingClaim.evidence.indexOf(oldPointer)] = newPointer

    const restore = (current, inputs = bridge) =>
      restoreTestingBattleReviewSourceBindings(path, bytes(current), inputs)
    assert.deepEqual(restore(evidence), prior)
    if (openingClaim) {
      openingClaim.evidence[openingClaim.evidence.indexOf(newPointer)] = oldPointer
      assert.throws(() => restore(evidence), /Expected values to be strictly equal/u)
    }
    if (entry.id === 'runtime-active-scene') {
      const shellPath = previousSourceRefs[0].path
      const changed = Buffer.concat([readCandidate(shellPath), Buffer.from('\n')])
      const source = (file) => (file === shellPath ? changed : readCandidate(file))
      const forged = structuredClone(evidence)
      for (const ref of forged.sourceRefs) if (ref.path === shellPath) ref.sha256 = hash(changed)
      assert.throws(
        () => restore(forged, { ...bridge, readSource: source }),
        /encounter source differs from the frozen Q2 candidate/u,
      )
    }
  }

  assert.deepEqual(reviewedIds, [
    'e2e-common-issues',
    'e2e-001',
    'runtime-active-scene',
    'runtime-battle-host',
    'runtime-world-owners',
    'game-script-corrections',
  ])
  assert.deepEqual(
    JSON.parse(
      restoreTestingBattleReviewSourceBindings(catalogPath, bytes(currentCatalog), bridge),
    ),
    oldCatalog,
  )
})

test('battle closure restores four live source records and only appends paired Q2 execution', () => {
  const revision = '73c189a0a5004ce2fa6315087fc58d739651024b'
  const readBase = (path) => readFixed(testingBattleClosurePublicationBase, path)
  const readCandidate = (path) => readFixed(revision, path)
  const readSource = (path) => documents.get(path) ?? readCandidate(path)
  const bridge = { revision, readBase, readFixed: readCandidate, readSource }
  const documents = new Map()
  const catalog = JSON.parse(readBase(catalogPath))
  const restorable = new Map([
    ['runtime-active-scene', ['packages/reforge/src/main.ts']],
    ['runtime-battle-host', ['packages/reforge/src/main.ts']],
    ['runtime-world-owners', ['packages/reforge/src/main.ts']],
    [
      'runtime-battle-session-owners',
      [
        testingBattleSessionSourcePath,
        'packages/reforge/src/battle/battle-command-selection.test.ts',
      ],
    ],
  ])
  const moved = new Map([
    ['242-244', '246-248'],
    ['407-419', '412-424'],
    ['1254-1263', '1261-1270'],
  ])
  const history = (previousSourceRefs) => ({
    action: 'q2-battle-closure-source-rebinding',
    date: '2026-11-16',
    base: testingBattleClosurePublicationBase,
    evidence: sessionReceipt,
    previousSourceRefs,
    scope: 'Fixture for frozen-source replay. No battle execution credit.',
  })
  for (const [id, paths] of restorable) {
    const entry = catalog.entries.find((entry) => entry.id === id)
    const path = `docs/testing/${entry.evidence}`
    const previous = entry.sourceRefs.filter((ref) => paths.includes(ref.path))
    const event = history(previous)
    const evidence = JSON.parse(readBase(path))
    const claim = evidence.claims.find((entry) => entry.id === `${id}-source-contract`)
    entry.sourceRefs = entry.sourceRefs.map((ref) => {
      if (!paths.includes(ref.path)) return ref
      const lines = moved.get(ref.lines) ?? ref.lines
      const pointer = claim.evidence.indexOf(`${ref.path}:${ref.lines}`)
      assert(pointer >= 0)
      claim.evidence[pointer] = `${ref.path}:${lines}`
      return { ...ref, lines, sha256: hash(readCandidate(ref.path)) }
    })
    entry.revision.history.push(event)
    evidence.sourceRefs = entry.sourceRefs
    evidence.history.push(event)
    documents.set(path, bytes(evidence))
    assert.deepEqual(
      restoreTestingBattleClosureSourceBindings(path, bytes(evidence), bridge),
      readBase(path),
    )
  }
  const entry = catalog.entries.find(({ id }) => id === 'q2-battle-foundation')
  const previous = []
  entry.sourceRefs = entry.sourceRefs.map((ref) => {
    const oldSource = readBase(ref.path)
    const newSource = readCandidate(ref.path)
    if (oldSource.equals(newSource)) return ref
    const oldLine = oldSource.toString().split('\n')[Number(ref.lines) - 1]
    const candidateLines = newSource.toString().split('\n')
    const index = candidateLines.indexOf(oldLine)
    const lines = String(
      (index >= 0 ? index : candidateLines.findIndex((line) => line.includes(ref.anchor))) + 1,
    )
    previous.push(ref)
    return { ...ref, lines, sha256: hash(newSource) }
  })
  const caller = 'scripts/e2e/battle-misc.mjs'
  const source = readCandidate(caller)
  const anchor = 'await runBrowserJourney({'
  const lines = String(source.toString().split('\n').indexOf(anchor) + 1)
  entry.sourceRefs.push({
    path: caller,
    lines,
    anchor,
    role: 'native-caller',
    sha256: hash(source),
  })
  entry.publicCallers.push(`node ${caller} game`)
  const event = history(previous)
  entry.revision.history.push(event)
  catalog._governance.entryReadings.find(({ id }) => id === entry.id).conclusion +=
    ' Fixture append.'
  documents.set(catalogPath, bytes(catalog))
  assert.deepEqual(
    restoreTestingBattleClosureSourceBindings(catalogPath, bytes(catalog), bridge),
    readBase(catalogPath),
  )

  const prior = JSON.parse(readBase(evidencePath))
  const archive = 'docs/tasks/evidence/E2E-Q2-1-battle-closeout-20261116.tar.gz'
  const evidence = {
    ...prior,
    sourceRefs: entry.sourceRefs,
    publicCallers: entry.publicCallers,
    history: [...prior.history, event],
    artifacts: [
      ...prior.artifacts,
      { path: archive, sha256: 'a'.repeat(64), bytes: 1, purpose: 'Fixture' },
    ],
    claims: [
      ...prior.claims,
      ...[
        'battle-misc-auto-and-status',
        'authored-coop-support',
        'summon-spirit-offset',
        'battle-steal-inventory-and-feedback',
        'post-battle-growth-respawn',
      ].map((id) => ({ id, result: 'runtime-backed', evidence: [`${archive}#${id}.json`] })),
    ],
    battleClosureExecution: { producerRevision: revision },
  }
  documents.set(evidencePath, bytes(evidence))
  const check = (body) => assertTestingBattleClosureAddition(evidencePath, bytes(body), bridge)
  check(evidence)
  const reportPath = 'docs/testing/domains/cross-phase/battle-foundation/report.md'
  const report = readBase(reportPath).toString()
  const checkReport = (sourceRefs) =>
    assertTestingBattleClosureAddition(
      reportPath,
      Buffer.from(
        report.replace(/(<!-- testing-meta\n)(\{[^\n]+\})/u, (_, prefix, json) => {
          const meta = JSON.parse(json)
          return (
            prefix +
            JSON.stringify({
              ...meta,
              sourceRefs,
              publicCallers: entry.publicCallers,
              revision: { ...meta.revision, history: [...meta.revision.history, event] },
            })
          )
        }),
      ),
      bridge,
    )
  checkReport(entry.sourceRefs)
  assert.throws(
    () => checkReport(prior.sourceRefs),
    /battle closure retained stale source reference/u,
  )
  assert.throws(
    () => check({ ...evidence, execution: { ...evidence.execution, exitCode: 1 } }),
    /battle closure changed an accepted execution/u,
  )
  const overwritten = structuredClone(evidence)
  overwritten.artifacts[0].sha256 = 'b'.repeat(64)
  assert.throws(() => check(overwritten), /battle closure changed an earlier artifact/u)

  const session = JSON.parse(documents.get(sessionEvidence))
  const firstRef = session.sourceRefs[0]
  const sourceWithChangedAnchorNeighbor = Buffer.from(
    readCandidate(firstRef.path)
      .toString()
      .replace(
        'private readonly selection = new BattleCommandSelection()',
        'private readonly selection = new BattleCommandSelection() // existing caller',
      ),
  )
  for (const ref of session.sourceRefs)
    if (ref.path === firstRef.path) ref.sha256 = hash(sourceWithChangedAnchorNeighbor)
  const wrongSource = (path) =>
    path === firstRef.path ? sourceWithChangedAnchorNeighbor : readSource(path)
  assert.throws(
    () =>
      restoreTestingBattleClosureSourceBindings(sessionEvidence, bytes(session), {
        ...bridge,
        readSource: wrongSource,
      }),
    /encounter source differs from the frozen Q2 candidate/u,
  )
})

test('the admitted battle session rebind preserves the old owner and the single Q2 append', () => {
  const rebinding = sessionRebindingFixture()
  rebinding.checkCatalog()
  rebinding.checkEvidence()
})

test('the battle session bridge rejects stale references, claim pointers and audit promotion', () => {
  const rebinding = sessionRebindingFixture()
  const [first] = rebinding.evidence.sourceRefs
  const sha = first.sha256
  first.sha256 = 'a'.repeat(64)
  assert.throws(rebinding.checkEvidence, /sourceRef hash mismatch/u)
  first.sha256 = sha
  const pointers = rebinding.evidence.claims[0].evidence
  const [originalPointer] = pointers
  pointers[0] = `${first.path}:1`
  assert.throws(rebinding.checkEvidence, /pointer must follow/u)
  pointers[0] = originalPointer
  rebinding.evidence.runtimeExecution.performed = true
  assert.throws(rebinding.checkEvidence, /changed publication, execution or unrelated evidence/u)
})

test('rebind history and the rest of the accepted catalog remain fixed', () => {
  const rebinding = sessionRebindingFixture()
  const history = rebinding.evidence.history.at(-1)
  history.previousSourceRefs.pop()
  assert.throws(rebinding.checkEvidence, /previousSourceRefs do not match/u)
  rebinding.catalog.entries[0].title += ' changed'
  assert.throws(rebinding.checkCatalog, /changed existing catalog facts/u)
})

test('the mechanism rebind accepts one source update and preserves the first accepted rebind', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionMechanismBase)
  rebinding.checkCatalog()
  rebinding.checkEvidence()

  rebinding.evidence.history.at(-2).scope += ' changed'
  assert.throws(rebinding.checkEvidence, /old history changed/u)
  rebinding.owner.revision.history.at(-1).base = testingBattlePublicationBase
  assert.throws(rebinding.checkCatalog, /history must name the fixed base/u)
})

test('the portrait rebind retains both previously accepted histories', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionPortraitBase)
  rebinding.checkCatalog()
  rebinding.checkEvidence()

  rebinding.evidence.history.at(-3).scope += ' changed'
  assert.throws(rebinding.checkEvidence, /old history changed/u)
  rebinding.owner.revision.history.at(-1).previousSourceRefs.pop()
  assert.throws(rebinding.checkCatalog, /previousSourceRefs do not match/u)
})

test('the casualty rebind preserves the accepted cadence history and exact caller sources', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionCasualtyBase)
  rebinding.checkCatalog()
  rebinding.checkEvidence()

  rebinding.evidence.history.at(-2).scope += ' changed'
  assert.throws(rebinding.checkEvidence, /old history changed/u)
  rebinding.owner.revision.history.at(-1).date = '2026-11-11'
  assert.throws(rebinding.checkCatalog, /history date differs/u)
})

test('casualty dialogue rebind preserves the previously accepted physical casualty caller basis', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionCasualtyDialogueBase)
  rebinding.checkCatalog()
  rebinding.checkEvidence()

  rebinding.evidence.history.at(-2).scope += ' changed'
  assert.throws(rebinding.checkEvidence, /old history changed/u)
  rebinding.owner.revision.history.at(-1).base = testingBattleSessionCasualtyBase
  assert.throws(rebinding.checkCatalog, /history must name the fixed base/u)
})

test('player-action rebind accepts an intact caller excerpt at shifted coordinates', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionPlayerActionsBase)
  rebinding.checkCatalog()
  rebinding.checkEvidence()
})

test('player-action rebind rejects a changed caller body with a valid anchor and digest', () => {
  const rebinding = sessionRebindingFixture(testingBattleSessionPlayerActionsBase, (source) => {
    const original = 'retract: (playerIndex) => this.state.pendingActions.delete(playerIndex),'
    assert(source.includes(original))
    return source.replace(original, 'retract: () => this.state.pendingActions.clear(),')
  })
  assert.throws(
    rebinding.checkCatalog,
    /battle session bridge changed the accepted caller excerpt/u,
  )
  assert.throws(
    rebinding.checkEvidence,
    /battle session bridge changed the accepted caller excerpt/u,
  )
})

function pairedFixture(t) {
  const f = fixture()
  const root = mkdtempSync(join(tmpdir(), 'type-pal-battle-publication-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const testingRoot = join(root, 'docs/testing')
  const write = (path, text) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  write('caller.mjs', source)
  write('fixture.raw', raw)
  write(`docs/testing/${f.entry.index}`, '# Synthetic fixture index\n')
  const publish = () => {
    write(
      `docs/testing/${f.entry.canonical}`,
      `---\ntestingSchema: 2\nid: ${f.entry.id}\nevidence: ${f.entry.evidence}\n---\n\n<!-- testing-meta\n${JSON.stringify({ schemaVersion: 2, ...f.entry })}\n-->\n# Synthetic fixture report\n`,
    )
    write(evidencePath, bytes(f.evidence))
  }
  const modelIssues = () => {
    const current = bytes(f.evidence)
    const doc = { path: evidencePath, templateId: 'test-machine-evidence-v1' }
    return checkMigratedDocument(doc, registry, () => current.toString('utf8'), {
      locations: {
        additions: new Map([[doc.path, doc]]),
        changes: new Map(),
        assertCurrent: () => ({ current }),
      },
    })
  }
  publish()
  return { ...f, root, testingRoot, write, publish, modelIssues }
}

test('the single append preserves the complete accepted catalog and uses existing native metadata contracts', (t) => {
  const f = pairedFixture(t)
  const original = bytes(f.before)
  const candidate = bytes(f.current)
  f.check()
  assert.deepEqual(bytes(f.before), original)
  assert.deepEqual(bytes(f.current), candidate)
  assert.deepEqual(validateCatalog({ schemaVersion: 2, entries: [f.entry] }, f.testingRoot), [])
  assert.deepEqual(validateCanonicalEvidence(f.entry, f.testingRoot, f.root), [])
  assertTestingBattleEvidence(evidencePath, bytes(f.evidence))
  assert.deepEqual(f.modelIssues(), [])
})

test('the real accepted acquisition bridge remains required and still rejects the new member itself', () => {
  const f = fixture()
  const previous = readFixed(testingAcquisitionSourceBase, catalogPath)
  const current = readFixed(testingBattlePublicationBase, catalogPath)
  const read = (path) => readFixed(testingBattlePublicationBase, path)
  const fixed = {
    revision: testingAcquisitionSourceBase,
    readSource: (path) => readFixed(testingAcquisitionSourceBase, path),
  }
  assertTestingAcquisitionSourceBridge(catalogPath, previous, current, read, fixed)
  assert.throws(
    () =>
      assertTestingAcquisitionSourceBridge(catalogPath, previous, bytes(f.current), read, fixed),
    /catalog membership changed/,
  )
})

for (const [name, mutate] of [
  [
    'publication status',
    (f) => {
      f.current.entries[0].status = 'draft'
    },
  ],
  [
    'version',
    (f) => {
      f.current.entries[0].revision.contentVersion++
    },
  ],
  [
    'source identity',
    (f) => {
      f.current.entries[0].sourceRefs[0].sha256 = 'f'.repeat(64)
    },
  ],
  [
    'execution history',
    (f) => {
      f.current.entries[0].revision.history.push({ exitCode: 0 })
    },
  ],
  [
    'entry order',
    (f) => {
      ;[f.current.entries[0], f.current.entries[1]] = [f.current.entries[1], f.current.entries[0]]
    },
  ],
  [
    'reading',
    (f) => {
      f.current._governance.entryReadings[0].conclusion = 'changed'
    },
  ],
  [
    'catalog governance',
    (f) => {
      f.current._governance.runtimeExecutionPerformed = true
    },
  ],
]) {
  test(`publication rejects changing the old ${name}`, () => {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /battle publication changed existing catalog facts/)
  })
}

for (const [name, mutate] of [
  [
    'extra member',
    (f) => {
      f.current.entries.push({ ...f.entry, id: 'q2-extra' })
    },
  ],
  [
    'duplicate new ID',
    (f) => {
      f.current.entries.push(structuredClone(f.entry))
    },
  ],
  [
    'duplicate old ID',
    (f) => {
      f.entry.id = f.before.entries[0].id
    },
  ],
  [
    'wrong kind',
    (f) => {
      f.entry.kind = 'e2e-stage'
    },
  ],
  [
    'wrong canonical path',
    (f) => {
      f.entry.canonical = 'domains/cross-phase/other/report.md'
    },
  ],
  [
    'wrong index path',
    (f) => {
      f.entry.index = 'domains/cross-phase/other/README.md'
    },
  ],
  [
    'wrong evidence path',
    (f) => {
      f.entry.evidence = 'domains/cross-phase/other/evidence.json'
    },
  ],
]) {
  test(`publication rejects ${name}`, () => {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /only the admitted battle foundation entry may be appended/)
  })
}

test('each report/index/evidence pair must use its existing admitted template', () => {
  for (const [path] of fixture().additions) {
    const f = fixture()
    f.additions.delete(path)
    assert.throws(f.check, /battle publication requires an admitted pair/)
    f.additions.set(path, { templateId: 'guide-runbook-v1' })
    assert.throws(f.check, /battle publication requires an admitted pair/)
  }
})

test('the appended reading cannot be missing, duplicated, mismatched or empty', () => {
  for (const mutate of [
    (f) => f.current._governance.entryReadings.pop(),
    (f) => f.current._governance.entryReadings.push({ id: f.entry.id, conclusion: 'duplicate' }),
    (f) => {
      f.current._governance.entryReadings.at(-1).id = 'another-record'
    },
    (f) => {
      f.current._governance.entryReadings.at(-1).conclusion = '  '
    },
  ]) {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /battle publication requires/)
  }
})

test('native evidence is admitted only at the exact new path and identity', () => {
  const f = fixture()
  for (const path of [evidencePath.replace('battle-foundation', 'other'), `${evidencePath}.bak`]) {
    assert.equal(isTestingBattleEvidencePath(path), false)
    assert.throws(() => assertTestingBattleEvidence(path, bytes(f.evidence)), /unadmitted/)
  }
  f.evidence.id = 'e2e-010'
  assert.throws(
    () => assertTestingBattleEvidence(evidencePath, bytes(f.evidence)),
    /evidence identity differs/,
  )
})

test('a document audit or unperformed/source-only receipt cannot masquerade as native execution', () => {
  for (const mutate of [
    (e) => {
      e.schemaVersion = 1
    },
    (e) => {
      e.kind = 'document-audit'
    },
    (e) => {
      e.runtimeExecution.performed = false
    },
    (e) => {
      e._governance.variant = 'document-audit-v2'
    },
    (e) => {
      e.claims[0].result = 'source-backed'
    },
  ]) {
    const { evidence } = fixture()
    mutate(evidence)
    assert.throws(
      () => assertTestingBattleEvidence(evidencePath, bytes(evidence)),
      /must declare its actual native execution/,
    )
  }
})

test('shared validators still reject missing execution, unbound artifacts and source drift', (t) => {
  const f = pairedFixture(t)
  delete f.evidence.execution
  assert.deepEqual(f.modelIssues(), ['missing machine field: execution'])
  f.evidence.artifacts = []
  f.publish()
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('runtime claim lacks actual execution/artifacts'),
    ),
  )
  f.evidence.artifacts = [{ path: 'fixture.raw', sha256: 'f'.repeat(64) }]
  f.publish()
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('runtime artifact hash mismatch'),
    ),
  )
  f.write('caller.mjs', `${source}// source drift\n`)
  assert.ok(
    validateCanonicalEvidence(f.entry, f.testingRoot, f.root).some((issue) =>
      issue.includes('sourceRef hash mismatch'),
    ),
  )
})

test('scene ownership restores the prior source metadata while guarding the moved caller and oracle', () => {
  const path = 'docs/testing/domains/runtime/world/world-runtime/report.md'
  const readSource = (source) => readFileSync(join(repository, source))
  const readBase = (source) => readFixed(testingReforgeSceneOwnershipBase, source)
  const inputs = {
    readSource,
    readBase,
    readFixed: (source) =>
      readFixed(documentLocationAdmission.testingReforgeSceneOwnershipRevision, source),
  }
  const report = readSource(path)
  assert.deepEqual(
    restoreTestingReforgeSceneOwnershipBindings(path, report, inputs),
    readBase(path),
  )
  const wrongCaller = report
    .toString()
    .replaceAll('packages/reforge/src/main.ts:433-445', 'packages/reforge/src/main.ts:434-446')
  assert.throws(
    () => restoreTestingReforgeSceneOwnershipBindings(path, Buffer.from(wrongCaller), inputs),
    /changed published prose/,
  )
  const wrongOracle = 'packages/reforge/src/world-motion-runtime.test.ts'
  assert.throws(
    () =>
      restoreTestingReforgeSceneOwnershipBindings(path, report, {
        ...inputs,
        readSource: (source) =>
          source === wrongOracle
            ? Buffer.concat([readSource(source), Buffer.from('\n')])
            : readSource(source),
      }),
    /sourceRef hash mismatch .*world-motion-runtime/,
  )
})
