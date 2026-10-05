import { createHash } from 'node:crypto'
import { existsSync, readdirSync, readFileSync } from 'node:fs'
import { dirname, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isDeepStrictEqual } from 'node:util'
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
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const strings = (value) =>
  Array.isArray(value) &&
  value.length > 0 &&
  value.every((item) => typeof item === 'string' && item.trim())
const safePath = (path) =>
  typeof path === 'string' &&
  path.length > 0 &&
  !path.startsWith('/') &&
  !path.includes('\\') &&
  !path.split('/').some((part) => ['', '.', '..'].includes(part))
const validDate = (value) =>
  typeof value === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(value) &&
  !Number.isNaN(Date.parse(value)) &&
  new Date(value).toISOString().slice(0, 10) === value

export function parseTestingMeta(text) {
  const match = /<!-- testing-meta\s*\n([\s\S]*?)\n-->/m.exec(text)
  if (!match) return null
  try {
    const parsed = JSON.parse(match[1])
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
      ? parsed
      : { __parseError: true }
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
    if (separator < 0) return { __parseError: true }
    const key = line.slice(0, separator).trim()
    const value = line
      .slice(separator + 1)
      .trim()
      .replace(/^['"]|['"]$/g, '')
    if (!key || fields[key] !== undefined) return { __parseError: true }
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

function sourceRefIssues(refs, prefix, sourceRoot = repoRoot) {
  const issues = []
  if (!Array.isArray(refs) || refs.length === 0) return [`${prefix}: sourceRefs must be non-empty`]
  for (const ref of refs) {
    if (!ref || !safePath(ref.path) || !ref.lines)
      return [`${prefix}: every sourceRef needs path and lines`]
    const absolute = resolve(sourceRoot, ref.path)
    if (!existsSync(absolute)) {
      issues.push(`${prefix}: sourceRef path missing ${ref.path}`)
      continue
    }
    const range = parseLineRange(ref.lines)
    if (!range || range.start < 1 || range.end < range.start) {
      issues.push(`${prefix}: invalid sourceRef lines ${ref.path}:${ref.lines}`)
      continue
    }
    const bytes = readFileSync(absolute)
    const lines = bytes.toString('utf8').trimEnd().split('\n')
    const lineCount = lines.length
    if (range.end > lineCount)
      issues.push(`${prefix}: sourceRef line out of range ${ref.path}:${ref.lines}`)
    if (!/^[a-f\d]{64}$/.test(ref.sha256 ?? '') || digest(bytes) !== ref.sha256)
      issues.push(`${prefix}: sourceRef hash mismatch ${ref.path}`)
    if (
      typeof ref.anchor !== 'string' ||
      !ref.anchor ||
      !lines
        .slice(range.start - 1, range.end)
        .join('\n')
        .includes(ref.anchor)
    )
      issues.push(`${prefix}: sourceRef anchor not in declared range ${ref.path}:${ref.lines}`)
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
  const historical = new Set(
    entries
      .flatMap((entry) => [entry.historical?.report, entry.historical?.evidence])
      .filter(Boolean),
  )
  for (const file of walkFiles(resolve(root, 'domains'))) {
    const path = relative(root, file)
    if (!/\.(md|json)$/.test(path) || path.endsWith('/README.md') || historical.has(path)) continue
    if (!canonical.has(path) && !evidence.has(path))
      issues.push(`orphan managed domain document: ${path}`)
  }
  for (const file of walkFiles(root)) {
    if (!/\.(?:md|json)$/i.test(file)) continue
    if (relative(root, file).startsWith('archive/') || relative(root, file).includes('/history/'))
      continue
    const text = readFileSync(file, 'utf8')
    if (text.includes('002-inn-e56'))
      issues.push(`stale E2E-002 path remains: ${relative(root, file)}`)
  }
  return issues
}

export function validateCanonicalEvidence(entry, root = testingRoot, sourceRoot = repoRoot) {
  const issues = []
  if (!safePath(entry.canonical) || !safePath(entry.evidence))
    return [`${entry.id}: unsafe canonical/evidence path`]
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
    if (!strings(metadata[field])) issues.push(`${entry.id}: canonical metadata missing ${field}`)
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
  issues.push(...sourceRefIssues(metadata.sourceRefs, entry.id, sourceRoot))
  for (const field of [
    'sourceRefs',
    'publicCallers',
    'legalInputs',
    'businessOracle',
    'dedupe',
    'revision',
  ])
    if (!isDeepStrictEqual(metadata[field], entry[field]))
      issues.push(`${entry.id}: metadata/catalog mismatch ${field}`)
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
  for (const field of ['sourceRefs', 'publicCallers', 'legalInputs', 'businessOracle', 'dedupe'])
    if (!isDeepStrictEqual(evidence[field], entry[field]))
      issues.push(`${entry.id}: evidence/catalog mismatch ${field}`)
  if (evidence.candidateSha !== entry.revision?.currentSha)
    issues.push(`${entry.id}: evidence/catalog candidate SHA mismatch`)
  if (
    evidence.versions?.content !== entry.revision?.contentVersion ||
    evidence.versions?.minimumSave !== entry.revision?.minimumSaveVersion
  )
    issues.push(`${entry.id}: evidence/catalog version mismatch`)
  if (!isDeepStrictEqual(evidence.history, entry.revision?.history))
    issues.push(`${entry.id}: evidence/catalog history mismatch`)
  issues.push(...sourceRefIssues(evidence.sourceRefs, `${entry.id} evidence`, sourceRoot))
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
  if (!Array.isArray(evidence.claims) || !evidence.claims.length)
    issues.push(`${entry.id} evidence: claims must be non-empty`)
  const claimIds = new Set()
  for (const claim of Array.isArray(evidence.claims) ? evidence.claims : []) {
    if (!claim?.id || !claim.result || !Array.isArray(claim.evidence)) {
      issues.push(`${entry.id} evidence: malformed claim`)
      continue
    }
    if (claimIds.has(claim.id)) issues.push(`${entry.id} evidence: duplicate claim ${claim.id}`)
    claimIds.add(claim.id)
    if (['runtime-backed', 'source-backed'].includes(claim.result) && claim.evidence.length === 0)
      issues.push(`${entry.id} evidence: positive claim ${claim.id} has no evidence`)
    if (claim.result === 'source-backed')
      for (const reference of claim.evidence)
        if (
          !(evidence.sourceRefs ?? []).some(
            (source) => reference === `${source.path}:${source.lines}`,
          )
        )
          issues.push(
            `${entry.id} evidence: claim ${claim.id} references undeclared source ${reference}`,
          )
    if (
      claim.result === 'runtime-backed' &&
      (evidence.kind !== 'runtime-execution' ||
        evidence.runtimeExecution?.performed !== true ||
        !(evidence.artifacts ?? []).length)
    )
      issues.push(
        `${entry.id} evidence: runtime claim lacks actual execution/artifacts ${claim.id}`,
      )
  }
  if (evidence.kind === 'runtime-execution') {
    for (const artifact of Array.isArray(evidence.artifacts) ? evidence.artifacts : []) {
      if (
        !safePath(artifact.path) ||
        !existsSync(resolve(sourceRoot, artifact.path)) ||
        !/^[a-f\d]{64}$/.test(artifact.sha256 ?? '')
      ) {
        issues.push(`${entry.id}: runtime artifact lacks file/hash ${artifact.path}`)
        continue
      }
      if (digest(readFileSync(resolve(sourceRoot, artifact.path))) !== artifact.sha256)
        issues.push(`${entry.id}: runtime artifact hash mismatch ${artifact.path}`)
    }
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
  const activePaths = new Set((manifest.entries ?? []).map((entry) => entry.path))
  const retiredPaths = new Set((manifest.retired ?? []).map((entry) => entry.path))
  const legacyPaths = new Set([...activePaths, ...retiredPaths])
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
      'classificationBasis',
      'reviewStatus',
      'inventory',
    ])
      if (entry[field] === undefined || entry[field] === null || entry[field] === '')
        issues.push(`classification ${entry.path}: missing ${field}`)
    const archivePreservesProvenance =
      typeof entry.canonicalTarget === 'string' &&
      entry.canonicalTarget.startsWith('archive/legacy/')
    if (
      entry.agentInCanonicalPath ||
      (agentPathPattern.test(entry.canonicalTarget) && !archivePreservesProvenance)
    )
      issues.push(`classification ${entry.path}: agent name leaked into canonicalTarget`)
    if (!/^[a-f\d]{64}$/.test(entry.sourceSha ?? ''))
      issues.push(`classification ${entry.path}: sourceSha must be full SHA-256`)
    if (
      !Array.isArray(entry.inventory?.sourceFiles) ||
      typeof entry.inventory.lineCount !== 'number'
    )
      issues.push(`classification ${entry.path}: inventory must include sourceFiles and lineCount`)
    const absolute = resolve(root, entry.path)
    if (entry.disposition === 'migrated') {
      const planRef = entry.supersededBy?.replace(/^docs\/testing\//, '')
      if (!planRef || !existsSync(resolve(root, planRef)))
        issues.push(`classification ${entry.path}: migrated entry missing migration plan`)
      if (
        !entry.canonicalTarget ||
        !existsSync(resolve(root, entry.canonicalTarget.replace(/^docs\/testing\//, '')))
      )
        issues.push(
          `classification ${entry.path}: migrated target missing ${entry.canonicalTarget}`,
        )
    } else if (!existsSync(absolute))
      issues.push(`classification points to missing file: ${entry.path}`)
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
  if (!catalog || typeof catalog !== 'object' || !Array.isArray(catalog.entries))
    return ['catalog.entries must be an array']
  if (catalog.schemaVersion !== 2) fail(issues, 'catalog.schemaVersion must be 2')
  const seen = new Set()
  const pathsSeen = new Set()
  for (const entry of catalog.entries ?? []) {
    if (!entry || typeof entry !== 'object') {
      issues.push('catalog entry must be an object')
      continue
    }
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
    for (const path of [entry.canonical, entry.index, entry.evidence])
      if (!safePath(path) || !existsSync(resolve(root, path)))
        fail(issues, `${entry.id}: missing path ${path}`)
    if (pathsSeen.has(entry.canonical))
      issues.push(`${entry.id}: duplicate canonical path ${entry.canonical}`)
    pathsSeen.add(entry.canonical)
    for (const field of ['phase', 'engines', 'provenance', 'tags', 'publicCallers', 'legalInputs'])
      if (!strings(entry[field]))
        issues.push(`${entry.id}: ${field} must contain non-empty strings`)
    if (
      !Array.isArray(entry.dependsOn) ||
      !entry.dependsOn.every((dep) => typeof dep === 'string' && dep)
    )
      issues.push(`${entry.id}: dependsOn must be an array of IDs`)
    for (const field of ['lastVerified', 'reviewBy'])
      if (!validDate(entry[field])) issues.push(`${entry.id}: invalid date ${field}`)
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
    if (entry.revision?.currentSha && !/^[a-f\d]{40}$/.test(entry.revision.currentSha))
      issues.push(`${entry.id}: currentSha must be a full Git SHA`)
    const stageReadme = resolve(root, entry.index ?? '')
    if (
      entry.kind === 'e2e-stage' &&
      (!safePath(entry.index) ||
        !existsSync(stageReadme) ||
        !readFileSync(stageReadme, 'utf8').includes(`id: ${entry.id}`))
    )
      fail(issues, `${entry.id}: stage README metadata does not match catalog`)
    if (entry.kind === 'e2e-stage' && safePath(entry.index) && existsSync(stageReadme)) {
      const text = readFileSync(stageReadme, 'utf8')
      for (const field of ['status', 'lastVerified', 'reviewBy'])
        if (!text.includes(`${field}: ${entry[field]}\n`))
          issues.push(`${entry.id}: stage README ${field} mismatch`)
    }
  }
  const entries = catalog.entries.filter((entry) => entry && typeof entry === 'object')
  const ids = new Set(entries.map((entry) => entry.id))
  for (const entry of entries)
    for (const dep of Array.isArray(entry.dependsOn) ? entry.dependsOn : [])
      if (!ids.has(dep)) fail(issues, `${entry.id}: unknown dependency ${dep}`)
      else if (!dependencyStatuses.has(entries.find((candidate) => candidate.id === dep).status))
        fail(issues, `${entry.id}: dependency ${dep} is not current/verified`)
  const visiting = new Set()
  const visited = new Set()
  function visit(id) {
    if (visiting.has(id)) {
      issues.push(`dependency cycle involving ${id}`)
      return
    }
    if (visited.has(id)) return
    visiting.add(id)
    const entry = entries.find((candidate) => candidate.id === id)
    for (const dep of Array.isArray(entry?.dependsOn) ? entry.dependsOn : [])
      if (ids.has(dep)) visit(dep)
    visiting.delete(id)
    visited.add(id)
  }
  for (const id of ids) visit(id)
  return issues
}

export function validateIndexes(catalog, root = testingRoot) {
  const issues = []
  const classificationPath = resolve(root, 'legacy-flat-classification.json')
  const classification = existsSync(classificationPath) ? read(classificationPath) : { entries: [] }
  for (const [name, expected] of Object.entries(renderIndexes(catalog, classification))) {
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
  const frozenPaths = [...(manifest.entries ?? []), ...(manifest.retired ?? [])]
    .map((entry) => entry.path)
    .sort()
  if (
    !manifest.frozenCensus ||
    manifest.frozenCensus.count !== frozenPaths.length ||
    digest(frozenPaths.join('\n')) !== manifest.frozenCensus.sha256
  )
    issues.push(
      'legacy frozen census changed: new entries cannot be authorized by appending to the manifest',
    )
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
  const catalogIssues = validateCatalog(catalog, root, today)
  if (catalogIssues.length) return catalogIssues
  return [
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
