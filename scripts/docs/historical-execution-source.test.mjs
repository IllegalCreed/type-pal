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
const executionPath = path
const executionVariant = variant
const nativePath =
  'docs/testing/archive/architecture-regression-lab/architecture-regression-lab-codex-r10-evidence.json'
const nativeVariant = 'historical-review-payload-v1'
const registryPath = 'docs/phase-governance/templates/registry.json'
const baselinePath = 'docs/ops/evidence/DOCS-FULL-TEMPLATE-1/binding-baseline.json'
const digest = (text) => createHash('sha256').update(text).digest('hex')
const readJson = (relative) => JSON.parse(readFileSync(join(root, relative), 'utf8'))

function fixture(t, target) {
  const path = target?.path ?? executionPath
  const variant = target?.variant ?? executionVariant
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
  const candidate = target?.candidate ?? readJson(path)
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
  const publishCandidate = (value = candidate) => {
    json(path, value)
    json('docs/phase-governance/document-registry.json', {
      entries: [
        {
          ...document,
          templateVariant: document.variant,
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

function nativeFixture(t) {
  const registry = readJson(registryPath)
  const pin = registry.historicalSourcePins.find((source) => source.path === nativePath)
  const original = JSON.parse(readGitDocumentSource(root, pin).text)
  const candidate = {
    ...original,
    _governance: {
      ...readJson('docs/testing/_templates/test-machine-evidence.json')._governance,
      variant: nativeVariant,
      lastReviewed: '2026-10-16',
      owner: 'Docs source-proof fixture',
      provenance: ['real frozen historical review source; no historical command replay'],
      scope: 'Historical r10 source contract fixture only',
      lifecycle: 'historical',
      currentAudit: { runtimeExecutionPerformed: false },
      beforeAfter: 'Add governance metadata to an unchanged nine-field native object',
      stopLine: 'Never convert the original counter or MISSED into a successful execution',
      nextStep: 'Exercise real source and progress consumers in the temporary fixture',
    },
  }
  return fixture(t, { path: nativePath, variant: nativeVariant, candidate })
}

function runModel(f) {
  cpSync(join(root, 'scripts/docs'), join(f.directory, 'scripts/docs'), { recursive: true })
  return spawnSync(process.execPath, ['scripts/docs/check-document-model.mjs'], {
    cwd: f.directory,
    encoding: 'utf8',
  })
}

test('native historical review keeps its counter and missed control through real model/progress entry points', (t) => {
  const f = nativeFixture(t)
  assert.deepEqual(f.check(), [])
  const preserved = { ...f.candidate }
  delete preserved._governance
  assert.deepEqual(preserved, f.original)
  assert.equal(preserved.verdict, 'counter')
  assert.equal(preserved.g08DropOutput.verdict, 'MISSED')
  assert.equal(preserved.g08DropOutput.exit, 0)
  assert.equal(preserved.checks.biomeWarnings, 1)
  assert.equal(f.candidate._governance.currentAudit.runtimeExecutionPerformed, false)
  assert.equal(runModel(f).status, 0)
  const result = runProgress(f)
  assert.equal(result.code, 0)
  assert.equal(result.report.cohortMigrated, 1)
  assert.equal(result.report.issues.length, 0)
})

test('native review business verdicts and provenance cannot be changed even with a matching review SHA', (t) => {
  const f = nativeFixture(t)
  const mutations = [
    ['overall counter', (v) => (v.verdict = 'accept')],
    ['missed output', (v) => (v.g08DropOutput.verdict = 'detected')],
    ['successful mutant exit', (v) => (v.g08DropOutput.exit = 1)],
    ['historical warning', (v) => (v.checks.biomeWarnings = 0)],
    ['new top-level schema', (v) => (v.schemaVersion = 2)],
    ['new nested claim', (v) => (v.g01.currentlyVerified = true)],
    [
      'fake current execution',
      (v) => (v._governance.currentAudit.runtimeExecutionPerformed = true),
    ],
    ['promoted lifecycle', (v) => (v._governance.lifecycle = 'verified')],
    ['missing lifecycle', (v) => delete v._governance.lifecycle],
    ['missing audit', (v) => delete v._governance.currentAudit],
    ['wrong template version', (v) => (v._governance.templateVersion = '1.3.0')],
    ['wrong variant', (v) => (v._governance.variant = executionVariant)],
    ['wrong source revision', (v) => (v._governance.sourceGitRevision = '0'.repeat(40))],
    ['wrong source blob', (v) => (v._governance.sourceGitObject = '0'.repeat(40))],
    ['wrong source digest', (v) => (v._governance.sourceSha256 = '0'.repeat(64))],
    ...Object.keys(f.original).map((key) => [`missing ${key}`, (v) => delete v[key]]),
    [
      'payload wrapper',
      (v) => {
        for (const key of Object.keys(f.original)) delete v[key]
        v.payload = f.original
      },
    ],
  ]
  for (const [label, mutate] of mutations) {
    const value = structuredClone(f.candidate)
    mutate(value)
    f.publishCandidate(value)
    assert.notDeepEqual(f.check(), [], label)
    const result = runProgress(f)
    assert.equal(result.code, 1, label)
    assert.equal(result.report.cohortMigrated, 0, label)
    assert(result.report.issues.length > 0, label)
  }
})

test('publication cannot bypass its old contract by jointly retagging the route, pin, envelope and review', (t) => {
  const f = fixture(t)
  const nativePin = readJson(registryPath).historicalSourcePins.find(
    (source) => source.path === nativePath,
  )
  const native = JSON.parse(readGitDocumentSource(root, nativePin).text)
  f.document.variant = nativeVariant
  f.pin.variant = nativeVariant // Mutable approval metadata is not a trust root.
  f.json(registryPath, f.registry)
  f.json('docs/phase-governance/routing.json', f.routing)
  const value = structuredClone(f.candidate)
  Object.assign(value._governance, { variant: nativeVariant, lifecycle: 'historical' })
  f.publishCandidate(value)
  const assertJointIdentity = () => {
    const entry = JSON.parse(f.read('docs/phase-governance/document-registry.json')).entries[0]
    const route = JSON.parse(f.read('docs/phase-governance/routing.json')).migratedDocuments[0]
    const current = JSON.parse(f.read(path))
    const review = JSON.parse(f.read('docs/phase-governance/reviews/fixture.json')).entries[0]
    assert.equal(entry.templateVariant, nativeVariant)
    assert.equal(route.variant, nativeVariant)
    assert.equal(current._governance.variant, nativeVariant)
    const pin = JSON.parse(f.read(registryPath)).historicalSourcePins[0]
    assert.equal(pin.variant, nativeVariant)
    assert.equal(current._governance.sourceGitRevision, pin.revision)
    assert.equal(current._governance.sourceGitObject, pin.gitObject)
    assert.equal(current._governance.sourceSha256, pin.sha256)
    assert.equal(review.afterSha256, digest(f.read(path)))
  }
  const assertNoIdentityRejection = (report) => {
    assert(
      report.issues.every(
        (issue) =>
          !issue.includes('governance variant mismatch') &&
          !issue.includes('one matching migrated route') &&
          !issue.includes('machine template declaration mismatch') &&
          !issue.includes('source declaration differs from approved external pin'),
      ),
    )
  }
  assertJointIdentity()
  let result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.cohortMigrated, 0)
  assertNoIdentityRejection(result.report)
  assert.deepEqual(
    new Set(result.report.issues.map((issue) => issue.split('missing machine field: ')[1])),
    new Set(Object.keys(native)),
  )
  assert.equal(runModel(f).status, 1)

  Object.assign(value, native)
  f.publishCandidate(value)
  assertJointIdentity()
  result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.cohortMigrated, 0)
  assertNoIdentityRejection(result.report)
  assert(result.report.issues.some((issue) => issue.includes('original machine fields changed')))
  assert.equal(runModel(f).status, 1)

  // Calibrate this oracle by removing the actual source guard only in the fixture.
  const contract = f.registry.types.find((type) => type.templateId === f.document.templateId)
    .variants[nativeVariant]
  const guard = contract.preservedSource
  delete contract.preservedSource
  f.json(registryPath, f.registry)
  result = runProgress(f)
  assert.equal(result.code, 0)
  assert.equal(result.report.cohortMigrated, 1)
  assert.equal(runModel(f).status, 0)
  contract.preservedSource = guard

  // Replacing the entire native object and jointly rebinding its declared source
  // still cannot change which original belongs to this frozen baseline path.
  for (const key of Object.keys(value)) if (key !== '_governance') delete value[key]
  Object.assign(value, native)
  Object.assign(f.pin, { gitObject: nativePin.gitObject, sha256: nativePin.sha256 })
  Object.assign(value._governance, {
    sourceGitObject: f.pin.gitObject,
    sourceSha256: f.pin.sha256,
  })
  f.json(registryPath, f.registry)
  f.publishCandidate(value)
  assertJointIdentity()
  result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.cohortMigrated, 0)
  assertNoIdentityRejection(result.report)
  assert(result.report.issues.some((issue) => issue.includes('pin differs from frozen baseline')))
  assert.equal(runModel(f).status, 1)

  const baseline = JSON.parse(f.read(baselinePath))
  baseline.entries.find((entry) => entry.path === path).sourceSha256 = f.pin.sha256
  f.json(baselinePath, baseline)
  f.publishCandidate(value)
  assertJointIdentity()
  result = runProgress(f)
  assert.equal(result.code, 1)
  assert.equal(result.report.cohortMigrated, 0)
  assertNoIdentityRejection(result.report)
  assert(result.report.issues.some((issue) => issue.includes('baseline working tree drift')))
  assert.equal(runModel(f).status, 1)
})

const integrationTargets = [
  {
    path: 'docs/testing/archive/legacy/editor/testing-records/architecture-continuation-integration-evidence.json',
    variant: 'historical-continuation-integration-v1',
    nativeKeys: 15,
    alterHistoricalResult: (value) => (value.negativeControls.detected = 110),
  },
  {
    path: 'docs/testing/archive/legacy/editor/testing-records/architecture-intake-completion-evidence.json',
    variant: 'historical-intake-completion-v1',
    nativeKeys: 10,
    alterHistoricalResult: (value) => (value.unifiedGates.warnings = 0),
  },
  {
    path: 'docs/testing/archive/legacy/editor/editor-workflows/cursor-commands-wave2-integration-evidence.json',
    variant: 'historical-command-integration-v1',
    nativeKeys: 22,
    alterHistoricalResult: (value) => (value.quality.biome.warnings = 0),
  },
]

function integrationFixture(t, target) {
  const pin = readJson(registryPath).historicalSourcePins.find(
    (source) => source.path === target.path,
  )
  const original = JSON.parse(readGitDocumentSource(root, pin).text)
  return fixture(t, {
    ...target,
    candidate: {
      ...original,
      _governance: {
        ...readJson('docs/testing/_templates/test-machine-evidence.json')._governance,
        variant: target.variant,
        lastReviewed: '2026-10-16',
        owner: 'Docs integration source-proof fixture',
        provenance: ['fixed original integration payload; historical commands not replayed'],
        scope: 'Three specific historical integration contracts; not a canonical pilot acceptance',
        lifecycle: 'historical',
        currentAudit: { runtimeExecutionPerformed: false },
        beforeAfter: 'Unchanged native integration object plus historical governance only',
        stopLine: 'Keep original diagnostics, execution scope and source identity',
        nextStep: 'Exercise real model/progress consumers in the owned fixture',
      },
    },
  })
}

test('three historical integration shapes preserve native objects through real model and progress CLIs', (t) => {
  for (const target of integrationTargets) {
    const f = integrationFixture(t, target)
    assert.equal(Object.keys(f.original).length, target.nativeKeys)
    const { _governance, ...native } = f.candidate
    assert.deepEqual(native, f.original)
    assert.equal(_governance.currentAudit.runtimeExecutionPerformed, false)
    assert.deepEqual(f.check(), [])
    assert.equal(runModel(f).status, 0)
    const result = runProgress(f)
    assert.equal(result.code, 0)
    assert.equal(result.report.cohortMigrated, 1)
    assert.deepEqual(result.report.issues, [])
  }
})

test('integration native keys, old results and current audit boundaries cannot be reapproved by refreshing review hashes', (t) => {
  for (const target of integrationTargets) {
    const f = integrationFixture(t, target)
    for (const key of Object.keys(f.original)) {
      const value = structuredClone(f.candidate)
      delete value[key]
      f.publishCandidate(value)
      const issue = `missing machine field: ${key}`
      assert(f.check().includes(issue), `${target.variant}/${key}`)
      const result = runProgress(f)
      assert.equal(result.code, 1)
      assert.equal(result.report.cohortMigrated, 0)
      assert(result.report.issues.some((text) => text.includes(issue)))
    }
    const changed = structuredClone(f.candidate)
    target.alterHistoricalResult(changed)
    f.publishCandidate(changed)
    assert(f.check().some((issue) => issue.includes('original machine fields changed')))
    let result = runProgress(f)
    assert.equal(result.code, 1)
    assert.equal(result.report.cohortMigrated, 0)
    assert(result.report.issues.some((issue) => issue.includes('original machine fields changed')))
    assert.equal(runModel(f).status, 1)

    for (const mutate of [
      (value) => (value._governance.lifecycle = 'current'),
      (value) => (value._governance.currentAudit.runtimeExecutionPerformed = true),
      (value) => (value._governance.sourceSha256 = '0'.repeat(64)),
    ]) {
      const value = structuredClone(f.candidate)
      mutate(value)
      f.publishCandidate(value)
      assert.notDeepEqual(f.check(), [])
      result = runProgress(f)
      assert.equal(result.code, 1)
      assert.equal(result.report.cohortMigrated, 0)
      assert(result.report.issues.length > 0)
    }
  }
})

test('each integration contract rejects a jointly retagged publication, with a calibrated native-source guard', (t) => {
  for (const target of integrationTargets) {
    const f = fixture(t)
    const pin = readJson(registryPath).historicalSourcePins.find(
      (source) => source.path === target.path,
    )
    const native = JSON.parse(readGitDocumentSource(root, pin).text)
    f.document.variant = target.variant
    f.pin.variant = target.variant
    f.json(registryPath, f.registry)
    f.json('docs/phase-governance/routing.json', f.routing)
    const value = structuredClone(f.candidate)
    Object.assign(value._governance, { variant: target.variant, lifecycle: 'historical' })
    f.publishCandidate(value)
    let result = runProgress(f)
    assert.equal(result.code, 1)
    assert.equal(result.report.cohortMigrated, 0)
    assert(result.report.issues.some((issue) => issue.includes('missing machine field:')))

    Object.assign(value, native)
    f.publishCandidate(value)
    const entry = JSON.parse(f.read('docs/phase-governance/document-registry.json')).entries[0]
    const route = JSON.parse(f.read('docs/phase-governance/routing.json')).migratedDocuments[0]
    const review = JSON.parse(f.read('docs/phase-governance/reviews/fixture.json')).entries[0]
    assert.equal(entry.templateVariant, target.variant)
    assert.equal(route.variant, target.variant)
    assert.equal(value._governance.variant, target.variant)
    assert.equal(f.pin.variant, target.variant)
    assert.equal(review.afterSha256, digest(f.read(path)))
    assert.deepEqual(f.check(), ['historical original machine fields changed'])
    result = runProgress(f)
    assert.equal(result.code, 1)
    assert.equal(result.report.cohortMigrated, 0)
    assert(result.report.issues.some((issue) => issue.includes('original machine fields changed')))
    assert.equal(runModel(f).status, 1)

    // Only this owned fixture loses the source guard, proving why the same
    // field-complete forgery is rejected rather than relying on an identity typo.
    const contract = f.registry.types.find((type) => type.templateId === f.document.templateId)
      .variants[target.variant]
    delete contract.preservedSource
    f.json(registryPath, f.registry)
    result = runProgress(f)
    assert.equal(result.code, 0)
    assert.equal(result.report.cohortMigrated, 1)
    assert.equal(runModel(f).status, 0)
  }
})
