import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const path = 'docs/testing/e2e/evidence/e2e-006.json'
const variant = 'historical-execution-publication-v2'
const registryPath = 'docs/phase-governance/templates/registry.json'
const baselinePath = 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json'
const digest = (text) => createHash('sha256').update(text).digest('hex')
const readJson = (relative) => JSON.parse(readFileSync(join(root, relative), 'utf8'))

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-doc-source-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const write = (relative, text) => {
    mkdirSync(dirname(join(directory, relative)), { recursive: true })
    writeFileSync(join(directory, relative), text)
  }
  const json = (relative, value) => write(relative, `${JSON.stringify(value, null, 2)}\n`)
  const read = (relative) => {
    try {
      return readFileSync(join(directory, relative), 'utf8')
    } catch {
      return undefined
    }
  }
  const git = (...args) => execFileSync('git', args, { cwd: directory, encoding: 'utf8' }).trim()
  const commitSource = () => {
    git('add', path)
    git(
      '-c',
      'user.name=Docs fixture',
      '-c',
      'user.email=docs-fixture@example.invalid',
      'commit',
      '-qm',
      'source fixture',
    )
    return { revision: git('rev-parse', 'HEAD'), gitObject: git('rev-parse', `HEAD:${path}`) }
  }
  const candidate = readJson(path)
  const registry = readJson(registryPath)
  const pin = structuredClone(registry.historicalSourcePins.find((source) => source.path === path))
  const sourceText = readGitDocumentSource(root, pin).text
  const original = JSON.parse(sourceText)
  const baselineText = readGitDocumentSource(root, frozenDocumentBaseline).text
  write(path, sourceText)
  git('init', '-q')
  commitSource()
  // Copy only the frozen commit and trees/blobs on the two approved paths.
  // No repository checkout, parent history, or product files enter the fixture.
  const specs = new Set([pin.revision, `${pin.revision}^{tree}`])
  for (const documentPath of [path, baselinePath]) {
    const parts = documentPath.split('/')
    for (let length = 1; length <= parts.length; length++)
      specs.add(`${pin.revision}:${parts.slice(0, length).join('/')}`)
  }
  const copied = new Set()
  for (const spec of specs) {
    const object = execFileSync('git', ['rev-parse', spec], { cwd: root, encoding: 'utf8' }).trim()
    if (copied.has(object)) continue
    copied.add(object)
    const kind = execFileSync('git', ['cat-file', '-t', object], {
      cwd: root,
      encoding: 'utf8',
    }).trim()
    const bytes = execFileSync('git', ['cat-file', kind, object], { cwd: root })
    const stored = execFileSync('git', ['hash-object', '-t', kind, '-w', '--stdin'], {
      cwd: directory,
      input: bytes,
      encoding: 'utf8',
    }).trim()
    assert.equal(stored, object)
  }
  registry.historicalSourcePins = [pin]
  Object.assign(candidate._governance, {
    sourceGitRevision: pin.revision,
    sourceGitObject: pin.gitObject,
    sourceSha256: pin.sha256,
  })
  const document = { path, templateId: 'test-machine-evidence-v1', variant }
  const routing = {
    entry: 'AGENTS.md',
    entrySection: '操作与必读',
    forwardingEntries: [],
    routes: [],
    migratedDocuments: [document],
  }
  write('AGENTS.md', '# Fixture\n\n## 操作与必读\n\nSource proof fixture only.\n')
  json(registryPath, registry)
  write(baselinePath, baselineText)
  json('docs/testing/catalog.json', { entries: [{ id: candidate.id, status: candidate.status }] })
  json('docs/phase-governance/routing.json', routing)
  const publishCandidate = () => {
    json(path, candidate)
    json('docs/phase-governance/document-registry.json', {
      entries: [
        {
          ...document,
          templateVariant: variant,
          templateCompliance: 'template-compliant',
          reviewRecord: 'fixture.json',
        },
      ],
    })
    json('docs/phase-governance/reviews/fixture.json', {
      entries: [
        {
          path,
          contentReviewStatus: 'content-reviewed',
          templateCompliance: 'template-compliant',
          afterSha256: digest(read(path)),
        },
      ],
    })
  }
  publishCandidate()
  const options = { readSource: (approved) => readGitDocumentSource(directory, approved) }
  const check = () => checkMigratedDocument(document, registry, read, options)
  return {
    directory,
    candidate,
    original,
    registry,
    pin,
    document,
    routing,
    json,
    read,
    write,
    commitSource,
    publishCandidate,
    options,
    check,
  }
}

