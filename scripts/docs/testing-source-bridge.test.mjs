import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { assertTestingSourceBridge } from './testing-source-bridge.mjs'
import { testingSourceRefIssues } from './testing-source-refs.mjs'

const catalogPath = 'docs/testing/catalog.json'
const evidencePaths = [
  'docs/testing/domains/phase1-runtime/dependencies/dependency-ownership/evidence.json',
  'docs/testing/domains/cross-phase/script-corrections/evidence.json',
  'docs/testing/domains/phase1-runtime/control-rotation/evidence.json',
]
const receipt = 'docs/tasks/evidence/source-binding/README.md'
const source = Buffer.from('export const owner = 2\n')
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const bytes = (value) => Buffer.from(JSON.stringify(value))
function fixture() {
  const oldHash = digest('export const owner = 1\n')
  const sources = new Map([[receipt, Buffer.from('# Limited source binding review\n')]])
  const entries = [
    ['phase1-dependency-ownership', ['core/inventory-state.ts', 'core/equipment-state.ts']],
    [
      'game-script-corrections',
      [
        'core/object-script-state.ts',
        'core/script-story-corrections.pal.test.ts',
        'core/script-topology-corrections.pal.test.ts',
        'shell/bootstrap.ts',
      ],
    ],
    ['game-input-rotation', ['localization/ui-text.ts']],
  ].map(([id, paths]) => ({
    id,
    status: 'current',
    sourceRefs: paths.map((path) => {
      const fullPath = `packages/game/src/${path}`
      sources.set(fullPath, source)
      return {
        path: fullPath,
        lines: '1',
        anchor: 'export const owner',
        role: 'owner',
        sha256: oldHash,
      }
    }),
    revision: {
      currentSha: 'a'.repeat(40),
      contentVersion: 22,
      minimumSaveVersion: 12,
      history: [{ action: 'frozen-execution', failed: 1 }],
    },
  }))
  const before = { schemaVersion: 2, entries }
  const current = structuredClone(before)
  for (const entry of current.entries) {
    const previousSourceRefs = structuredClone(entry.sourceRefs)
    for (const ref of entry.sourceRefs) ref.sha256 = digest(source)
    entry.revision.history.push({
      date: '2026-11-05',
      action: 'source-reference-bridge',
      base: 'b'.repeat(40),
      previousSourceRefs,
      scope: 'Source binding only; old runtime failure remains.',
      evidence: receipt,
    })
  }
  const beforeEvidence = entries.map((entry) => ({
    schemaVersion: 2,
    id: entry.id,
    status: entry.status,
    candidateSha: entry.revision.currentSha,
    sourceRefs: entry.sourceRefs,
    history: entry.revision.history,
    runtimeExecution: { performed: true, exit: 1 },
    artifacts: [{ path: 'frozen.raw', sha256: 'c'.repeat(64) }],
    claims: [{ status: 'runtime-backed', scope: 'original input' }],
  }))
  const currentEvidence = beforeEvidence.map((entry, i) => ({
    ...structuredClone(entry),
    sourceRefs: current.entries[i].sourceRefs,
    history: current.entries[i].revision.history,
  }))
  return {
    before,
    current,
    beforeEvidence,
    currentEvidence,
    sources,
    read: (path) => sources.get(path),
  }
}

test('catalog source bindings preserve every publication field and old failure history without mutating inputs', () => {
  const f = fixture()
  const before = bytes(f.before),
    current = bytes(f.current)
  assertTestingSourceBridge(catalogPath, before, current, f.read)
  assert.deepEqual(bytes(f.before), before)
  assert.deepEqual(bytes(f.current), current)
})

for (const [index, path] of evidencePaths.entries()) {
  test(`the paired native execution facts remain unchanged: ${path}`, () => {
    const f = fixture()
    assertTestingSourceBridge(
      path,
      bytes(f.beforeEvidence[index]),
      bytes(f.currentEvidence[index]),
      f.read,
    )
  })
}

