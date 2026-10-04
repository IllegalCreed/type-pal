import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { loadCatalog, renderIndexes } from './generate-testing-index.mjs'

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
export const testingRoot = resolve(repoRoot, 'docs/testing')
const statuses = new Set([
  'draft',
  'active',
  'verified',
  'rework',
  'superseded',
  'archived',
  'proposal',
  'current',
])
const dependencyStatuses = new Set(['current', 'verified'])
const allowedRootFiles = new Set([
  'README.md',
  'catalog.json',
  'governance.md',
  'legacy-flat.json',
  'legacy-flat-classification.json',
])
const agentPathPattern = /(?:^|[-_/])(codex|cursor|glm|grok|kimi|gemini)(?:[-_/]|$)/i

const fail = (issues, message) => issues.push(message)
const read = (path) => JSON.parse(readFileSync(path, 'utf8'))

export function parseTestingMeta(text) {
  const match = /<!-- testing-meta\s*\n([\s\S]*?)\n-->/m.exec(text)
  if (!match) return null
  try {
    return JSON.parse(match[1])
  } catch {
    return { __parseError: true }
  }
}

export function parseTestingFrontMatter(text) {
  const match = /^---\s*\n([\s\S]*?)\n---\s*\n/.exec(text)
  if (!match) return null
  const fields = {}
  for (const line of match[1].split('\n')) {
    const separator = line.indexOf(':')
    if (separator < 0) continue
    const key = line.slice(0, separator).trim()
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    fields[key] = /^\d+$/.test(value) ? Number(value) : value
  }
  return fields
}

function parseLineRange(value) {
  if (typeof value !== 'string') return null
  const match = /^(\d+)(?:-(\d+))?$/.exec(value)
  if (!match) return null
  return { start: Number(match[1]), end: Number(match[2] ?? match[1]) }
}

function sourceRefIssues(refs, prefix) {
  const issues = []
  if (!Array.isArray(refs) || refs.length === 0) return [`${prefix}: sourceRefs must be non-empty`]
  for (const ref of refs) {
    if (!ref || typeof ref.path !== 'string' || !ref.path || !ref.lines)
      return [`${prefix}: every sourceRef needs path and lines`]
    const absolute = resolve(repoRoot, ref.path)
    if (!existsSync(absolute)) {
      issues.push(`${prefix}: sourceRef path missing ${ref.path}`)
      continue
    }
    const range = parseLineRange(ref.lines)
    if (!range || range.start < 1 || range.end < range.start) {
      issues.push(`${prefix}: invalid sourceRef lines ${ref.path}:${ref.lines}`)
      continue
    }
    const lineCount = readFileSync(absolute, 'utf8').split('\n').length
    if (range.end > lineCount)
      issues.push(`${prefix}: sourceRef line out of range ${ref.path}:${ref.lines}`)
  }
  return issues
}

function walkFiles(root) {
  const files = []
  if (!existsSync(root)) return files
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name)
    if (entry.isDirectory()) files.push(...walkFiles(path))
    else files.push(path)
  }
  return files
}

export function validateTestingOrphans(catalog, root = testingRoot) {
  const issues = []
  const entries = catalog.entries ?? []
  const canonical = new Set(entries.map((entry) => entry.canonical))
  const indexes = new Set(entries.map((entry) => entry.index))
  const evidence = new Set(entries.map((entry) => entry.evidence))
  const stagesRoot = resolve(root, 'e2e/stages')
  if (existsSync(stagesRoot)) {
    for (const stage of readdirSync(stagesRoot, { withFileTypes: true })) {
      if (!stage.isDirectory()) continue
      const stagePath = `e2e/stages/${stage.name}`
      const report = `${stagePath}/report.md`
      const readme = `${stagePath}/README.md`
      if (!existsSync(resolve(root, report)))
        issues.push(`orphan E2E stage missing report: ${report}`)
      else if (!canonical.has(report))
        issues.push(`orphan E2E canonical report is not in catalog: ${report}`)
      if (!existsSync(resolve(root, readme)))
        issues.push(`orphan E2E stage missing README: ${readme}`)
      else if (!indexes.has(readme))
        issues.push(`orphan E2E stage README is not in catalog: ${readme}`)
    }
  }
  const evidenceRoot = resolve(root, 'e2e/evidence')
  if (existsSync(evidenceRoot)) {
    for (const file of walkFiles(evidenceRoot)) {
      const relativePath = relative(root, file)
      if (!evidence.has(relativePath))
        issues.push(`orphan evidence is not paired with catalog: ${relativePath}`)
    }
  }
  for (const file of walkFiles(root)) {
    if (!/\.(?:md|json)$/i.test(file)) continue
    const text = readFileSync(file, 'utf8')
    if (text.includes('002-inn-e56'))
      issues.push(`stale E2E-002 path remains: ${relative(root, file)}`)
  }
  return issues
}

