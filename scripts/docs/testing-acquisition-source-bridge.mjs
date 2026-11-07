import assert from 'node:assert/strict'
import { isDeepStrictEqual as same } from 'node:util'
import { decodeTerminalUtf8, parseTerminalJson } from './terminal-json.mjs'
import {
  assertTestingBridgeReference,
  restoreTestingBridgeHistory,
  testingBridgeSources,
} from './testing-source-bridge.mjs'

export const testingAcquisitionSourceBase = '0973c2c25795fd2aacf78daedebb8d8f2a5113fc'
export const testingAcquisitionSourceReceipt =
  'docs/tasks/evidence/N6B-ITEM-FLOWS-1-source-applicability.md'
export const testingAcquisitionSourceAction = 'content23-acquisition-source-rebinding'
const catalogPath = 'docs/testing/catalog.json'
const contentVersionPath = 'packages/content/src/character.ts'
const innPath = 'scripts/e2e/inn-contract.mjs'
const kitchenPath = 'scripts/e2e/kitchen-contract.mjs'

// These 32 ID/path pairs are the actual changed sources in the accepted content23
// candidate. Neither a manifest nor a caller can widen this successor layer.
export const testingAcquisitionSourceBindings = Object.freeze(
  [
    ['e2e-contract', 'e2e/evidence/e2e-contract.json', [contentVersionPath]],
    ['e2e-route', 'e2e/evidence/e2e-route.json', [innPath, contentVersionPath]],
    ['e2e-common-issues', 'e2e/evidence/e2e-common-issues.json', [kitchenPath]],
    ['e2e-001', 'e2e/evidence/e2e-001.json', [contentVersionPath]],
    ['e2e-002', 'e2e/evidence/e2e-002.json', [innPath, contentVersionPath]],
    ['e2e-003', 'e2e/evidence/e2e-003.json', [kitchenPath, contentVersionPath]],
    ['e2e-004', 'e2e/evidence/e2e-004.json', [contentVersionPath]],
    ['e2e-005', 'e2e/evidence/e2e-005.json', [contentVersionPath]],
    [
      'e2e-006',
      'e2e/evidence/e2e-006-current.json',
      [
        'scripts/e2e/boat-delivery.mjs',
        'scripts/e2e/boat-checkpoint-contract.mjs',
        contentVersionPath,
      ],
    ],
    [
      'runtime-active-scene',
      'domains/runtime/scene/active-scene/evidence.json',
      [contentVersionPath],
    ],
    [
      'runtime-battle-host',
      'domains/runtime/battle/battle-host/evidence.json',
      [contentVersionPath],
    ],
    [
      'runtime-battle-session-owners',
      'domains/runtime/battle/battle-session-owners/evidence.json',
      ['packages/reforge/src/battle/battle-session.ts', contentVersionPath],
    ],
    [
      'runtime-world-owners',
      'domains/runtime/world/world-runtime/evidence.json',
      [contentVersionPath],
    ],
    [
      'legacy-flat-audit',
      'domains/ops/testing-governance/legacy-flat-audit.json',
      [contentVersionPath],
    ],
    [
      'editor-command-form-families',
      'domains/editor/commands/command-form-families/evidence.json',
      ['packages/editor/src/ui/command-form-contract.ts', contentVersionPath],
    ],
    [
      'reforge-menu-session',
      'domains/runtime/menu/menu-session/evidence.json',
      [contentVersionPath],
    ],
    [
      'editor-map-workspace-sessions',
      'domains/editor/map/map-workspace-sessions/evidence.json',
      [contentVersionPath],
    ],
    [
      'phase1-dependency-ownership',
      'domains/phase1-runtime/dependencies/dependency-ownership/evidence.json',
      [contentVersionPath],
    ],
    [
      'game-script-corrections',
      'domains/cross-phase/script-corrections/evidence.json',
      ['packages/reforge/src/pal-story-corrections.test.ts'],
    ],
    ['e2e-007', 'e2e/evidence/e2e-007.json', [contentVersionPath]],
    [
      'e2e-008',
      'e2e/evidence/e2e-008.json',
      ['scripts/e2e/fairy-island-maze-reforge.mjs', contentVersionPath],
    ],
    [
      'e2e-009',
      'e2e/evidence/e2e-009.json',
      [
        'scripts/e2e/fairy-island-pool-reforge.mjs',
        'projects/pal/content/scenes/s016.json',
        contentVersionPath,
      ],
    ],
  ].map(([id, path, sourcePaths]) =>
    Object.freeze({ id, path: `docs/testing/${path}`, sourcePaths: Object.freeze(sourcePaths) }),
  ),
)