function runProgress(f) {
  cpSync(join(root, 'scripts/docs'), join(f.directory, 'scripts/docs'), { recursive: true })
  const result = spawnSync(
    process.execPath,
    ['scripts/docs/report-governance-progress.mjs', '--json'],
    { cwd: f.directory, encoding: 'utf8' },
  )
  assert(result.stdout, result.stderr)
  return { code: result.status, report: JSON.parse(result.stdout) }
}

test('historical execution accepts an unchanged original through a real pinned Git source', (t) => {
  const f = fixture(t)
  assert.deepEqual(f.check(), [])
  const source = readGitDocumentSource(f.directory, f.pin)
  assert.equal(source.gitObject, f.pin.gitObject)
  assert.equal(digest(source.text), f.pin.sha256)
  assert.equal(JSON.parse(source.text).runtimeExecution.performed, true)
  assert.equal(f.candidate._governance.currentAudit.runtimeExecutionPerformed, false)
  assert(
    checkMigratedDocument(f.document, f.registry, f.read).includes(
      'approved historical Git source unavailable',
    ),
  )
})

test('historical source identity and every preserved machine field resist candidate-only changes', (t) => {
  const f = fixture(t)
  const changes = [
    (v) => {
      v._governance.sourceGitRevision = '0'.repeat(40)
    },
    (v) => {
      v._governance.sourceGitObject = '0'.repeat(40)
    },
    (v) => {
      v._governance.sourceSha256 = '0'.repeat(64)
    },
    (v) => {
      v.runtimeExecution.performed = false
    },
    (v) => {
      v.candidateSha = '0'.repeat(40)
    },
    (v) => {
      v.versions.minimumSave = 12
    },
    (v) => {
      v._governance.currentAudit.runtimeExecutionPerformed = true
    },
    (v) => {
      delete v._governance.currentAudit
    },
    (v) => {
      delete v.artifacts
    },
    (v) => {
      v.status = 'verified'
    },
    (v) => {
      v.id = 'e2e-001'
    },
  ]
  for (const change of changes) {
    const value = structuredClone(f.candidate)
    change(value)
    f.json(path, value)
    assert.notDeepEqual(f.check(), [])
  }
  f.json(path, { payload: f.original, _governance: f.candidate._governance })
  assert(f.check().includes('missing machine field: runtimeExecution'))
})

test('a later false-to-true commit plus matching pin, baseline and review cannot self-authorize completion', (t) => {
  const f = fixture(t)
  const baselineText = f.read(baselinePath)
  const baseline = JSON.parse(baselineText)
  const binding = baseline.entries.find((entry) => entry.path === path)
  binding.sourceSha256 = '0'.repeat(64)
  f.json(baselinePath, baseline)
  assert.deepEqual(f.check(), ['frozen historical baseline working tree drift'])
  f.write(baselinePath, baselineText)
  const oldFalse = structuredClone(f.original)
  oldFalse.runtimeExecution.performed = false
  f.json(path, oldFalse)
  f.commitSource()
  const forged = structuredClone(f.original)
  forged.runtimeExecution.performed = true
  forged.findings.push('forged later historical publication')
  const laterText = `${JSON.stringify(forged, null, 2)}\n`
  f.write(path, laterText)
  const later = f.commitSource()
  Object.assign(f.pin, later, { sha256: digest(laterText) })
  Object.assign(f.candidate, forged)
  Object.assign(f.candidate._governance, {
    sourceGitRevision: f.pin.revision,
    sourceGitObject: f.pin.gitObject,
    sourceSha256: f.pin.sha256,
  })
  binding.sourceSha256 = f.pin.sha256
  f.json(baselinePath, baseline)
  f.json(registryPath, f.registry)
  f.publishCandidate()
  assert.deepEqual(f.check(), [
    'historical source pin is outside the independently frozen snapshot',
  ])
  const result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.cohortMigrated, 0)
  assert(result.report.issues.some((issue) => issue.includes('independently frozen snapshot')))
  f.registry.historicalSourcePins = []
  assert.deepEqual(f.check(), ['historical source requires one approved external path pin'])
})