function validateCanonicalEvidence(entry, root) {
  const issues = []
  const canonicalPath = resolve(root, entry.canonical)
  if (!existsSync(canonicalPath)) return issues
  const canonicalText = readFileSync(canonicalPath, 'utf8')
  const frontMatter = parseTestingFrontMatter(canonicalText)
  if (!frontMatter) issues.push(`${entry.id}: canonical missing testing front matter`)
  else {
    if (frontMatter.testingSchema !== 2)
      issues.push(`${entry.id}: front matter testingSchema must be 2`)
    if (frontMatter.id !== entry.id) issues.push(`${entry.id}: front matter id mismatch`)
    if (frontMatter.evidence !== entry.evidence)
      issues.push(`${entry.id}: front matter evidence path mismatch`)
  }
  const metadata = parseTestingMeta(canonicalText)
  if (!metadata) return [`${entry.id}: canonical missing testing-meta block`]
  if (metadata.__parseError) return [`${entry.id}: canonical testing-meta is invalid JSON`]
  if (metadata.schemaVersion !== 2)
    issues.push(`${entry.id}: canonical metadata schemaVersion must be 2`)
  if (metadata.id !== entry.id) issues.push(`${entry.id}: canonical metadata id mismatch`)
  for (const field of ['publicCallers', 'legalInputs'])
    if (!Array.isArray(metadata[field]) || metadata[field].length === 0)
      issues.push(`${entry.id}: canonical metadata missing ${field}`)
  const history = metadata.history ?? metadata.revision?.history ?? []
  if (!Array.isArray(history) || history.length === 0)
    issues.push(`${entry.id}: canonical metadata missing history`)
  if (
    !metadata.businessOracle ||
    !Array.isArray(metadata.businessOracle.assertions) ||
    metadata.businessOracle.assertions.length === 0
  )
    issues.push(`${entry.id}: canonical metadata missing businessOracle.assertions`)
  if (!metadata.dedupe || typeof metadata.dedupe.result !== 'string')
    issues.push(`${entry.id}: canonical metadata missing dedupe result`)
  const revision = metadata.revision
  if (
    !revision ||
    (!revision.currentSha &&
      !Array.isArray(revision.currentShas) &&
      revision.shaStatus !== 'missing-in-report')
  )
    issues.push(`${entry.id}: canonical metadata missing current SHA or explicit shaStatus`)
  if (
    !revision ||
    !Number.isInteger(revision.contentVersion) ||
    !Number.isInteger(revision.minimumSaveVersion)
  )
    issues.push(`${entry.id}: canonical metadata missing content/save version`)
  issues.push(...sourceRefIssues(metadata.sourceRefs, entry.id))
  if (metadata.evidence !== entry.evidence)
    issues.push(`${entry.id}: canonical evidence path does not match catalog`)
  const evidencePath = resolve(root, entry.evidence ?? '')
  if (!entry.evidence || !existsSync(evidencePath)) {
    issues.push(`${entry.id}: missing evidence ${entry.evidence ?? '<missing>'}`)
    return issues
  }
  let evidence
  try {
    evidence = read(evidencePath)
  } catch {
    issues.push(`${entry.id}: evidence is invalid JSON`)
    return issues
  }
  if (evidence.schemaVersion !== 2) issues.push(`${entry.id}: evidence schemaVersion must be 2`)
  if (evidence.id !== entry.id) issues.push(`${entry.id}: evidence id mismatch`)
  if (evidence.status !== entry.status) issues.push(`${entry.id}: evidence status mismatch`)
  issues.push(...sourceRefIssues(evidence.sourceRefs, `${entry.id} evidence`))
  for (const field of ['publicCallers', 'legalInputs'])
    if (!Array.isArray(evidence[field]) || evidence[field].length === 0)
      issues.push(`${entry.id} evidence: missing ${field}`)
  if (
    !evidence.businessOracle ||
    !Array.isArray(evidence.businessOracle.assertions) ||
    evidence.businessOracle.assertions.length === 0
  )
    issues.push(`${entry.id} evidence: missing businessOracle.assertions`)
  if (!evidence.dedupe || typeof evidence.dedupe.result !== 'string')
    issues.push(`${entry.id} evidence: missing dedupe result`)
  for (const claim of evidence.claims ?? []) {
    if (!claim.id || !claim.result || !Array.isArray(claim.evidence))
      issues.push(`${entry.id} evidence: malformed claim`)
    if (/runtime-backed|source-backed/.test(claim.result) && claim.evidence.length === 0)
      issues.push(`${entry.id} evidence: positive claim ${claim.id} has no evidence`)
  }
  return issues
}

