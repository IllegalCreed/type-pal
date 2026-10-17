import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'

const repoRoot = fileURLToPath(new URL('../../', import.meta.url))

test('progress CLI consumes a large docs census without changing deleted, suffix, dedupe or ignore policy', (t) => {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-docs-progress-inventory-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const root = join(directory, 'checkout')
  const spool = join(directory, 'spool')
  mkdirSync(root)
  mkdirSync(spool)
  const write = (file, bytes) => {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), bytes)
  }
  const git = (args, options = {}) =>
    execFileSync('git', args, { cwd: root, timeout: 10_000, ...options })
  git(['init', '--quiet'])
  // The real fixed historical Git source remains available to the public
  // baseline reader; this fixture claims no completed document migrations.
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: repoRoot,
    encoding: 'utf8',
    timeout: 10_000,
  }).trim()
  write('.git/objects/info/alternates', `${resolve(repoRoot, common, 'objects')}\n`)
  mkdirSync(join(root, 'scripts/docs'), { recursive: true })
  for (const name of readdirSync(join(repoRoot, 'scripts/docs')))
    if (name.endsWith('.mjs') && !name.includes('.test'))
      cpSync(join(repoRoot, 'scripts/docs', name), join(root, 'scripts/docs', name), {
        recursive: true,
      })
  write(frozenDocumentBaseline.path, readFileSync(join(repoRoot, frozenDocumentBaseline.path)))
  write('AGENTS.md', '# Fixture\n\n## Routes\n\nNo live operations.\n')
  write(
    'docs/phase-governance/routing.json',
    JSON.stringify({
      entry: 'AGENTS.md',
      entrySection: 'Routes',
      routes: [],
      forwardingEntries: [],
      migratedDocuments: [],
    }),
  )
  write(
    'docs/phase-governance/templates/registry.json',
    readFileSync(join(repoRoot, 'docs/phase-governance/templates/registry.json')),
  )
  saveDocumentRegistryFixture(root, [])
  const special = 'docs/zz-tail-空 格😀\t换\n行"\\.md'
  const tracked = ['docs/deleted.md', 'docs/conflicted.md', 'docs/tracked-ignored.html', special]
  for (const file of tracked) write(file, '# Tracked\n')
  git(['add', '--', ...tracked])
  unlinkSync(join(root, 'docs/deleted.md'))
  const object = git(['hash-object', '-w', '--stdin'], { input: 'conflict\n' })
    .toString('utf8')
    .trim()
  git(['update-index', '--index-info'], {
    input: `0 ${'0'.repeat(40)}\tdocs/conflicted.md\n${[1, 2, 3]
      .map((stage) => `100644 ${object} ${stage}\tdocs/conflicted.md\n`)
      .join('')}`,
  })
  write('.gitignore', 'docs/ignored.md\ndocs/tracked-ignored.html\n')
  write('docs/ignored.md', '# Ignored\n')
  write('outside.md', '# Outside pathspec\n')
  write('docs/upper.MD', '# Original suffix policy is case sensitive\n')
  write('docs/new.json', '{}\n')
  const bulk = Array.from(
    { length: 4700 },
    (_, i) => `docs/bulk/${String(i).padStart(4, '0')}-${'x'.repeat(220)}.bin`,
  )
  for (const file of bulk) write(file, '')
  const minimumGitStdoutBytes = Buffer.byteLength(`${bulk.join('\0')}\0`)
  assert.ok(minimumGitStdoutBytes > 1024 * 1024)
  const result = spawnSync(
    process.execPath,
    ['scripts/docs/report-governance-progress.mjs', '--json', '--require-complete'],
    { cwd: root, env: { ...process.env, TMPDIR: spool }, encoding: 'utf8', timeout: 30_000 },
  )
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 1)
  assert.equal(
    result.stderr,
    'full governance incomplete: unread/unmigrated candidates or unexercised templates remain\n',
  )
  const report = JSON.parse(result.stdout)
  const candidates = [
    frozenDocumentBaseline.path,
    'docs/phase-governance/routing.json',
    'docs/phase-governance/templates/registry.json',
    'docs/phase-governance/document-registry.json',
    'docs/phase-governance/document-registry.ops.json',
    ...tracked,
    'docs/new.json',
  ]
  assert.deepEqual(report.issues, [])
  assert.equal(report.currentCandidates, candidates.length)
  assert.equal(report.currentPending, candidates.length)
  assert.equal(report.approvedCohort, 1838)
  assert.equal(report.cohortMigrated, 0)
  assert.equal(report.cohortPending, 1838)
  assert.equal(report.incrementalMigrated, 0)
  assert.deepEqual(report.completed, [])
  assert.deepEqual(readdirSync(spool), [])
  t.diagnostic(
    JSON.stringify({ minimumGitStdoutBytes, candidates, spoolEntries: readdirSync(spool) }),
  )
})