test('Git reader rejects a missing revision or unsafe path instead of reading an envelope-selected location', (t) => {
  const f = fixture(t)
  const tree = execFileSync('git', ['rev-parse', `${f.pin.revision}^{tree}`], {
    cwd: f.directory,
    encoding: 'utf8',
  }).trim()
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Docs fixture',
      '-c',
      'user.email=docs-fixture@example.invalid',
      'tag',
      '-a',
      'source-tag',
      '-m',
      'tag fixture',
    ],
    { cwd: f.directory },
  )
  const tag = execFileSync('git', ['rev-parse', 'source-tag'], {
    cwd: f.directory,
    encoding: 'utf8',
  }).trim()
  for (const pin of [
    { ...f.pin, revision: '--all' },
    { ...f.pin, revision: '0'.repeat(40) },
    { ...f.pin, path: '../outside.json' },
    { ...f.pin, path: 'docs/../outside.json' },
    { ...f.pin, path: 'docs/missing.json' },
    { ...f.pin, revision: tree },
    { ...f.pin, revision: f.pin.gitObject },
    { ...f.pin, revision: tag },
  ])
    assert.equal(readGitDocumentSource(f.directory, pin), undefined)
})

test('actual progress CLI refuses a compliant review with its route removed or relabeled', (t) => {
  const f = fixture(t)
  let result = runProgress(f)
  assert.equal(result.code, 0)
  assert.equal(result.report.cohortMigrated, 1)
  for (const routes of [
    [],
    [{ ...f.document, variant: 'document-audit-v2' }],
    [f.document, f.document],
  ]) {
    f.json('docs/phase-governance/routing.json', { ...f.routing, migratedDocuments: routes })
    result = runProgress(f)
    assert.equal(result.code, 1)
    assert.equal(result.report.cohortMigrated, 0)
    assert(result.report.issues.some((issue) => issue.includes('one matching migrated route')))
  }
  f.json('docs/phase-governance/routing.json', { ...f.routing, migratedDocuments: [] })
  f.json('docs/phase-governance/document-registry.json', { entries: [] })
  f.json(baselinePath, { entries: [] })
  result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.approvedCohort, 1838)
  assert(result.report.issues.includes('frozen historical baseline working tree drift'))
  const missing = mkdtempSync(join(tmpdir(), 'type-pal-doc-missing-source-'))
  t.after(() => rmSync(missing, { recursive: true, force: true }))
  for (const directory of ['docs', 'scripts'])
    cpSync(join(f.directory, directory), join(missing, directory), { recursive: true })
  writeFileSync(join(missing, 'AGENTS.md'), f.read('AGENTS.md'))
  execFileSync('git', ['init', '-q'], { cwd: missing })
  const unavailable = spawnSync(
    process.execPath,
    ['scripts/docs/report-governance-progress.mjs', '--require-complete'],
    { cwd: missing, encoding: 'utf8' },
  )
  assert.equal(unavailable.status, 1)
  assert.match(unavailable.stdout, /0\/1838 baseline/)
  assert.match(unavailable.stderr, /full governance incomplete/)
})