export function validateLegacyClassification(root = testingRoot) {
  const issues = []
  const manifestPath = resolve(root, 'legacy-flat.json')
  const classificationPath = resolve(root, 'legacy-flat-classification.json')
  if (!existsSync(classificationPath))
    return ['missing docs/testing/legacy-flat-classification.json']
  let manifest, classification
  try {
    manifest = read(manifestPath)
    classification = read(classificationPath)
  } catch {
    return ['legacy-flat or classification ledger is invalid JSON']
  }
  const legacyPaths = new Set((manifest.entries ?? []).map((entry) => entry.path))
  const entries = classification.entries ?? []
  if (classification.schemaVersion !== 1)
    issues.push('legacy classification schemaVersion must be 1')
  if (entries.length !== legacyPaths.size)
    issues.push('legacy classification count does not match legacy-flat manifest')
  const seen = new Set()
  for (const entry of entries) {
    if (!legacyPaths.has(entry.path))
      issues.push(`classification points to unregistered legacy file: ${entry.path}`)
    if (seen.has(entry.path)) issues.push(`duplicate classification path: ${entry.path}`)
    seen.add(entry.path)
    for (const field of [
      'domain',
      'module',
      'capability',
      'provenance',
      'sourceSha',
      'canonicalTarget',
      'disposition',
      'reason',
    ])
      if (entry[field] === undefined || entry[field] === null || entry[field] === '')
        issues.push(`classification ${entry.path}: missing ${field}`)
    if (entry.agentInCanonicalPath || agentPathPattern.test(entry.canonicalTarget))
      issues.push(`classification ${entry.path}: agent name leaked into canonicalTarget`)
    const absolute = resolve(root, entry.path)
    if (!existsSync(absolute)) issues.push(`classification points to missing file: ${entry.path}`)
  }
  for (const path of legacyPaths)
    if (!seen.has(path)) issues.push(`legacy file lacks classification: ${path}`)
  return issues
}

