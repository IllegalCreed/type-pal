import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { checkMigratedDocument } from './document-model.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { readGitDocumentSource } from './git-document-source.mjs'
import { historicalVitestContract, historicalVitestPilots } from './historical-vitest-native.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const paths = Object.keys(historicalVitestPilots)
const templatePath = 'docs/phase-governance/templates/registry.json'
const json = (path) => JSON.parse(readFileSync(join(root, path)))
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

function memory(path = paths[0]) {
  const documents = new Map()
  const registry = json(templatePath)
  const review = json(historicalVitestContract.reviewRecord)
  const row = review.entries.find((entry) => entry.path === path)
  const readBuffer = (name) => {
    if (name === historicalVitestContract.reviewRecord) return Buffer.from(JSON.stringify(review))
    return documents.get(name) ?? readFileSync(join(root, name))
  }
  const read = (name) => readBuffer(name).toString('utf8')
  const options = {
    readBuffer,
    readSource: (pin) => readGitDocumentSource(root, pin),
    readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
  }
  const doc = {
    path,
    templateId: 'test-machine-evidence-v1',
    variant: historicalVitestContract.variant,
  }
  return {
    documents,
    registry,
    review,
    row,
    read,
    options,
    doc,
    check: () => checkMigratedDocument(doc, registry, read, options),
  }
}

test('native green and red historical outputs use real source and current review without rewriting bytes', () => {
  for (const path of paths) {
    const f = memory(path)
    assert.deepEqual(f.check(), [])
    const value = JSON.parse(readFileSync(join(root, path)))
    assert.equal(Object.hasOwn(value, '_governance'), false)
    assert.equal(
      value.numFailedTests,
      historicalVitestPilots[path] === 'counterexample-red' ? 1 : 0,
    )
  }
})

test('reformatting or native edits cannot be laundered by refreshing current review hashes', () => {
  for (const mutate of [
    (bytes) => Buffer.concat([bytes, Buffer.from('\n')]),
    (bytes) => Buffer.from(bytes.toString().replace('"success": true', '"success": false')),
    (bytes) => Buffer.from(JSON.stringify({ payload: JSON.parse(bytes) })),
  ]) {
    const f = memory()
    const bytes = mutate(readFileSync(join(root, f.doc.path)))
    f.documents.set(f.doc.path, bytes)
    f.row.afterSha256 = hash(bytes)
    f.row.revision.currentSha = hash(bytes)
    assert(f.check().includes('native Vitest original bytes changed'))
  }
})

test('strict byte parser rejects duplicate keys and invalid UTF8 in immutable outputs', () => {
  const duplicate = memory()
  const text = readFileSync(join(root, duplicate.doc.path), 'utf8')
  duplicate.documents.set(duplicate.doc.path, Buffer.from(text.replace('{', '{"success":false,')))
  assert(duplicate.check().some((issue) => issue.includes('duplicate decoded key')))
  const invalid = memory()
  const bytes = readFileSync(join(root, invalid.doc.path))
  bytes[bytes.indexOf('success')] = 0xff
  invalid.documents.set(invalid.doc.path, bytes)
  assert(invalid.check().some((issue) => issue.includes('invalid UTF8')))
})

test('current source, phase and five evidence roles must all be present without execution grants', () => {
  for (const mutate of [
    (f) => {
      f.row.sourceGitRevision = '0'.repeat(40)
    },
    (f) => {
      f.row.versionScope.runPhase = 'different-run'
    },
    (f) => {
      f.row.legalInputs = []
    },
    (f) => {
      f.row.primarySource = [null]
    },
    (f) => {
      f.row.businessOracle.assertions = []
    },
    (f) => {
      f.row.unresolved = []
    },
    (f) => {
      f.row.coreConclusion = ''
    },
    (f) => {
      f.row.evidence.currentAudit.runtimeExecutionPerformed = true
    },
    (f) => {
      f.row.evidence.currentAudit.historicClaimsReexecuted = true
    },
    (f) => {
      f.review.entries = f.review.entries.filter((row) => row.path !== f.doc.path)
    },
  ]) {
    const f = memory()
    mutate(f)
    assert(f.check().length > 0)
  }
  const repin = memory()
  const reader = repin.options.readSourceBuffer
  repin.options.readSourceBuffer = (pin) =>
    pin.path === repin.doc.path ? { ...reader(pin), buffer: Buffer.from('{}') } : reader(pin)
  assert(
    repin.check().includes('native Vitest source differs from the independently frozen cohort'),
  )
})

