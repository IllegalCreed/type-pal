import { createHash } from 'node:crypto'
import { isDeepStrictEqual } from 'node:util'

// Approved 1838-document snapshot. Changing this trust root requires a separate
// independent source/design review; never derive it from a candidate envelope.
export const frozenDocumentBaseline = Object.freeze({
  path: 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json',
  revision: '33cc2df50c7279d2750ddad4fcf6c373b7b2bda3',
  gitObject: '00da11bb594126105abbb5ea596c7272ed8e5542',
  sha256: '1c9a01c80a477e8de0d23d064f00a45fbbe9eab4aaffd9e1d5b26114f92e71f5',
  denominator: 1838,
})

export function inspectFrozenDocumentBaseline(
  read,
  readSource,
  { readBuffer, readSourceBuffer } = {},
) {
  if (typeof readBuffer === 'function' && typeof readSourceBuffer === 'function') {
    const root = readFrozenBaselineRoot(readSourceBuffer)
    if (root.issues.length) return root
    const view = inspectFrozenBaselineView(readBuffer(frozenDocumentBaseline.path), root)
    return view.issues.length
      ? { ...view, issues: ['frozen historical baseline working tree drift', ...view.issues] }
      : view
  }
  const frozen = readSource?.(frozenDocumentBaseline)
  if (
    !frozen ||
    frozen.gitObject !== frozenDocumentBaseline.gitObject ||
    typeof frozen.text !== 'string' ||
    createHash('sha256').update(frozen.text).digest('hex') !== frozenDocumentBaseline.sha256
  )
    return {
      entries: [],
      issues: ['frozen historical baseline Git identity mismatch or unavailable'],
    }
  let entries
  try {
    entries = JSON.parse(frozen.text)?.entries
  } catch {
    return { entries: [], issues: ['frozen historical source baseline invalid JSON'] }
  }
  if (
    !Array.isArray(entries) ||
    new Set(entries.map((entry) => entry.path)).size !== frozenDocumentBaseline.denominator
  )
    return { entries: [], issues: ['frozen document baseline denominator mismatch'] }
  const working = read(frozenDocumentBaseline.path)
  const issues =
    typeof working !== 'string' ||
    createHash('sha256').update(working).digest('hex') !== frozenDocumentBaseline.sha256
      ? ['frozen historical baseline working tree drift']
      : []
  return { entries, issues }
}

export const frozenBindingTemplate = Object.freeze({
  templateId: 'test-catalog-v1',
  templateVersion: '1.2.0',
  variant: 'frozen-document-binding-baseline-v1',
  sourceKind: 'frozen-document-binding-root-view-v1',
})
const nativeKeys = [
  'schemaVersion',
  'id',
  'status',
  'denominator',
  'registry',
  'policy',
  'summary',
  'entries',
]
const governanceKeys = [
  'templateId',
  'templateVersion',
  'variant',
  'lastReviewed',
  'owner',
  'provenance',
  'sourceGitRevision',
  'sourceGitObject',
  'sourceSha256',
  'primarySource',
  'scope',
  'lifecycle',
  'currentAudit',
  'captureReading',
  'history',
  'supersedes',
  'beforeAfter',
  'stopLine',
  'nextStep',
]
const captureKeys = [
  'kind',
  'nativeFieldSemantics',
  'entryCount',
  'entryKey',
  'sourceDocumentSemanticReviewPerformed',
  'entryBindingsAreCurrentTemplateApproval',
  'captureSummaryIsCurrentRegistrySummary',
  'consumerUse',
]
const roots = new WeakSet()
const object = (value) => value !== null && typeof value === 'object' && !Array.isArray(value)
const exactKeys = (value, keys) =>
  object(value) &&
  Object.keys(value).length === keys.length &&
  keys.every((key) => Object.hasOwn(value, key))
const nonempty = (value) => typeof value === 'string' && Boolean(value.trim())
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
function freeze(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze(child)
    Object.freeze(value)
  }
  return value
}