export function validateCatalog(
  catalog,
  root = testingRoot,
  today = new Date().toISOString().slice(0, 10),
) {
  const issues = []
  if (catalog.schemaVersion !== 2) fail(issues, 'catalog.schemaVersion must be 2')
  const seen = new Set()
  for (const entry of catalog.entries ?? []) {
    if (!entry.id || seen.has(entry.id))
      fail(issues, `duplicate or missing id: ${entry.id ?? '<missing>'}`)
    seen.add(entry.id)
    for (const field of [
      'kind',
      'title',
      'status',
      'phase',
      'engines',
      'owner',
      'canonical',
      'index',
      'tags',
      'lastVerified',
      'reviewBy',
      'dependsOn',
      'provenance',
      'domain',
      'module',
      'evidence',
      'sourceRefs',
      'publicCallers',
      'legalInputs',
      'businessOracle',
      'dedupe',
      'revision',
    ])
      if (entry[field] === undefined) fail(issues, `${entry.id}: missing ${field}`)
    if (!statuses.has(entry.status)) fail(issues, `${entry.id}: invalid status ${entry.status}`)
    for (const path of [entry.canonical, entry.index])
      if (!path || !existsSync(resolve(root, path)))
        fail(issues, `${entry.id}: missing path ${path}`)
    if (entry.reviewBy < today && !['archived', 'superseded'].includes(entry.status))
      fail(issues, `${entry.id}: reviewBy ${entry.reviewBy} is before ${today}`)
    for (const path of [entry.canonical, entry.index, entry.evidence])
      if (path && agentPathPattern.test(path))
        fail(issues, `${entry.id}: agent name cannot appear in canonical/index/evidence path`)
    if (!Array.isArray(entry.sourceRefs) || entry.sourceRefs.length === 0)
      fail(issues, `${entry.id}: sourceRefs must be non-empty`)
    if (!Array.isArray(entry.publicCallers) || entry.publicCallers.length === 0)
      fail(issues, `${entry.id}: publicCallers must be non-empty`)
    if (!Array.isArray(entry.legalInputs) || entry.legalInputs.length === 0)
      fail(issues, `${entry.id}: legalInputs must be non-empty`)
    if (
      !entry.businessOracle?.type ||
      !Array.isArray(entry.businessOracle.assertions) ||
      entry.businessOracle.assertions.length === 0
    )
      fail(issues, `${entry.id}: businessOracle must include type and assertions`)
    if (!entry.dedupe?.result || !Array.isArray(entry.dedupe.against))
      fail(issues, `${entry.id}: dedupe must include result and against`)
    if (
      !entry.revision ||
      (!entry.revision.currentSha &&
        !Array.isArray(entry.revision.currentShas) &&
        entry.revision.shaStatus !== 'missing-in-report')
    )
      fail(
        issues,
        `${entry.id}: revision must include currentSha/currentShas or explicit shaStatus`,
      )
    if (
      !Number.isInteger(entry.revision?.contentVersion) ||
      !Number.isInteger(entry.revision?.minimumSaveVersion)
    )
      fail(issues, `${entry.id}: revision must include contentVersion and minimumSaveVersion`)
    const stageReadme = resolve(root, entry.index ?? '')
    if (
      entry.kind === 'e2e-stage' &&
      (!existsSync(stageReadme) || !readFileSync(stageReadme, 'utf8').includes(`id: ${entry.id}`))
    )
      fail(issues, `${entry.id}: stage README metadata does not match catalog`)
  }
  const ids = new Set(catalog.entries.map((entry) => entry.id))
  for (const entry of catalog.entries)
    for (const dep of entry.dependsOn ?? [])
      if (!ids.has(dep)) fail(issues, `${entry.id}: unknown dependency ${dep}`)
      else if (
        !dependencyStatuses.has(catalog.entries.find((candidate) => candidate.id === dep).status)
      )
        fail(issues, `${entry.id}: dependency ${dep} is not current/verified`)
  return issues
}

export function validateIndexes(catalog, root = testingRoot) {
  const issues = []
  for (const [name, expected] of Object.entries(renderIndexes(catalog))) {
    const path = resolve(root, 'indexes', name)
    if (!existsSync(path)) issues.push(`missing generated index ${relative(repoRoot, path)}`)
    else if (readFileSync(path, 'utf8') !== expected)
      issues.push(`stale generated index ${relative(repoRoot, path)}`)
  }
  return issues
}

export function validateLegacyFlat(
  root = testingRoot,
  today = new Date().toISOString().slice(0, 10),
) {
  const issues = []
  const manifestPath = resolve(root, 'legacy-flat.json')
  if (!existsSync(manifestPath)) return ['missing docs/testing/legacy-flat.json']
  const manifest = read(manifestPath)
  const listed = new Map((manifest.entries ?? []).map((entry) => [entry.path, entry]))
  for (const name of readdirSync(root, { withFileTypes: true })) {
    if (!name.isFile() || allowedRootFiles.has(name.name)) continue
    const entry = listed.get(name.name)
    if (!entry) issues.push(`new flat testing file is not registered: ${name.name}`)
    else if (!entry.migrateBy || entry.migrateBy < today)
      issues.push(`legacy flat file needs migration review: ${name.name}`)
  }
  for (const entry of manifest.entries ?? [])
    if (!existsSync(resolve(root, entry.path)))
      issues.push(`legacy manifest points to missing file: ${entry.path}`)
  return issues
}

export function auditTestingDocs({ root = testingRoot, today } = {}) {
  const catalog = loadCatalog(root)
  return [
    ...validateCatalog(catalog, root, today),
    ...catalog.entries.flatMap((entry) => validateCanonicalEvidence(entry, root)),
    ...validateTestingOrphans(catalog, root),
    ...validateIndexes(catalog, root),
    ...validateLegacyFlat(root, today),
    ...validateLegacyClassification(root),
  ]
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const issues = auditTestingDocs()
  console.log(`testing docs: ${issues.length ? 'FAIL' : 'PASS'} (${issues.length} issues)`)
  for (const issue of issues) console.error(`- ${issue}`)
  if (issues.length) process.exitCode = 1
}
