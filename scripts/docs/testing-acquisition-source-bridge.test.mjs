import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  assertTestingAcquisitionSourceBridge,
  testingAcquisitionSourceAction,
  testingAcquisitionSourceBase,
  testingAcquisitionSourceBindings,
  testingAcquisitionSourceReceipt,
} from './testing-acquisition-source-bridge.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const catalogPath = 'docs/testing/catalog.json'
const versionPath = 'packages/content/src/character.ts'
const bytes = (value) => Buffer.from(JSON.stringify(value))
const hash = (value) => createHash('sha256').update(value).digest('hex')
const fixedCache = new Map()
function readFixed(path) {
  if (!fixedCache.has(path))
    fixedCache.set(
      path,
      execFileSync('git', ['show', `${testingAcquisitionSourceBase}:${path}`], {
        cwd: root,
        maxBuffer: 16 * 1024 * 1024,
      }),
    )
  return fixedCache.get(path)
}

// Use the actual accepted objects and source files, including their previous
// bridge/publication history. A trailing blank line is a legal source edit;
// only the already approved content constant changes its anchor semantics.
function fixture() {
  const sources = new Map([
    [testingAcquisitionSourceReceipt, Buffer.from('# Source applicability receipt\n')],
  ])
  for (const path of new Set(testingAcquisitionSourceBindings.flatMap((row) => row.sourcePaths))) {
    let text = readFixed(path).toString('utf8')
    if (path === versionPath)
      text = text.replace('export const CONTENT_VERSION = 22', 'export const CONTENT_VERSION = 23')
    sources.set(path, Buffer.from(`${text}\n`))
  }
  const rebind = (entry, binding, history) => {
    const previousSourceRefs = []
    for (const reference of entry.sourceRefs) {
      if (!binding.sourcePaths.includes(reference.path)) continue
      previousSourceRefs.push(structuredClone(reference))
      reference.sha256 = hash(sources.get(reference.path))
      if (
        ['e2e-007', 'e2e-009'].includes(binding.id) &&
        reference.path === versionPath &&
        reference.anchor === 'export const CONTENT_VERSION = 22'
      )
        reference.anchor = 'export const CONTENT_VERSION = 23'
    }
    history.push({
      action: testingAcquisitionSourceAction,
      base: testingAcquisitionSourceBase,
      date: '2026-11-07',
      evidence: testingAcquisitionSourceReceipt,
      previousSourceRefs,
      scope: 'Source applicability only; all original publication and execution facts remain.',
    })
  }
  const currentCatalog = JSON.parse(readFixed(catalogPath))
  const current = new Map([[catalogPath, currentCatalog]])
  for (const binding of testingAcquisitionSourceBindings) {
    const entry = currentCatalog.entries.find((entry) => entry.id === binding.id)
    rebind(entry, binding, entry.revision.history)
    const evidence = JSON.parse(readFixed(binding.path))
    rebind(evidence, binding, evidence.history)
    current.set(binding.path, evidence)
  }
  const read = (path) => sources.get(path)
  const fixed = { revision: testingAcquisitionSourceBase, readSource: readFixed }
  const check = (path = catalogPath) =>
    assertTestingAcquisitionSourceBridge(
      path,
      readFixed(path),
      bytes(current.get(path)),
      read,
      fixed,
    )
  const binding = (id) => testingAcquisitionSourceBindings.find((row) => row.id === id)
  return {
    current,
    currentCatalog,
    sources,
    fixed,
    read,
    check,
    entry: (id) => currentCatalog.entries.find((entry) => entry.id === id),
    evidence: (id) => current.get(binding(id).path),
    path: (id) => binding(id).path,
  }
}

test('finite content23 successor accepts all real predecessor pairs without rewriting native facts', () => {
  const f = fixture()
  const snapshots = new Map([...f.current].map(([path, value]) => [path, bytes(value)]))
  assert.equal(testingAcquisitionSourceBindings.length, 22)
  assert.equal(testingAcquisitionSourceBindings.flatMap((row) => row.sourcePaths).length, 32)
  assert.equal(
    f.currentCatalog.entries.flatMap((entry) =>
      entry.revision.history.at(-1)?.action === testingAcquisitionSourceAction
        ? entry.revision.history.at(-1).previousSourceRefs
        : [],
    ).length,
    41,
  )
  for (const [path, snapshot] of snapshots) {
    f.check(path)
    assert.deepEqual(bytes(f.current.get(path)), snapshot)
  }
})