/** Only the fixed baseline root/view uses this strict byte and decoded-key parser. */
function parseBaseline(buffer) {
  if (!Buffer.isBuffer(buffer)) throw new Error('baseline requires original Buffer')
  const text = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(buffer)
  const value = JSON.parse(text)
  let offset = 0
  const space = () => {
    while (/\s/.test(text[offset] ?? '') && offset < text.length) offset++
  }
  const string = () => {
    const start = offset++
    while (offset < text.length) {
      const char = text[offset++]
      if (char === '\\') offset++
      else if (char === '"') return JSON.parse(text.slice(start, offset))
    }
    throw new Error('unterminated baseline string')
  }
  const visit = () => {
    space()
    if (text[offset] === '{') {
      offset++
      space()
      const keys = new Set()
      while (text[offset] !== '}') {
        const key = string()
        if (keys.has(key)) throw new Error(`duplicate baseline JSON key: ${key}`)
        keys.add(key)
        space()
        offset++
        visit()
        space()
        if (text[offset] !== ',') break
        offset++
        space()
      }
      offset++
    } else if (text[offset] === '[') {
      offset++
      space()
      while (text[offset] !== ']') {
        visit()
        space()
        if (text[offset] !== ',') break
        offset++
      }
      offset++
    } else if (text[offset] === '"') string()
    else {
      const token = /^(?:true|false|null|-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/.exec(text.slice(offset))
      if (!token) throw new Error('invalid baseline token')
      offset += token[0].length
    }
  }
  visit()
  space()
  if (offset !== text.length) throw new Error('incomplete baseline parse')
  return value
}

export function readFrozenBaselineRoot(readSourceBuffer) {
  const source =
    typeof readSourceBuffer === 'function' ? readSourceBuffer(frozenDocumentBaseline) : undefined
  if (
    !source ||
    source.revision !== frozenDocumentBaseline.revision ||
    source.path !== frozenDocumentBaseline.path ||
    source.mode !== '100644' ||
    source.gitObject !== frozenDocumentBaseline.gitObject ||
    !Buffer.isBuffer(source.buffer) ||
    digest(source.buffer) !== frozenDocumentBaseline.sha256
  )
    return {
      entries: [],
      issues: ['frozen baseline original Git Buffer identity mismatch or unavailable'],
    }
  let native
  try {
    native = parseBaseline(source.buffer)
  } catch {
    return { entries: [], issues: ['frozen baseline original strict JSON invalid'] }
  }
  if (
    !exactKeys(native, nativeKeys) ||
    native.denominator !== frozenDocumentBaseline.denominator ||
    !Array.isArray(native.entries) ||
    native.entries.length !== frozenDocumentBaseline.denominator ||
    native.entries.some((entry) => !nonempty(entry?.path)) ||
    new Set(native.entries.map((entry) => entry.path)).size !== frozenDocumentBaseline.denominator
  )
    return { entries: [], issues: ['frozen baseline original eight-field/index structure invalid'] }
  const root = freeze({ native, entries: native.entries, issues: [] })
  roots.add(root)
  return root
}

export function inspectFrozenBaselineView(buffer, root) {
  if (!roots.has(root)) return { entries: [], issues: ['fixed baseline root required'] }
  if (!Buffer.isBuffer(buffer))
    return { entries: root.entries, issues: ['baseline view requires original Buffer'] }
  if (digest(buffer) === frozenDocumentBaseline.sha256)
    return { entries: root.entries, state: 'original', issues: [] }
  let value
  try {
    value = parseBaseline(buffer)
  } catch {
    return {
      entries: root.entries,
      issues: ['baseline view strict UTF8/JSON or duplicate decoded key invalid'],
    }
  }
  const issues = []
  const native = { ...value }
  delete native._governance
  if (!exactKeys(value, [...nativeKeys, '_governance']) || !isDeepStrictEqual(native, root.native))
    issues.push('frozen baseline native fields changed')
  const meta = value?._governance
  if (!exactKeys(meta, governanceKeys))
    issues.push('frozen baseline governance requires exact19 keys')
  for (const [key, expected] of Object.entries(frozenBindingTemplate)) {
    if (key !== 'sourceKind' && meta?.[key] !== expected)
      issues.push(`baseline declaration mismatch: ${key}`)
  }
  for (const key of ['owner', 'scope', 'beforeAfter', 'stopLine', 'nextStep'])
    if (!nonempty(meta?.[key])) issues.push(`baseline governance nonempty field required: ${key}`)
  if (
    typeof meta?.lastReviewed !== 'string' ||
    !/^\d{4}-\d{2}-\d{2}$/.test(meta.lastReviewed) ||
    !Number.isFinite(Date.parse(meta.lastReviewed)) ||
    new Date(meta.lastReviewed).toISOString().slice(0, 10) !== meta.lastReviewed
  )
    issues.push('baseline governance valid review date required')
  for (const key of ['provenance', 'primarySource', 'history'])
    if (!Array.isArray(meta?.[key]) || meta[key].length === 0)
      issues.push(`baseline governance nonempty array required: ${key}`)
  if (!Array.isArray(meta?.supersedes)) issues.push('baseline supersedes array required')
  if (
    meta?.sourceGitRevision !== frozenDocumentBaseline.revision ||
    meta?.sourceGitObject !== frozenDocumentBaseline.gitObject ||
    meta?.sourceSha256 !== frozenDocumentBaseline.sha256 ||
    !Array.isArray(meta?.primarySource) ||
    !meta.primarySource.includes(
      `${frozenDocumentBaseline.revision}:${frozenDocumentBaseline.path}`,
    )
  )
    issues.push('baseline governance fixed source declaration mismatch')
  if (
    meta?.lifecycle !== 'historical' ||
    !exactKeys(meta?.currentAudit, ['kind', 'runtimeExecutionPerformed']) ||
    meta.currentAudit.kind !== 'static-document-governance' ||
    meta.currentAudit.runtimeExecutionPerformed !== false
  )
    issues.push('baseline current audit must be static and nonexecuting')
  const reading = meta?.captureReading
  if (
    !exactKeys(reading, captureKeys) ||
    reading.kind !== 'frozen-provisional-binding-capture' ||
    reading.entryCount !== frozenDocumentBaseline.denominator ||
    reading.entryKey !== 'path' ||
    reading.consumerUse !== 'approved-1838-cohort-source-anchor' ||
    !exactKeys(reading.nativeFieldSemantics, nativeKeys) ||
    !Object.values(reading.nativeFieldSemantics).every(nonempty) ||
    [
      'sourceDocumentSemanticReviewPerformed',
      'entryBindingsAreCurrentTemplateApproval',
      'captureSummaryIsCurrentRegistrySummary',
    ].some((key) => reading[key] !== false)
  )
    issues.push(
      'baseline capture reading must describe original eight fields without source-review/current-binding credit',
    )
  return { entries: root.entries, state: issues.length ? 'invalid' : 'governed', issues }
}