test('variant contract is independently versioned and cannot admit another native path', () => {
  const f = memory()
  const parent = f.registry.types.find((template) => template.templateId === f.doc.templateId)
  parent.templateVersion = '9.0.0'
  assert.deepEqual(f.check(), [])
  f.doc.path = 'docs/testing/unapproved-reporter.json'
  f.documents.set(f.doc.path, readFileSync(join(root, paths[0])))
  assert(f.check().some((issue) => issue.includes('fixed path/variant/version')))
})

test('real model/progress consume the companion review and reject coordinated template replacement', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-native-vitest-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, directory])
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  const write = (path, value) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), value)
  }
  const save = (path, value) => write(path, JSON.stringify(value))
  write(templatePath, readFileSync(join(root, templatePath)))
  write(frozenDocumentBaseline.path, readFileSync(join(root, frozenDocumentBaseline.path)))
  write('AGENTS.md', '## Routes\n')
  const routes = paths.map((path) => ({
    path,
    templateId: 'test-machine-evidence-v1',
    variant: historicalVitestContract.variant,
  }))
  const routing = {
    entry: 'AGENTS.md',
    entrySection: 'Routes',
    routes: [],
    forwardingEntries: [],
    migratedDocuments: routes,
  }
  const review = json(historicalVitestContract.reviewRecord)
  review.entries = review.entries.filter((row) => paths.includes(row.path))
  const entries = routes.map((doc) => ({
    path: doc.path,
    phase: 'ops',
    docType: 'test-machine-evidence',
    templateId: doc.templateId,
    templateVersion: '1.0.0',
    templateVariant: doc.variant,
    historyOverlay: false,
    templateCompliance: 'template-compliant',
    reviewStatus: 'content-reviewed',
    reviewRecord: historicalVitestContract.reviewRecord.split('/').at(-1),
  }))
  for (const row of review.entries) {
    row.contentReviewStatus = 'content-reviewed'
    row.templateCompliance = 'template-compliant'
    write(row.path, readFileSync(join(root, row.path)))
  }
  const publish = () => {
    save('docs/phase-governance/routing.json', routing)
    save(historicalVitestContract.reviewRecord, review)
    saveDocumentRegistryFixture(directory, entries)
  }
  const run = (script, args = []) =>
    spawnSync(process.execPath, [`scripts/docs/${script}`, ...args], {
      cwd: directory,
      encoding: 'utf8',
    })
  publish()
  assert.equal(run('check-document-model.mjs').status, 0)
  const good = run('report-governance-progress.mjs', ['--json'])
  assert.equal(good.status, 0, good.stderr)
  assert.equal(JSON.parse(good.stdout).cohortMigrated, 3)
  const entry = entries[0],
    route = routes[0],
    row = review.entries.find((r) => r.path === entry.path)
  entry.docType = 'governance-index'
  entry.templateId = 'governance-index-v1'
  delete entry.templateVariant
  route.templateId = entry.templateId
  delete route.variant
  const body =
    '# Forged index\n\nLast reviewed: 2026-10-21\nTemplate: governance-index-v1 / 1.0.0\n' +
    ['目的', '范围', '当前状态', '入口与责任', '证据与下一步']
      .map((h) => `\n## ${h}\n\nMisleading but structurally complete content.\n`)
      .join('')
  write(entry.path, body)
  row.afterSha256 = hash(body)
  publish()
  assert.match(run('check-document-model.mjs').stderr, /fixed path\/variant\/version/)
  const bad = run('report-governance-progress.mjs', ['--json'])
  assert.equal(bad.status, 1)
  assert(!JSON.parse(bad.stdout).completed.some((r) => r.path === entry.path))
  const guardPath = 'scripts/docs/historical-vitest-native.mjs'
  const guard = readFileSync(join(directory, guardPath), 'utf8')
  const needle = '  const phase = historicalVitestPilots[doc.path]'
  assert(guard.includes(needle))
  write(
    guardPath,
    guard.replace(
      needle,
      `  if (doc.path === ${JSON.stringify(entry.path)}) return undefined\n${needle}`,
    ),
  )
  const unguarded = run('report-governance-progress.mjs', ['--json'])
  assert.equal(unguarded.status, 0, unguarded.stderr)
  assert(JSON.parse(unguarded.stdout).completed.some((r) => r.path === entry.path))
  write(guardPath, guard)
  assert.equal(run('check-document-model.mjs').status, 1)
})