test('catalog and reference membership cannot omit, reorder or add an accepted member', () => {
  for (const mutate of [
    (f) => {
      const index = f.currentCatalog.entries.findIndex((entry) => entry.id === 'e2e-001')
      f.currentCatalog.entries[index] = JSON.parse(readFixed(catalogPath)).entries[index]
    },
    (f) => {
      const entry = f.entry('e2e-002')
      const old = entry.revision.history.at(-1).previousSourceRefs[0]
      entry.sourceRefs[entry.sourceRefs.findIndex((reference) => reference.path === old.path)] = old
    },
    (f) => f.entry('e2e-002').sourceRefs.reverse(),
    (f) => f.entry('e2e-002').sourceRefs.push(structuredClone(f.entry('e2e-002').sourceRefs[0])),
  ]) {
    const f = fixture()
    mutate(f)
    assert.throws(f.check, /membership|every admitted|only source SHA|outside admitted/)
  }
})

test('changed references cannot escape the finite paths or rewrite a nonversion anchor', () => {
  const f = fixture()
  const unrelated = f
    .entry('e2e-001')
    .sourceRefs.find((reference) => reference.path !== versionPath)
  unrelated.sha256 = 'f'.repeat(64)
  assert.throws(f.check, /outside admitted acquisition bridge/)
  const g = fixture()
  g.entry('e2e-002').sourceRefs.find((reference) => reference.path === versionPath).anchor =
    'export const CONTENT_VERSION = 23'
  assert.throws(g.check, /only source SHA/)
})

test('only the two fixed version anchors advance from22 to23', () => {
  for (const anchor of ['export const CONTENT_VERSION = 22', 'export const CONTENT_VERSION = 24']) {
    const f = fixture()
    f.entry('e2e-009').sourceRefs.find((reference) => reference.path === versionPath).anchor =
      anchor
    assert.throws(f.check, /version anchor must advance exactly 22 to 23/)
  }
})

test('history must append one accurate event after every original event', () => {
  for (const mutate of [
    (history) => history.pop(),
    (history) => history.push(structuredClone(history.at(-1))),
    (history) => {
      history[0].action = 'rewritten-original'
    },
    (history) => {
      history.at(-1).base = 'a'.repeat(40)
    },
    (history) => {
      history.at(-1).action = 'unrelated-action'
    },
    (history) => {
      history.at(-1).evidence = 'docs/tasks/evidence/unadmitted.md'
    },
    (history) => history.at(-1).previousSourceRefs.reverse(),
  ]) {
    const f = fixture()
    mutate(f.entry('e2e-002').revision.history)
    assert.throws(f.check, /history|previousSourceRefs|admitted receipt|fixed base/)
  }
})

test('real native execution candidate, versions, artifacts and claims remain immutable', () => {
  for (const mutate of [
    (evidence) => {
      evidence.candidateSha = 'a'.repeat(40)
    },
    (evidence) => {
      evidence.versions.content = 23
    },
    (evidence) => {
      evidence.runtimeExecution.performed = false
    },
    (evidence) => {
      evidence.claims[0].result = 'source-backed'
    },
    (evidence) => {
      evidence.artifacts[0].sha256 = 'a'.repeat(64)
    },
  ]) {
    const f = fixture()
    mutate(f.evidence('e2e-009'))
    assert.throws(() => f.check(f.path('e2e-009')), /changed publication, execution or unrelated/)
  }
  const f = fixture()
  f.entry('e2e-009').revision.contentVersion = 23
  assert.throws(f.check, /changed publication, execution or unrelated/)
})

test('both old and current source bytes and ranges must substantiate their fingerprints', () => {
  const f = fixture()
  f.fixed.readSource = (path) =>
    path === versionPath ? Buffer.from('corrupted old source\n') : readFixed(path)
  assert.throws(f.check, /hash mismatch|range/)
  const g = fixture()
  g.sources.set(versionPath, Buffer.from('corrupted current source\n'))
  assert.throws(g.check, /hash mismatch|range/)
  const h = fixture()
  h.entry('e2e-contract').sourceRefs.find((reference) => reference.path === versionPath).lines = '1'
  assert.throws(h.check, /anchor/)
})