const activeSceneEvidence = 'docs/testing/domains/runtime/scene/active-scene/evidence.json'
const cameraTestPath = 'packages/reforge/src/world-camera.test.ts'
const cameraAnchor = "test('pre-aborted request rejects"
const cameraTest = `${cameraAnchor}', () => {})\n`

function activeSceneCameraFixture(currentSource, lines) {
  const original = {
    path: cameraTestPath,
    lines: '1',
    anchor: cameraAnchor,
    role: 'oracle',
    sha256: digest(cameraTest),
  }
  const before = {
    id: 'runtime-active-scene',
    sourceRefs: [original],
    history: [],
    claims: [
      {
        id: 'runtime-active-scene-source-contract',
        result: 'source-backed',
        evidence: [`${cameraTestPath}:1`],
      },
    ],
  }
  const current = structuredClone(before)
  current.sourceRefs[0].lines = lines
  current.sourceRefs[0].sha256 = digest(currentSource)
  current.claims[0].evidence[0] = `${cameraTestPath}:${lines}`
  current.history.push({
    date: '2026-11-06',
    action: 'source-reference-bridge',
    base: 'b'.repeat(40),
    previousSourceRefs: [original],
    scope: 'Same source-backed pre-abort claim.',
    evidence: receipt,
  })
  const sources = new Map([
    [receipt, Buffer.from('# Limited source binding review\n')],
    [cameraTestPath, Buffer.from(currentSource)],
  ])
  return {
    current,
    check: () =>
      assertTestingSourceBridge(activeSceneEvidence, bytes(before), bytes(current), (path) =>
        sources.get(path),
      ),
  }
}

test('the active-scene claim pointer follows its moved camera oracle only at the matching range', () => {
  const f = activeSceneCameraFixture(`\n${cameraTest}`, '2')
  f.check()
  for (const range of ['1', '3']) {
    f.current.claims[0].evidence[0] = `${cameraTestPath}:${range}`
    assert.throws(f.check, /must follow the moved camera oracle/)
  }
})

test('the moved camera oracle does not permit a different claim result', () => {
  const f = activeSceneCameraFixture(`\n${cameraTest}`, '2')
  f.current.claims[0].result = 'runtime-backed'
  assert.throws(f.check, /publication, execution or unrelated/)
})

test('a hash-only camera source refresh does not permit changing its claim pointer', () => {
  const f = activeSceneCameraFixture(`${cameraTest}// oracle stays on the same line\n`, '1')
  f.check()
  f.current.claims[0].evidence[0] = `${cameraTestPath}:2`
  assert.throws(f.check, /publication, execution or unrelated/)
})

const catalogRefusals = [
  [
    'publication status',
    (f) => {
      f.current.entries[0].status = 'verified'
    },
    /publication/,
  ],
  [
    'candidate revision',
    (f) => {
      f.current.entries[0].revision.currentSha = '0'.repeat(40)
    },
    /publication/,
  ],
  [
    'member order',
    (f) => {
      f.current.entries.reverse()
    },
    /ID\/order/,
  ],
  [
    'added member',
    (f) => {
      f.current.entries.push(structuredClone(f.current.entries[0]))
    },
    /membership/,
  ],
  [
    'reference path',
    (f) => {
      f.current.entries[0].sourceRefs[0].path = 'packages/game/src/core/game-state.ts'
    },
    /only reference/,
  ],
  [
    'reference anchor',
    (f) => {
      f.current.entries[0].sourceRefs[0].anchor = 'different owner'
    },
    /only reference/,
  ],
  [
    'invalid line range',
    (f) => {
      f.current.entries[0].sourceRefs[0].lines = '0'
    },
    /invalid sourceRef lines/,
  ],
  [
    'wrong source hash',
    (f) => {
      f.current.entries[0].sourceRefs[0].sha256 = '0'.repeat(64)
    },
    /sourceRef hash mismatch/,
  ],
  [
    'old failure erased',
    (f) => {
      f.current.entries[0].revision.history[0].failed = 0
    },
    /old history changed/,
  ],
  [
    'history removal',
    (f) => {
      f.current.entries[0].revision.history.shift()
    },
    /exactly one/,
  ],
  [
    'forged previous references',
    (f) => {
      f.current.entries[0].revision.history.at(-1).previousSourceRefs.pop()
    },
    /previousSourceRefs/,
  ],
  [
    'extra execution claim',
    (f) => {
      f.current.entries[0].revision.history.at(-1).passed = true
    },
    /unexpected bridge history/,
  ],
  [
    'invalid date',
    (f) => {
      f.current.entries[0].revision.history.at(-1).date = '2026-13-40'
    },
    /date\/base/,
  ],
  [
    'missing receipt',
    (f) => {
      f.sources.delete(receipt)
    },
    /evidence missing/,
  ],
]
for (const [label, mutate, reason] of catalogRefusals) {
  test(`the finite catalog bridge rejects ${label}`, () => {
    const f = fixture()
    mutate(f)
    assert.throws(
      () => assertTestingSourceBridge(catalogPath, bytes(f.before), bytes(f.current), f.read),
      reason,
    )
  })
}

