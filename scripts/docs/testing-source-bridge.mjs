import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { parseTerminalJson } from './terminal-json.mjs'
import { safeTestingPath, testingSourceRefIssues } from './testing-source-refs.mjs'

const catalogPath = 'docs/testing/catalog.json'
const activeSceneId = 'runtime-active-scene'
const cameraTestPath = 'packages/reforge/src/world-camera.test.ts'
// This finite maintenance pilot cannot be widened by the candidate manifest.
const evidenceIds = new Map([
  [
    'docs/testing/domains/phase1-runtime/dependencies/dependency-ownership/evidence.json',
    'phase1-dependency-ownership',
  ],
  ['docs/testing/domains/cross-phase/script-corrections/evidence.json', 'game-script-corrections'],
  ['docs/testing/domains/phase1-runtime/control-rotation/evidence.json', 'game-input-rotation'],
  ['docs/testing/domains/runtime/scene/active-scene/evidence.json', activeSceneId],
  ['docs/testing/domains/runtime/battle/battle-host/evidence.json', 'runtime-battle-host'],
  ['docs/testing/domains/runtime/world/world-runtime/evidence.json', 'runtime-world-owners'],
])
const sourcePaths = new Map([
  [
    'phase1-dependency-ownership',
    new Set([
      'packages/game/src/core/inventory-state.ts',
      'packages/game/src/core/equipment-state.ts',
    ]),
  ],
  [
    'game-script-corrections',
    new Set([
      'packages/game/src/core/object-script-state.ts',
      'packages/game/src/core/script-story-corrections.pal.test.ts',
      'packages/game/src/core/script-topology-corrections.pal.test.ts',
      'packages/game/src/shell/bootstrap.ts',
    ]),
  ],
  ['game-input-rotation', new Set(['packages/game/src/localization/ui-text.ts'])],
  [activeSceneId, new Set(['packages/reforge/src/main.ts', cameraTestPath])],
  ['runtime-battle-host', new Set(['packages/reforge/src/main.ts'])],
  [
    'runtime-world-owners',
    new Set([
      'packages/reforge/src/main.ts',
      'packages/reforge/src/world-scene-presentation.ts',
      'packages/reforge/src/world-scene-presentation.test.ts',
    ]),
  ],
])

export const isTestingSourceBridgePath = (path) => path === catalogPath || evidenceIds.has(path)

function stagePublication(number, slug) {
  return {
    id: `e2e-${number}`,
    kind: 'e2e-stage',
    canonical: `e2e/stages/${number}-${slug}/report.md`,
    index: `e2e/stages/${number}-${slug}/README.md`,
    evidence: `e2e/evidence/e2e-${number}.json`,
  }
}

const stagePublications = [
  stagePublication('007', 'island-entrance'),
  stagePublication('008', 'fairy-island-maze'),
  stagePublication('009', 'fairy-island-pool'),
]
const palaceStagePublication = stagePublication('010', 'water-moon-palace')
const stageEvidenceIds = new Map(
  [...stagePublications, palaceStagePublication].map(({ evidence, id }) => [
    `docs/testing/${evidence}`,
    id,
  ]),
)
export const isTestingStageEvidencePath = (path) => stageEvidenceIds.has(path)

/** A publication is a separate layer over the already verified source bridge. */
export function assertTestingStagePublication(previousBytes, currentBytes, additions) {
  assertStageAppend(
    previousBytes,
    currentBytes,
    additions,
    stagePublications,
    'only the three admitted stage entries may be appended in order',
  )
}

export function assertTestingPalaceStagePublication(previousBytes, currentBytes, additions) {
  assertStageAppend(
    previousBytes,
    currentBytes,
    additions,
    [palaceStagePublication],
    'only the admitted 010 stage entry may be appended',
  )
}