test('only existing battle and form source pointers follow their declared moved ranges', () => {
  for (const id of ['runtime-battle-session-owners', 'editor-command-form-families']) {
    const f = fixture()
    const evidence = f.evidence(id)
    const path =
      id === 'runtime-battle-session-owners'
        ? 'packages/reforge/src/battle/battle-session.ts'
        : 'packages/editor/src/ui/command-form-contract.ts'
    const source = Buffer.from(`\n${f.sources.get(path).toString('utf8')}`)
    f.sources.set(path, source)
    for (const reference of evidence.sourceRefs.filter((reference) => reference.path === path)) {
      const oldPointer = `${path}:${reference.lines}`
      reference.lines = reference.lines
        .split('-')
        .map((line) => Number(line) + 1)
        .join('-')
      reference.sha256 = hash(source)
      const claim = evidence.claims.find((claim) => claim.id === `${id}-source-contract`)
      const index = claim.evidence.indexOf(oldPointer)
      assert(index >= 0)
      claim.evidence[index] = `${path}:${reference.lines}`
    }
    f.check(f.path(id))
    const claim = evidence.claims.find((claim) => claim.id === `${id}-source-contract`)
    const pointerIndex = claim.evidence.findIndex((pointer) => pointer.startsWith(`${path}:`))
    claim.evidence[pointerIndex] = `${path}:1-1`
    assert.throws(() => f.check(f.path(id)), /source claim pointer/)
  }
})

test('predecessor bytes and commit cannot be substituted or inferred from current evidence', () => {
  const f = fixture()
  f.fixed.revision = 'a'.repeat(40)
  assert.throws(f.check, /fixed accepted predecessor/)
  const g = fixture()
  assert.throws(
    () =>
      assertTestingAcquisitionSourceBridge(
        catalogPath,
        bytes(g.currentCatalog),
        bytes(g.currentCatalog),
        g.read,
        g.fixed,
      ),
    /predecessor differs from its fixed Git object/,
  )
  g.sources.delete(testingAcquisitionSourceReceipt)
  assert.throws(g.check, /bridge evidence missing/)
})

test('the three published Markdown reports update only their exact source metadata', () => {
  const f = fixture()
  for (const [id, path] of [
    ['e2e-007', 'docs/testing/e2e/stages/007-island-entrance/report.md'],
    ['e2e-008', 'docs/testing/e2e/stages/008-fairy-island-maze/report.md'],
    ['e2e-009', 'docs/testing/e2e/stages/009-fairy-island-pool/report.md'],
  ]) {
    const before = readFixed(path)
    const text = before.toString('utf8')
    const match = /<!-- testing-meta\s*(\{[\s\S]*?\})\s*-->/u.exec(text)
    const metadata = JSON.parse(match[1])
    metadata.sourceRefs = structuredClone(f.entry(id).sourceRefs)
    metadata.revision.history = structuredClone(f.entry(id).revision.history)
    const render = (next) => Buffer.from(text.replace(match[1], JSON.stringify(next)))
    const check = (current) =>
      assertTestingAcquisitionSourceBridge(path, before, current, f.read, f.fixed)
    check(render(metadata))
    assert.throws(
      () => check(Buffer.concat([render(metadata), Buffer.from('\nA new assertion.\n')])),
      /changed body outside metadata/,
    )
    const changedVersion = structuredClone(metadata)
    changedVersion.revision.contentVersion = 23
    assert.throws(() => check(render(changedVersion)), /metadata outside source bindings/)
    assert.throws(
      () => check(Buffer.concat([render(metadata), Buffer.from(`\n${match[0]}`)])),
      /exactly one metadata block/,
    )
  }
  const path = 'docs/testing/e2e/stages/010-water-moon-palace/report.md'
  assert.throws(
    () =>
      assertTestingAcquisitionSourceBridge(path, readFixed(path), readFixed(path), f.read, f.fixed),
    /unadmitted acquisition source bridge path/,
  )
})
