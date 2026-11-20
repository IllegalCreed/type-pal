import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { decodeTerminalUtf8, parseTerminalJson } from './terminal-json.mjs'
import { assertTestingBridgeReference, testingBridgeSources } from './testing-source-bridge.mjs'
import { safeTestingPath } from './testing-source-refs.mjs'

const versionPath = 'packages/content/src/character.ts'
const catalogPath = 'docs/testing/catalog.json'
const receiptPath = 'docs/tasks/cards/CONTENT-ACTOR-WORLD-INITIAL-SKILLS-1.md'
const scope = '仅更新未变的内容与存档版本声明指纹，沿用原执行、输入和结论。'
const sha256 = (bytes) => createHash('sha256').update(bytes).digest('hex')

function versionRefs(entry) {
  return entry.sourceRefs.filter((ref) => ref.path === versionPath)
}

function referencedLines(bytes, ref) {
  const [start, end] = ref.lines.split('-').map(Number)
  return decodeTerminalUtf8(bytes)
    .split('\n')
    .slice(start - 1, end)
    .join('\n')
}

function metadataBlock(bytes) {
  const text = decodeTerminalUtf8(bytes)
  const pattern = /<!-- testing-meta\s*\n(\{[^\n]*\})\n-->/du
  const match = pattern.exec(text)
  assert(match, 'content version: canonical metadata required')
  const [start, end] = match.indices[1]
  return {
    metadata: parseTerminalJson(Buffer.from(match[1])),
    outer: [text.slice(0, start), text.slice(end)],
  }
}

/** Validate one accepted version-only change before replaying older publication layers. */
export function loadTestingContentVersionRebinding({
  admission,
  readCurrent,
  readPredecessor,
  readAcceptedSource = readPredecessor,
}) {
  const previousSource = readPredecessor(versionPath)
  assert(
    previousSource?.equals(readAcceptedSource(versionPath)),
    'content version: publication changed the previously admitted version source',
  )
  const currentSource = readCurrent(versionPath)
  assert(Buffer.isBuffer(currentSource), 'content version: live source missing')
  assert.equal(sha256(currentSource), admission.afterSha256, 'content version: live source differs')
  assert(!currentSource.equals(previousSource), 'content version: source did not change')
  assert(readCurrent(receiptPath)?.length > 0, 'content version: applicability receipt missing')

  const catalog = parseTerminalJson(readPredecessor(catalogPath))
  const previousSources = testingBridgeSources(readPredecessor)
  const currentSources = testingBridgeSources(readCurrent)
  const entries = new Map()
  const carriers = new Map()
  for (const entry of catalog.entries) {
    const references = versionRefs(entry)
    if (references.length === 0) continue
    assert.equal(references.length, 1, 'content version: one existing version reference required')
    const [ref] = references
    assert(ref.role.includes('version'), 'content version: only version claims may be rebound')
    assertTestingBridgeReference(ref, previousSources)
    const candidate = { ...ref, sha256: admission.afterSha256 }
    assertTestingBridgeReference(candidate, currentSources)
    assert.equal(
      referencedLines(currentSource, ref),
      referencedLines(previousSource, ref),
      'content version: version declaration changed',
    )
    const event = {
      action: 'content-version-source-rebinding',
      base: admission.baseRevision,
      date: admission.date,
      evidence: receiptPath,
      previousSourceRefs: [ref],
      scope,
    }
    assert(!entries.has(entry.id), 'content version: duplicate catalog identity')
    entries.set(entry.id, { candidate, event, originalRefs: entry.sourceRefs })
    for (const [path, kind] of [
      [entry.canonical, 'report'],
      [entry.evidence, 'evidence'],
    ]) {
      assert(safeTestingPath(path), 'content version: invalid publication carrier')
      const fullPath = `docs/testing/${path}`
      assert(!carriers.has(fullPath), 'content version: reused publication carrier')
      carriers.set(fullPath, { id: entry.id, kind })
    }
  }
  assert.equal(entries.size, admission.entries, 'content version: affected catalog set differs')

  function expectedRecord(old, id, kind) {
    const { candidate, event, originalRefs } = entries.get(id)
    assert.equal(old.id, id, 'content version: record identity differs')
    assert.deepEqual(old.sourceRefs, originalRefs, 'content version: old source references differ')
    const sourceRefs = old.sourceRefs.map((ref) => (ref.path === versionPath ? candidate : ref))
    if (kind === 'evidence') return { ...old, sourceRefs, history: [...old.history, event] }
    return {
      ...old,
      sourceRefs,
      revision: { ...old.revision, history: [...old.revision.history, event] },
    }
  }

  const expectedCatalog = {
    ...catalog,
    entries: catalog.entries.map((entry) =>
      entries.has(entry.id) ? expectedRecord(entry, entry.id, 'catalog') : entry,
    ),
  }
  return {
    readPredecessorSource(path) {
      return path === versionPath ? previousSource : readCurrent(path)
    },
    restore(path, currentBytes) {
      if (path === catalogPath) {
        assert.deepEqual(
          parseTerminalJson(currentBytes),
          expectedCatalog,
          'content version: catalog changed outside the admitted binding',
        )
        return readPredecessor(path)
      }
      const carrier = carriers.get(path)
      if (!carrier) return currentBytes
      const previous = readPredecessor(path)
      if (carrier.kind === 'report') {
        const old = metadataBlock(previous)
        const live = metadataBlock(currentBytes)
        assert.deepEqual(live.outer, old.outer, 'content version: report text changed')
        assert.deepEqual(
          live.metadata,
          expectedRecord(old.metadata, carrier.id, carrier.kind),
          'content version: report metadata changed outside the admitted binding',
        )
      } else {
        assert.deepEqual(
          parseTerminalJson(currentBytes),
          expectedRecord(parseTerminalJson(previous), carrier.id, carrier.kind),
          'content version: evidence changed outside the admitted binding',
        )
      }
      return previous
    },
    assertUnchanged() {
      assert(
        readCurrent(versionPath)?.equals(currentSource),
        'content version: source changed during read',
      )
    },
  }
}