function assertStageAppend(previousBytes, currentBytes, additions, stages, suffixError) {
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  const oldEntries = before?.entries
  const oldReadings = before?._governance?.entryReadings
  const entries = current?.entries
  const readings = current?._governance?.entryReadings
  assert(
    [oldEntries, oldReadings, entries, readings].every(Array.isArray),
    'stage publication requires catalog entries and entry readings',
  )
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
    'stage publication changed existing catalog facts',
  )
  const stageIds = stages.map(({ id }) => id)
  assert(!oldEntries.some((entry) => stageIds.includes(entry?.id)), 'stage was already published')
  assert.deepEqual(
    entries.slice(oldEntries.length).map((entry) => {
      const { id, kind, canonical, index, evidence } = entry ?? {}
      return { id, kind, canonical, index, evidence }
    }),
    stages,
    suffixError,
  )
  const newReadings = readings.slice(oldReadings.length)
  assert.deepEqual(
    newReadings.map((reading) => reading?.id),
    stageIds,
    'stage publication requires a reading for each appended stage in order',
  )
  assert(
    newReadings.every(({ conclusion }) => typeof conclusion === 'string' && conclusion.trim()),
    'stage publication requires a concrete reading conclusion',
  )
  for (const { canonical, index, evidence } of stages) {
    for (const [path, templateId] of [
      [canonical, 'test-run-report-v1'],
      [index, 'test-e2e-stage-v1'],
      [evidence, 'test-machine-evidence-v1'],
    ]) {
      assert.equal(
        additions.get(`docs/testing/${path}`)?.templateId,
        templateId,
        `stage publication requires an admitted pair: ${path}`,
      )
    }
  }
}

export function assertTestingStageEvidence(path, bytes) {
  assert(isTestingStageEvidencePath(path), 'unadmitted testing stage evidence path')
  const evidence = parseTerminalJson(bytes)
  assert.equal(evidence?.id, stageEvidenceIds.get(path), 'testing stage evidence identity differs')
  assert(
    evidence.schemaVersion === 2 &&
      evidence.kind === 'runtime-execution' &&
      evidence.runtimeExecution?.performed === true &&
      evidence._governance?.variant === 'execution' &&
      Array.isArray(evidence.claims) &&
      evidence.claims.some((claim) => claim?.result === 'runtime-backed'),
    'testing stage evidence must declare its actual native execution',
  )
}

function restoreReferences(before, current, id, sources) {
  assert(
    Array.isArray(before) && Array.isArray(current) && before.length === current.length,
    'source reference membership changed',
  )
  const restored = structuredClone(current)
  const changed = []
  for (const [index, reference] of current.entries()) {
    if (same(reference, before[index])) continue
    const old = before[index]
    assert(
      reference && typeof reference === 'object' && !Array.isArray(reference),
      'source reference object required',
    )
    assert(sourcePaths.get(id)?.has(old?.path), 'source reference outside admitted bridge')
    restored[index].sha256 = old.sha256
    restored[index].lines = old.lines
    assert.deepEqual(restored[index], old, 'only reference SHA and line range may change')
    const issues = testingSourceRefIssues([reference], 'testing source bridge', sources)
    assert.equal(issues.length, 0, issues.join('\n'))
    changed.push(old)
  }
  assert(changed.length > 0, 'bridge has no changed references')
  return { restored, changed }
}

function restoreHistory(before, current, changed, readSource) {
  assert(Array.isArray(before) && Array.isArray(current), 'bridge history arrays required')
  assert.equal(current.length, before.length + 1, 'bridge appends exactly one history event')
  assert.deepEqual(current.slice(0, -1), before, 'old history changed')
  const event = current.at(-1)
  assert(
    event && typeof event === 'object' && !Array.isArray(event),
    'bridge history event required',
  )
  assert.deepEqual(
    Object.keys(event).sort(),
    ['action', 'base', 'date', 'evidence', 'previousSourceRefs', 'scope'],
    'unexpected bridge history field',
  )
  assert(
    ['action', 'scope'].every((key) => typeof event[key] === 'string' && event[key].trim()),
    'bridge explanation required',
  )
  assert(
    /^\d{4}-\d{2}-\d{2}$/.test(event.date) &&
      !Number.isNaN(Date.parse(event.date)) &&
      new Date(event.date).toISOString().slice(0, 10) === event.date &&
      /^[a-f\d]{40}$/.test(event.base),
    'bridge date/base required',
  )
  assert.deepEqual(
    event.previousSourceRefs,
    changed,
    'previousSourceRefs do not match actual changed references',
  )
  assert(
    safeTestingPath(event.evidence) &&
      event.evidence.startsWith('docs/tasks/evidence/') &&
      event.evidence.endsWith('.md'),
    'bridge evidence must be a task receipt',
  )
  assert(readSource(event.evidence)?.length > 0, 'bridge evidence missing')
  return structuredClone(before)
}