const bindingsById = new Map(testingAcquisitionSourceBindings.map((entry) => [entry.id, entry]))
const bindingsByPath = new Map(testingAcquisitionSourceBindings.map((entry) => [entry.path, entry]))
const reportBindings = new Map([
  ['docs/testing/e2e/stages/007-island-entrance/report.md', bindingsById.get('e2e-007')],
  ['docs/testing/e2e/stages/008-fairy-island-maze/report.md', bindingsById.get('e2e-008')],
  ['docs/testing/e2e/stages/009-fairy-island-pool/report.md', bindingsById.get('e2e-009')],
])
const sourcePaths = new Set(testingAcquisitionSourceBindings.flatMap((entry) => entry.sourcePaths))
export const isTestingAcquisitionSourceBridgePath = (path) =>
  path === catalogPath || bindingsByPath.has(path) || reportBindings.has(path)
export const isTestingAcquisitionSourcePath = (path) => sourcePaths.has(path)

function restoreReferences(before, current, binding, sources, fixedSources) {
  assert(
    Array.isArray(before) && Array.isArray(current) && before.length === current.length,
    'source reference membership changed',
  )
  const restored = structuredClone(current)
  const changed = []
  for (const [index, reference] of current.entries()) {
    const old = before[index]
    const admitted = binding.sourcePaths.includes(old?.path)
    if (same(reference, old)) {
      assert(!admitted, 'acquisition bridge must rebind every admitted source reference')
      continue
    }
    assert(admitted, 'source reference outside admitted acquisition bridge')
    assert(
      reference && typeof reference === 'object' && !Array.isArray(reference),
      'source reference object required',
    )
    restored[index].sha256 = old.sha256
    restored[index].lines = old.lines
    if (
      ['e2e-007', 'e2e-009'].includes(binding.id) &&
      old.path === contentVersionPath &&
      old.anchor === 'export const CONTENT_VERSION = 22'
    ) {
      assert.equal(
        reference.anchor,
        'export const CONTENT_VERSION = 23',
        'version anchor must advance exactly 22 to 23',
      )
      restored[index].anchor = old.anchor
    }
    assert.deepEqual(
      restored[index],
      old,
      'only source SHA, range and the admitted version anchor may change',
    )
    assertTestingBridgeReference(old, fixedSources)
    assertTestingBridgeReference(reference, sources)
    assert.notEqual(reference.sha256, old.sha256, 'acquisition source bytes must actually change')
    changed.push(old)
  }
  assert.deepEqual(
    changed,
    before.filter((reference) => binding.sourcePaths.includes(reference.path)),
    'acquisition changed-reference membership differs',
  )
  assert(changed.length > 0, 'acquisition bridge has no changed references')
  return { restored, changed }
}

function restoreHistory(before, current, changed, readSource) {
  const restored = restoreTestingBridgeHistory(
    before,
    current,
    changed,
    readSource,
    testingAcquisitionSourceBase,
    testingAcquisitionSourceReceipt,
  )
  assert.equal(
    current.at(-1).action,
    testingAcquisitionSourceAction,
    'acquisition history action differs',
  )
  return restored
}

function restoreSourceClaimPointers(before, current, restored, binding) {
  const path =
    binding.id === 'runtime-battle-session-owners'
      ? 'packages/reforge/src/battle/battle-session.ts'
      : binding.id === 'editor-command-form-families'
        ? 'packages/editor/src/ui/command-form-contract.ts'
        : undefined
  if (!path) return
  const claimId = `${binding.id}-source-contract`
  const claimIndex = before.claims.findIndex((claim) => claim.id === claimId)
  assert(claimIndex >= 0, 'source claim missing from accepted evidence')
  for (const [index, old] of before.sourceRefs.entries()) {
    const next = current.sourceRefs[index]
    if (old.path !== path || old.lines === next.lines) continue
    const pointer = `${path}:${old.lines}`
    const pointers = before.claims[claimIndex].evidence
    const pointerIndex = pointers.indexOf(pointer)
    assert(
      pointerIndex >= 0 && pointers.lastIndexOf(pointer) === pointerIndex,
      'accepted source claim requires one exact pointer',
    )
    assert.equal(
      current.claims?.[claimIndex]?.evidence?.[pointerIndex],
      `${path}:${next.lines}`,
      'source claim pointer must follow its moved declared reference',
    )
    restored.claims[claimIndex].evidence[pointerIndex] = pointer
  }
}

