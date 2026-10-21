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
import { historicalDocumentReceipts } from './historical-document-receipt.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const paths = Object.keys(historicalDocumentReceipts)
const relocation = paths.find((path) => path.endsWith('/relocation.json'))
const templatePath = 'docs/phase-governance/templates/registry.json'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const json = (path) => JSON.parse(readFileSync(join(root, path)))

function memory(path = paths[0]) {
  const registry = json(templatePath)
  const candidate = json(path)
  const documents = new Map()
  const readBuffer = (name) => documents.get(name) ?? readFileSync(join(root, name))
  const read = (name) => readBuffer(name).toString('utf8')
  const options = {
    readBuffer,
    readSource: (pin) => readGitDocumentSource(root, pin),
    readSourceBuffer: (pin) => readGitDocumentSnapshot(root, pin),
  }
  const doc = { path, templateId: 'evidence-receipt-v1', variant: historicalDocumentReceipts[path] }
  const check = () => {
    if (!documents.has(path)) documents.set(path, Buffer.from(JSON.stringify(candidate)))
    return checkMigratedDocument(doc, registry, read, options)
  }
  return { registry, candidate, documents, readBuffer, read, options, doc, check }
}

test('three native pilot shapes preserve the exact frozen objects through the real model', () => {
  for (const path of paths) {
    const f = memory(path)
    assert.deepEqual(f.check(), [])
    const original = JSON.parse(
      readGitDocumentSource(root, {
        path,
        revision: frozenDocumentBaseline.revision,
      }).text,
    )
    const native = { ...f.candidate }
    delete native._governance
    assert.deepEqual(native, original)
  }
})

test('JSON variant version is independent, while an unchanged default Markdown receipt still passes', () => {
  const f = memory()
  const template = f.registry.types.find((row) => row.templateId === f.doc.templateId)
  template.templateVersion = '9.0.0'
  assert.deepEqual(f.check(), [])
  f.candidate._governance.templateVersion = '9.0.0'
  f.documents.clear()
  assert(f.check().some((issue) => issue.includes('declaration') || issue.includes('identity')))
  const clean = memory()
  const route = json('docs/phase-governance/routing.json').migratedDocuments.find(
    (row) => row.templateId === 'evidence-receipt-v1' && !row.variant && row.path.endsWith('.md'),
  )
  assert(route)
  assert.deepEqual(checkMigratedDocument(route, clean.registry, clean.read, clean.options), [])
})

test('native edits, payload wrapping and a later matching candidate source cannot reapprove history', () => {
  for (const path of paths) {
    const f = memory(path)
    if (f.candidate.entries) f.candidate.entries[0].sha256 = '0'.repeat(64)
    else f.candidate.failures.push('old failure must not disappear')
    assert(f.check().includes('historical original machine fields changed'))
  }
  const wrapped = memory()
  const metadata = wrapped.candidate._governance
  wrapped.documents.set(
    wrapped.doc.path,
    Buffer.from(JSON.stringify({ payload: wrapped.candidate, _governance: metadata })),
  )
  assert(wrapped.check().includes('historical original machine fields changed'))
  const repinned = memory()
  const revision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: root,
    encoding: 'utf8',
  }).trim()
  repinned.candidate._governance.sourceGitRevision = revision
  repinned.registry.historicalSourcePins.push({
    path: repinned.doc.path,
    revision,
    gitObject: repinned.candidate._governance.sourceGitObject,
    sha256: repinned.candidate._governance.sourceSha256,
  })
  assert(
    repinned.check().includes('historical source declaration differs from approved external pin'),
  )
})

test('the two unverified claims and both no-execution declarations cannot be certified or removed', () => {
  for (const mutate of [
    (audit) => {
      audit.unverifiedClaims = []
    },
    (audit) => {
      audit.unverifiedClaims[0].status = 'verified'
    },
    (audit) => {
      audit.runtimeExecutionPerformed = true
    },
    (audit) => {
      audit.historicClaimsReexecuted = true
    },
  ]) {
    const f = memory(relocation)
    mutate(f.candidate._governance.currentAudit)
    assert(f.check().some((issue) => /unverified|execution|machine field/.test(issue)))
  }
})

test('five empty or mis-typed audit sections do not satisfy a machine evidence body', () => {
  for (const [key, value] of [
    ['identity', ''],
    ['sourceAndInputs', null],
    ['oracle', []],
    ['result', 0],
    ['limits', {}],
  ]) {
    const f = memory()
    f.candidate._governance.currentAudit[key] = value
    assert(f.check().includes('historical receipt five evidence sections need concrete content'))
  }
})