function restoreActiveSceneCameraPointer(before, current, restored) {
  const oldRef = before.sourceRefs.find((ref) => ref.path === cameraTestPath)
  const movedRef = current.sourceRefs.find((ref) => ref.path === cameraTestPath)
  if (!oldRef || !movedRef || oldRef.lines === movedRef.lines) return

  const claimIndex = before.claims?.findIndex(
    (claim) =>
      claim.id === 'runtime-active-scene-source-contract' && claim.result === 'source-backed',
  )
  const oldPointer = `${cameraTestPath}:${oldRef.lines}`
  const pointerIndex = before.claims?.[claimIndex]?.evidence?.indexOf(oldPointer) ?? -1
  const pointers = restored.claims?.[claimIndex]?.evidence
  assert(
    pointerIndex >= 0 &&
      Array.isArray(pointers) &&
      pointers[pointerIndex] === `${cameraTestPath}:${movedRef.lines}`,
    'active-scene source claim must follow the moved camera oracle',
  )
  pointers[pointerIndex] = oldPointer
}

/** Preserve the accepted object by restoring checked source bindings, the matching
 * moved camera claim pointer and append-only history. Runtime and publication are immutable. */
export function assertTestingSourceBridge(path, previousBytes, currentBytes, readSource) {
  assert(isTestingSourceBridgePath(path), 'unadmitted testing source bridge path')
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  assert(
    [before, current].every((value) => value && typeof value === 'object' && !Array.isArray(value)),
    'native bridge objects required',
  )
  const restored = structuredClone(current)
  const cache = new Map()
  const snapshot = (path) => {
    if (!cache.has(path)) cache.set(path, readSource(path))
    return cache.get(path)
  }
  const sources = { has: (path) => Buffer.isBuffer(snapshot(path)), read: snapshot }
  if (path === catalogPath) {
    assert(
      Array.isArray(before.entries) && Array.isArray(current.entries),
      'catalog entries required',
    )
    assert.equal(current.entries.length, before.entries.length, 'catalog membership changed')
    let changes = 0
    for (const [index, entry] of current.entries.entries()) {
      const old = before.entries[index]
      if (same(entry, old)) continue
      assert(
        entry && typeof entry === 'object' && !Array.isArray(entry),
        'catalog entry object required',
      )
      assert(
        sourcePaths.has(old?.id) && entry.id === old.id,
        'catalog ID/order outside admitted bridge',
      )
      const references = restoreReferences(old.sourceRefs, entry.sourceRefs, old.id, sources)
      const history = restoreHistory(
        old.revision?.history,
        entry.revision?.history,
        references.changed,
        readSource,
      )
      restored.entries[index].sourceRefs = references.restored
      restored.entries[index].revision.history = history
      changes++
    }
    assert(changes > 0, 'catalog bridge has no changed entries')
  } else {
    const id = evidenceIds.get(path)
    assert.equal(before.id, id, 'evidence ID differs from its admitted path')
    assert.equal(current.id, id, 'evidence ID changed')
    const references = restoreReferences(before.sourceRefs, current.sourceRefs, id, sources)
    restored.sourceRefs = references.restored
    if (id === activeSceneId) restoreActiveSceneCameraPointer(before, current, restored)
    restored.history = restoreHistory(
      before.history,
      current.history,
      references.changed,
      readSource,
    )
  }
  assert.deepEqual(
    restored,
    before,
    'bridge changed publication, execution or unrelated native facts',
  )
}