function metadataSpan(bytes) {
  const text = decodeTerminalUtf8(bytes)
  const matches = [...text.matchAll(/<!-- testing-meta\s*(\{[\s\S]*?\})\s*-->/gu)]
  assert.equal(matches.length, 1, 'published report requires exactly one metadata block')
  const match = matches[0]
  const start = match.index + match[0].indexOf(match[1])
  return { text, start, end: start + match[1].length, json: match[1] }
}

function assertReportMetadataBridge(
  binding,
  previousBytes,
  currentBytes,
  readSource,
  fixedSources,
) {
  const previous = metadataSpan(previousBytes)
  const current = metadataSpan(currentBytes)
  const before = parseTerminalJson(Buffer.from(previous.json))
  const after = parseTerminalJson(Buffer.from(current.json))
  assert.equal(before.id, binding.id, 'published report predecessor ID differs')
  assert.equal(after.id, binding.id, 'published report ID changed')
  const references = restoreReferences(
    before.sourceRefs,
    after.sourceRefs,
    binding,
    testingBridgeSources(readSource),
    fixedSources,
  )
  const restored = structuredClone(after)
  restored.sourceRefs = references.restored
  restored.revision.history = restoreHistory(
    before.revision.history,
    after.revision.history,
    references.changed,
    readSource,
  )
  assert.deepEqual(restored, before, 'published report changed metadata outside source bindings')
  assert.equal(
    current.text.slice(0, current.start) + previous.json + current.text.slice(current.end),
    previous.text,
    'published report changed body outside metadata',
  )
}

/** Rebind the finite content23 sources without changing any accepted execution,
 * publication, candidate, version, claim, artifact or older history field. */
export function assertTestingAcquisitionSourceBridge(
  path,
  previousBytes,
  currentBytes,
  readSource,
  fixed,
) {
  assert(isTestingAcquisitionSourceBridgePath(path), 'unadmitted acquisition source bridge path')
  assert(
    fixed?.revision === testingAcquisitionSourceBase && typeof fixed.readSource === 'function',
    'acquisition source bridge requires the fixed accepted predecessor',
  )
  assert(
    Buffer.isBuffer(previousBytes) && fixed.readSource(path)?.equals(previousBytes),
    'acquisition predecessor differs from its fixed Git object',
  )
  const reportBinding = reportBindings.get(path)
  if (reportBinding) {
    assertReportMetadataBridge(
      reportBinding,
      previousBytes,
      currentBytes,
      readSource,
      testingBridgeSources(fixed.readSource),
    )
    return
  }
  const before = parseTerminalJson(previousBytes)
  const current = parseTerminalJson(currentBytes)
  assert(
    [before, current].every((value) => value && typeof value === 'object' && !Array.isArray(value)),
    'native acquisition bridge objects required',
  )
  const restored = structuredClone(current)
  const sources = testingBridgeSources(readSource)
  const fixedSources = testingBridgeSources(fixed.readSource)
  if (path === catalogPath) {
    assert(
      Array.isArray(before.entries) && Array.isArray(current.entries),
      'catalog entries required',
    )
    assert.equal(current.entries.length, before.entries.length, 'catalog membership changed')
    const changedIds = []
    for (const [index, entry] of current.entries.entries()) {
      const old = before.entries[index]
      if (same(entry, old)) continue
      const binding = bindingsById.get(old?.id)
      assert(
        binding && entry?.id === old.id,
        'catalog ID/order outside admitted acquisition bridge',
      )
      const references = restoreReferences(
        old.sourceRefs,
        entry.sourceRefs,
        binding,
        sources,
        fixedSources,
      )
      restored.entries[index].sourceRefs = references.restored
      restored.entries[index].revision.history = restoreHistory(
        old.revision?.history,
        entry.revision?.history,
        references.changed,
        readSource,
      )
      changedIds.push(old.id)
    }
    assert.deepEqual(
      changedIds.sort(),
      [...bindingsById.keys()].sort(),
      'acquisition catalog bridge requires every admitted ID exactly once',
    )
  } else {
    const binding = bindingsByPath.get(path)
    assert.equal(before.id, binding.id, 'evidence ID differs from its admitted path')
    assert.equal(current.id, binding.id, 'evidence ID changed')
    const references = restoreReferences(
      before.sourceRefs,
      current.sourceRefs,
      binding,
      sources,
      fixedSources,
    )
    restored.sourceRefs = references.restored
    restoreSourceClaimPointers(before, current, restored, binding)
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
    'acquisition bridge changed publication, execution or unrelated native facts',
  )
}