test('an evidence carrier cannot rewrite original execution, artifact or claim facts', () => {
  for (const mutate of [
    (e) => {
      e.runtimeExecution.exit = 0
    },
    (e) => {
      e.artifacts[0].sha256 = '0'.repeat(64)
    },
    (e) => {
      e.claims[0].scope = 'newly verified browser execution'
    },
  ]) {
    const f = fixture()
    mutate(f.currentEvidence[0])
    assert.throws(
      () =>
        assertTestingSourceBridge(
          evidencePaths[0],
          bytes(f.beforeEvidence[0]),
          bytes(f.currentEvidence[0]),
          f.read,
        ),
      /publication, execution or unrelated/,
    )
  }
})

test('arbitrary JSON, unadmitted source domains and duplicate JSON keys cannot borrow the bridge', () => {
  const f = fixture()
  assert.throws(
    () =>
      assertTestingSourceBridge(
        'docs/tasks/evidence/arbitrary.json',
        bytes(f.before),
        bytes(f.current),
        f.read,
      ),
    /unadmitted/,
  )
  for (const value of [f.before, f.current])
    value.entries[0].sourceRefs[0].path = 'packages/game/src/core/game-state.ts'
  assert.throws(
    () => assertTestingSourceBridge(catalogPath, bytes(f.before), bytes(f.current), f.read),
    /outside admitted/,
  )
  const duplicate = Buffer.from('{"entries":[],"entries":[]}')
  assert.throws(
    () => assertTestingSourceBridge(catalogPath, bytes(f.before), duplicate, f.read),
    /duplicate/,
  )
})

test('source validation preserves path/range errors and only reads bytes after those checks', () => {
  let reads = 0
  const sources = {
    has: () => true,
    read: () => {
      reads++
      return source
    },
  }
  assert.deepEqual(
    testingSourceRefIssues([{ path: '../outside', lines: '1' }], 'caller', sources),
    ['caller: every sourceRef needs path and lines'],
  )
  assert.deepEqual(testingSourceRefIssues([{ path: 'inside.ts', lines: '0' }], 'caller', sources), [
    'caller: invalid sourceRef lines inside.ts:0',
  ])
  assert.equal(reads, 0)
})

test('malformed native roots, catalog entries and appended events fail at their object boundary', () => {
  const f = fixture()
  assert.throws(
    () => assertTestingSourceBridge(catalogPath, bytes(f.before), Buffer.from('null'), f.read),
    /native bridge objects required/,
  )
  const badEntry = structuredClone(f.current)
  badEntry.entries[0] = null
  assert.throws(
    () => assertTestingSourceBridge(catalogPath, bytes(f.before), bytes(badEntry), f.read),
    /catalog entry object required/,
  )
  const badEvent = structuredClone(f.current)
  badEvent.entries[0].revision.history[1] = null
  assert.throws(
    () => assertTestingSourceBridge(catalogPath, bytes(f.before), bytes(badEvent), f.read),
    /bridge history event required/,
  )
})