test('duplicate decoded JSON keys and invalid UTF8 fail before a parse-only false green', () => {
  const duplicate = memory()
  const text = JSON.stringify(duplicate.candidate)
  duplicate.documents.set(
    duplicate.doc.path,
    Buffer.from(text.replace('{', '{"purpose":"hidden different value",')),
  )
  assert(duplicate.check().some((issue) => issue.includes('duplicate decoded key')))
  const invalid = memory()
  const bytes = Buffer.from(JSON.stringify(invalid.candidate))
  bytes[bytes.indexOf('Relocate')] = 0xff
  invalid.documents.set(invalid.doc.path, bytes)
  assert(invalid.check().some((issue) => issue.includes('invalid UTF8')))
})

function cliFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-native-receipt-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  execFileSync('git', ['clone', '--quiet', '--shared', '--no-checkout', root, directory])
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  const write = (path, value) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), value)
  }
  const save = (path, value) => write(path, `${JSON.stringify(value)}\n`)
  const registry = json(templatePath)
  write(templatePath, JSON.stringify(registry))
  write(frozenDocumentBaseline.path, readFileSync(join(root, frozenDocumentBaseline.path)))
  write('AGENTS.md', '## Routes\n')
  const routes = paths.map((path) => ({
    path,
    templateId: 'evidence-receipt-v1',
    variant: historicalDocumentReceipts[path],
  }))
  const routing = {
    entry: 'AGENTS.md',
    entrySection: 'Routes',
    routes: [],
    forwardingEntries: [],
    migratedDocuments: routes,
  }
  const entries = routes.map((doc) => ({
    path: doc.path,
    phase: 'ops',
    docType: 'evidence-receipt',
    templateId: doc.templateId,
    templateVariant: doc.variant,
    templateVersion: '1.0.0',
    reviewRecord: 'pilot.json',
    reviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
  }))
  const reviews = entries.map((entry) => ({
    path: entry.path,
    contentReviewStatus: 'content-reviewed',
    templateCompliance: 'template-compliant',
    afterSha256: hash(readFileSync(join(root, entry.path))),
  }))
  for (const path of paths) write(path, readFileSync(join(root, path)))
  const publish = () => {
    save('docs/phase-governance/routing.json', routing)
    save('docs/phase-governance/reviews/pilot.json', { entries: reviews })
    saveDocumentRegistryFixture(directory, entries)
  }
  publish()
  const run = (script, args = []) =>
    spawnSync(process.execPath, [`scripts/docs/${script}`, ...args], {
      cwd: directory,
      encoding: 'utf8',
    })
  return { directory, entries, reviews, routes, publish, write, run }
}

test('real model/progress CLIs accept three explicit source-preserving pilots and reject a joint retag', (t) => {
  const f = cliFixture(t)
  const model = f.run('check-document-model.mjs')
  assert.equal(model.status, 0, model.stderr)
  const good = f.run('report-governance-progress.mjs', ['--json'])
  assert.equal(good.status, 0, good.stderr)
  assert.equal(JSON.parse(good.stdout).cohortMigrated, 3)
  const entry = f.entries[0]
  entry.docType = 'governance-index'
  entry.templateId = 'governance-index-v1'
  delete entry.templateVariant
  f.routes[0].templateId = entry.templateId
  delete f.routes[0].variant
  const body = [
    '# Forged index\n\nStatus: current\nOwner: Test\nLast reviewed: 2026-10-21\nTemplate: governance-index-v1 / 1.0.0\n',
    ...['目的', '范围', '当前状态', '入口与责任', '证据与下一步'].map(
      (heading) => `## ${heading}\n\nConcrete misleading content.\n`,
    ),
  ].join('\n')
  f.write(entry.path, body)
  f.reviews[0].afterSha256 = hash(body)
  f.publish()
  const badModel = f.run('check-document-model.mjs')
  assert.equal(badModel.status, 1)
  assert.match(badModel.stderr, /fixed native path\/variant\/version/)
  const bad = f.run('report-governance-progress.mjs', ['--json'])
  assert.equal(bad.status, 1)
  assert(!JSON.parse(bad.stdout).completed.some((row) => row.path === entry.path))
  const guardPath = 'scripts/docs/historical-document-receipt.mjs'
  const guard = readFileSync(join(f.directory, guardPath), 'utf8')
  const needle = '  const variant = historicalDocumentReceipts[doc.path]'
  assert(guard.includes(needle))
  f.write(
    guardPath,
    guard.replace(
      needle,
      `  if (doc.path === ${JSON.stringify(entry.path)}) return undefined\n${needle}`,
    ),
  )
  const unguarded = f.run('report-governance-progress.mjs', ['--json'])
  assert.equal(unguarded.status, 0, unguarded.stderr)
  assert(JSON.parse(unguarded.stdout).completed.some((row) => row.path === entry.path))
  f.write(guardPath, guard)
  assert.equal(f.run('check-document-model.mjs').status, 1)
})
