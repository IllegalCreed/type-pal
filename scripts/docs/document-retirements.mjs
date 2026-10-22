import { createHash } from 'node:crypto'
import { lstatSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { inspectFrozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { markdownLinks } from './markdown.mjs'
import {
  assertReviewRecordSourceUnchanged,
  loadReviewRecord,
  loadReviewRecordFromGit,
  readReviewRecordObject,
} from './review-record-storage.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const nonempty = (value) => typeof value === 'string' && value.trim().length > 0
const docPath = (value) =>
  typeof value === 'string' &&
  /^docs\/[\w./-]+\.(?:json|md)$/.test(value) &&
  value.split('/').every((part) => part && part !== '.' && part !== '..')
const reviewPath = (path) =>
  docPath(path) && /^docs\/phase-governance\/reviews\/[^/]+\.json$/.test(path)
const sourcePin = (pin) =>
  object(pin) &&
  /^[a-f\d]{40}$/.test(pin.revision ?? '') &&
  /^[a-f\d]{40}$/.test(pin.gitObject ?? '') &&
  /^[a-f\d]{64}$/.test(pin.sha256 ?? '') &&
  Number.isSafeInteger(pin.bytes) &&
  pin.bytes > 0

export function retirementShapeIssues(value) {
  if (value === undefined) return []
  const issues = []
  if (
    !object(value) ||
    value.schemaVersion !== 1 ||
    value.kind !== 'empty-review-ledger-retirement' ||
    !nonempty(value.owner) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value.retiredOn ?? '') ||
    !docPath(value.authorization?.task) ||
    !value.authorization.task.startsWith('docs/ops/tasks/') ||
    !value.authorization.task.endsWith('.md') ||
    !nonempty(value.authorization?.section) ||
    !sourcePin(value.previousRegistry) ||
    !docPath(value.previousRegistry.path) ||
    !Array.isArray(value.entries) ||
    value.entries.length === 0 ||
    !Array.isArray(value.historicalQuotes)
  )
    return ['document retirement declaration incomplete']
  const paths = new Set()
  for (const entry of value.entries) {
    if (!object(entry)) {
      issues.push('document retirement entry must be an object')
      continue
    }
    if (
      !reviewPath(entry.path) ||
      paths.has(entry.path) ||
      !sourcePin(entry.source) ||
      !sourcePin(entry.predecessor) ||
      !nonempty(entry.reason) ||
      !Array.isArray(entry.replacements) ||
      entry.replacements.length === 0 ||
      entry.replacements.some(
        (row) =>
          !object(row) ||
          !docPath(row.path) ||
          !/^[\w.-]+\.json$/.test(row.reviewRecord ?? '') ||
          row.reviewRecord.includes('..'),
      ) ||
      new Set(entry.replacements.map((row) => row.path)).size !== entry.replacements.length
    )
      issues.push(`invalid or duplicate document retirement: ${String(entry.path)}`)
    paths.add(entry.path)
  }
  const quotes = new Set()
  for (const quote of value.historicalQuotes) {
    if (!object(quote)) {
      issues.push('retirement historical quote must be an object')
      continue
    }
    if (
      !docPath(quote.path) ||
      !quote.path.endsWith('.md') ||
      quotes.has(quote.path) ||
      !/^[a-f\d]{64}$/.test(quote.sha256 ?? '')
    )
      issues.push('invalid or duplicate retirement historical quote')
    quotes.add(quote.path)
  }
  return issues
}

function quoteRange(text) {
  const startMarker = '<!-- original-source-quote:start -->'
  const endMarker = '<!-- original-source-quote:end -->'
  const start = text.indexOf(startMarker)
  const end = text.indexOf(endMarker)
  if (
    start < 0 ||
    end <= start ||
    start !== text.lastIndexOf(startMarker) ||
    end !== text.lastIndexOf(endMarker) ||
    text.slice(end + endMarker.length).trim() !== ''
  )
    return undefined
  return { start: start + startMarker.length, end, bytes: Buffer.from(text.slice(start)) }
}

/** Validate the lifecycle action independently of content/template review credit. */
export function inspectDocumentRetirements(
  registry,
  {
    cohort,
    readBuffer,
    readSourceBuffer,
    reviewReader,
    historicalReviewReader,
    present = (path) => readBuffer(path) !== undefined,
  },
) {
  const declaration = registry.documentRetirements
  const issues = retirementShapeIssues(declaration)
  const empty = { entries: [], issues, historicalTarget: () => false }
  if (declaration === undefined || issues.length) return empty
  const demand = (condition, message) => {
    if (!condition) throw new Error(message)
  }
  const snapshot = (path, pin) => {
    const source = readSourceBuffer({ ...pin, path })
    demand(
      source?.revision === pin.revision &&
        source.path === path &&
        source.mode === '100644' &&
        source.gitObject === pin.gitObject &&
        Buffer.isBuffer(source.buffer) &&
        source.buffer.length === pin.bytes &&
        hash(source.buffer) === pin.sha256,
      `retirement Git source mismatch: ${path}`,
    )
    return JSON.parse(source.buffer)
  }
  const active = new Map(registry.entries.map((entry) => [entry.path, entry]))
  const retired = new Set(declaration.entries.map((entry) => entry.path))
  const quoteRanges = new Map()
  try {
    const authorization = readBuffer(declaration.authorization.task)?.toString('utf8')
    demand(
      authorization?.includes(`### ${declaration.authorization.section}\n`),
      'retirement authorization section missing',
    )
    const previous = snapshot(declaration.previousRegistry.path, declaration.previousRegistry)
    demand(Array.isArray(previous.entries), 'previous retirement registration entries missing')
    const routing = JSON.parse(
      readBuffer('docs/phase-governance/routing.json')?.toString('utf8') ?? 'null',
    )
    demand(Array.isArray(routing?.migratedDocuments), 'retirement routing unavailable')
    for (const entry of declaration.entries) {
      demand(cohort.has(entry.path), `retirement is outside fixed cohort: ${entry.path}`)
      demand(!active.has(entry.path), `retired document still registered active: ${entry.path}`)
      demand(!present(entry.path), `retired document reappeared: ${entry.path}`)
      demand(
        !routing.migratedDocuments.some((row) => row.path === entry.path),
        `retired document still has migrated route: ${entry.path}`,
      )
      const source = snapshot(entry.path, entry.source)
      const keys = new Set(['schemaVersion', 'id', 'reviewer', 'reviewDate', 'policy', 'entries'])
      demand(
        object(source) &&
          source.schemaVersion === 1 &&
          nonempty(source.id) &&
          Object.keys(source).every((key) => keys.has(key)) &&
          Array.isArray(source.entries) &&
          source.entries.length === 0,
        `retirement source is not an empty header-only review: ${entry.path}`,
      )
      const old = previous.entries.filter((row) => row.path === entry.path)
      demand(old.length === 1, `previous registration not unique: ${entry.path}`)
      const priorPath = `docs/phase-governance/reviews/${old[0].reviewRecord}`
      const priorSnap = readSourceBuffer({
        revision: declaration.previousRegistry.revision,
        path: priorPath,
      })
      // Use the storage-aware reader on the prior review buffer (handles flat or sharded)
      const priorRecord = historicalReviewReader
        ? historicalReviewReader(declaration.previousRegistry.revision, priorPath)
        : readReviewRecordObject(priorPath, {
            readBuffer: (p) => {
              if (p === priorPath) return priorSnap?.buffer
              // Shards at the same revision need individual lookups
              const shardSnap = readSourceBuffer({
                revision: declaration.previousRegistry.revision,
                path: p,
              })
              return shardSnap?.buffer
            },
          })
      const oldPins = priorRecord.entries.filter((row) => row.path === entry.path)
      demand(
        oldPins?.length === 1 && oldPins[0].afterSha256 === entry.source.sha256,
        `previous review does not pin retirement source: ${entry.path}`,
      )
      const predecessor = snapshot(entry.path, entry.predecessor)
      const originals = predecessor.entries?.map((row) => row.path)
      const replacements = new Set(entry.replacements.map((row) => row.path))
      demand(
        Array.isArray(originals) &&
          originals.length > 0 &&
          new Set(originals).size === originals.length &&
          originals.length === replacements.size &&
          originals.every((path) => replacements.has(path)),
        `retirement predecessor/replacement scope mismatch: ${entry.path}`,
      )
      for (const row of entry.replacements) {
        demand(
          readBuffer(row.path) !== undefined &&
            active.get(row.path)?.reviewRecord === row.reviewRecord,
          `retirement replacement missing or rebound: ${row.path}`,
        )
        const reviewPath = `docs/phase-governance/reviews/${row.reviewRecord}`
        const review = reviewReader
          ? reviewReader(reviewPath)
          : readReviewRecordObject(reviewPath, { readBuffer })
        demand(
          review?.entries?.filter((candidate) => candidate.path === row.path).length === 1,
          `retirement replacement review not unique: ${row.path}`,
        )
      }
    }
    for (const quote of declaration.historicalQuotes) {
      const text = readBuffer(quote.path)?.toString('utf8')
      const range = text === undefined ? undefined : quoteRange(text)
      demand(
        range && hash(range.bytes) === quote.sha256,
        `retirement historical quote changed: ${quote.path}`,
      )
      // A declaration must resolve actual archived links, never a blanket skip.
      const links = markdownLinks(text, { positions: true })
      demand(
        links.some(
          (link) =>
            link.start > range.start &&
            link.end < range.end &&
            retired.has(
              resolve(
                '/',
                quote.path,
                '..',
                decodeURIComponent(link.target.split(/[?#]/, 1)[0]),
              ).slice(1),
            ),
        ),
        `retirement historical quote has no matching reference: ${quote.path}`,
      )
      quoteRanges.set(quote.path, range)
    }
  } catch (error) {
    issues.push(error.message)
  }
  if (issues.length) return empty
  return {
    entries: declaration.entries,
    issues,
    historicalTarget: (source, text, link, target) => {
      const range = quoteRanges.get(source)
      const current = quoteRange(text)
      return Boolean(
        retired.has(target) &&
          range &&
          current &&
          link.start > current.start &&
          link.end < current.end &&
          current.bytes.equals(range.bytes),
      )
    },
  }
}

export function readDocumentRetirements(root, registry) {
  if (registry.documentRetirements === undefined)
    return { entries: [], issues: [], historicalTarget: () => false }
  const readBuffer = (path) => {
    try {
      return readFileSync(resolve(root, path))
    } catch {
      return undefined
    }
  }
  const readSourceBuffer = (pin) => readGitDocumentSnapshot(root, pin)
  const present = (path) => {
    try {
      lstatSync(resolve(root, path))
      return true
    } catch (error) {
      if (error.code === 'ENOENT') return false
      throw error
    }
  }
  const baseline = inspectFrozenDocumentBaseline(undefined, undefined, {
    readBuffer,
    readSourceBuffer,
  })
  if (baseline.issues.length)
    return { entries: [], issues: baseline.issues, historicalTarget: () => false }
  const reviewReads = []
  const reviewReader = (logicalPath) => {
    const loaded = loadReviewRecord({ root, logicalPath })
    reviewReads.push(loaded.loadedSource)
    return loaded.record
  }
  const result = inspectDocumentRetirements(registry, {
    reviewReader,
    historicalReviewReader: (revision, logicalPath) =>
      loadReviewRecordFromGit({ root, revision, logicalPath }).record,
    cohort: new Set(baseline.entries.map((entry) => entry.path)),
    readBuffer,
    readSourceBuffer,
    present,
  })
  for (const source of reviewReads) assertReviewRecordSourceUnchanged(source)
  return result
}
