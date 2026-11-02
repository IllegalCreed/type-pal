import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { auditDocuments } from './check.mjs'
import { currentDocumentPath } from './document-location.mjs'
import { installHistoricalLocationFixture } from './document-location.test-support.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'
import { inspectDocumentRetirements, readDocumentRetirements } from './document-retirements.mjs'
import { frozenDocumentBaseline } from './frozen-document-source.mjs'
import { readGitDocumentSnapshot } from './git-document-snapshot.mjs'
import { markdownLinks } from './markdown.mjs'
import { buildSmallShardedRecord } from './review-record-storage.test-support.mjs'

const repo = fileURLToPath(new URL('../../', import.meta.url))
const retiredPath = 'docs/phase-governance/reviews/20261004-lore-guijie-batch2.json'
const replacement = 'docs/ops/current.md'
const previousRegistry = 'docs/phase-governance/document-registry.phase-governance.json'
const quotePath = 'docs/phase-governance/reviews/README.md'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

function fixture(t, replacements = [{ path: replacement, reviewRecord: 'current.json' }]) {
  const root = mkdtempSync(join(tmpdir(), 'type-pal-document-retirement-'))
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, value) => {
    mkdirSync(dirname(join(root, path)), { recursive: true })
    writeFileSync(join(root, path), value)
  }
  const json = (path, value) => write(path, `${JSON.stringify(value)}\n`)
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  const commit = () => {
    git('add', '.')
    git(
      '-c',
      'user.name=Retirement fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'snapshot',
    )
    return git('rev-parse', 'HEAD')
  }
  git('init', '-q')
  json(retiredPath, { schemaVersion: 1, entries: replacements.map(({ path }) => ({ path })) })
  const before = commit()
  json(retiredPath, { schemaVersion: 1, id: 'empty-carrier', entries: [] })
  json(previousRegistry, {
    schemaVersion: 1,
    phase: 'phase-governance',
    positions: [0],
    entries: [
      {
        path: retiredPath,
        phase: 'phase-governance',
        docType: 'archive-record',
        templateId: 'archive-record-v1',
        templateCompliance: 'needs-migration',
        reviewStatus: 'partial-review-unknown',
        reviewRecord: 'previous.json',
      },
    ],
  })
  json('docs/phase-governance/reviews/previous.json', {
    entries: [{ path: retiredPath, afterSha256: hash(readFileSync(join(root, retiredPath))) }],
  })
  const source = commit()
  const pin = (path, revision) => {
    const snapshot = readGitDocumentSnapshot(root, { path, revision })
    return {
      revision,
      gitObject: snapshot.gitObject,
      sha256: hash(snapshot.buffer),
      bytes: snapshot.buffer.length,
    }
  }
  rmSync(join(root, retiredPath))
  for (const row of replacements) write(row.path, '# Current document\n')
  write('docs/ops/tasks/RETIRE.md', '# Task\n\n### Approved empty carrier\n\nOwner decision.\n')
  for (const name of new Set(replacements.map((row) => row.reviewRecord)))
    json(`docs/phase-governance/reviews/${name}`, {
      entries: replacements
        .filter((row) => row.reviewRecord === name)
        .map(({ path }) => ({ path, contentReviewStatus: 'partial-review-unknown' })),
    })
  json('docs/phase-governance/routing.json', {
    entry: 'AGENTS.md',
    entrySection: 'Routes',
    routes: [],
    forwardingEntries: [],
    migratedDocuments: [],
  })
  const quote = `<!-- original-source-quote:start -->\n> [old ledger](20261004-lore-guijie-batch2.json)\n<!-- original-source-quote:end -->\n`
  write(quotePath, `# Current index\n\n${quote}`)
  const registry = {
    entries: replacements.map((row) => ({ ...row })),
    documentRetirements: {
      schemaVersion: 1,
      kind: 'empty-review-ledger-retirement',
      owner: 'Codex',
      retiredOn: '2026-10-21',
      authorization: { task: 'docs/ops/tasks/RETIRE.md', section: 'Approved empty carrier' },
      previousRegistry: { path: previousRegistry, ...pin(previousRegistry, source) },
      entries: [
        {
          path: retiredPath,
          reason: 'Empty carrier; original document now has one separate binding.',
          source: pin(retiredPath, source),
          predecessor: pin(retiredPath, before),
          replacements: replacements.map((row) => ({ ...row })),
        },
      ],
      historicalQuotes: [{ path: quotePath, sha256: hash(quote) }],
    },
  }
  const readBuffer = (path) => {
    try {
      return readFileSync(join(root, path))
    } catch {
      return undefined
    }
  }
  const options = {
    cohort: new Set([retiredPath]),
    readBuffer,
    readSourceBuffer: (p) => readGitDocumentSnapshot(root, p),
  }
  const inspect = () => inspectDocumentRetirements(registry, options)
  return { root, registry, options, inspect, write, json, quote, commit }
}

const secondReplacement = 'docs/ops/second.md'
function installBaselineSource(f) {
  const common = execFileSync('git', ['rev-parse', '--git-common-dir'], {
    cwd: repo,
    encoding: 'utf8',
  }).trim()
  f.write('.git/objects/info/alternates', `${resolve(repo, common, 'objects')}\n`)
  f.write(
    frozenDocumentBaseline.path,
    readFileSync(join(repo, currentDocumentPath(frozenDocumentBaseline.path))),
  )
}

function protectedFixture(t, secondOwner = 'current.json') {
  const f = fixture(t, [
    { path: replacement, reviewRecord: 'current.json' },
    { path: secondReplacement, reviewRecord: secondOwner },
  ])
  installBaselineSource(f)
  const sharded = buildSmallShardedRecord(1, 'unrelated-current')
  f.json(sharded.logicalPath, sharded.logical)
  const revision = f.commit()
  const source = readGitDocumentSnapshot(f.root, { path: sharded.logicalPath, revision })
  for (const [path, bytes] of sharded.files) {
    if (path !== sharded.logicalPath) f.write(path, bytes)
    else {
      const manifest = JSON.parse(bytes)
      manifest._reviewStorage.source = {
        revision,
        path,
        gitObject: source.gitObject,
        sha256: hash(source.buffer),
      }
      f.json(path, manifest)
    }
  }
  return {
    ...f,
    shard: sharded.files.find(([path]) => path.includes('/shards/'))[0],
    read: (beforeSecondRead = () => {}) =>
      readDocumentRetirements(f.root, f.registry, {
        currentPath: (path) => path,
        readBuffer: (path) => {
          if (path === secondReplacement) beforeSecondRead()
          return f.options.readBuffer(path)
        },
      }),
  }
}

test('verified empty carrier retires without upgrading its replacement review', (t) => {
  const f = fixture(t)
  const before = JSON.stringify(f.registry)
  const result = f.inspect()
  assert.deepEqual(result.issues, [])
  assert.equal(result.entries.length, 1)
  assert.equal(JSON.stringify(f.registry), before)
  assert.equal(
    JSON.parse(f.options.readBuffer('docs/phase-governance/reviews/current.json')).entries[0]
      .contentReviewStatus,
    'partial-review-unknown',
  )
})

for (const [name, mutate, message] of [
  [
    'the reused owner bytes',
    (f) => {
      const path = 'docs/phase-governance/reviews/current.json'
      f.write(path, `${f.options.readBuffer(path)} `)
    },
    /input bytes or identity changed/,
  ],
  [
    'an unrelated already-loaded shard',
    (f) => f.write(f.shard, `${f.options.readBuffer(f.shard)} `),
    /input bytes or identity changed/,
  ],
  [
    'a publication lock',
    (f) => f.write('docs/phase-governance/reviews/.storage.lock', 'active'),
    /publication lock/,
  ],
  [
    'the loaded directory inventory',
    (f) => f.write(`${dirname(f.shard)}/unexpected.json`, '{}'),
    /directory inventory changed/,
  ],
]) {
  test(`retirement parsed-group reuse still rejects ${name} between replacement lookups`, (t) => {
    const f = protectedFixture(t)
    assert.deepEqual(f.read().issues, [])
    let mutations = 0
    assert.throws(
      () =>
        f.read(() => {
          mutations++
          mutate(f)
        }),
      message,
    )
    assert.equal(mutations, 1)
  })
}

test('retirement lookup expands its protected group for a previously unloaded flat owner', (t) => {
  const f = protectedFixture(t, 'second-owner.json')
  const result = f.read()
  assert.deepEqual(result.issues, [])
  assert.equal(result.entries.length, 1)
  rmSync(join(f.root, 'docs/phase-governance/reviews/second-owner.json'))
  const missing = f.read()
  assert.equal(missing.entries.length, 0)
  assert.ok(missing.issues.some((issue) => issue.includes('second-owner.json')))
})

test('retirement parsed groups are private to one call and the next call observes current records', (t) => {
  const f = protectedFixture(t)
  assert.deepEqual(f.read().issues, [])
  f.json('docs/phase-governance/reviews/current.json', {
    entries: [{ path: replacement, contentReviewStatus: 'partial-review-unknown' }],
  })
  const result = f.read()
  assert.equal(result.entries.length, 0)
  assert.ok(result.issues.some((issue) => issue.includes('replacement review not unique')))
})

for (const [name, mutate, message] of [
  [
    'forged source bytes',
    (f) => {
      f.registry.documentRetirements.entries[0].source.sha256 = '0'.repeat(64)
    },
    'Git source mismatch',
  ],
  [
    'nonempty source ledger',
    (f) => {
      f.registry.documentRetirements.entries[0].source =
        f.registry.documentRetirements.entries[0].predecessor
    },
    'not an empty header-only review',
  ],
  [
    'unapproved declaration',
    (f) => {
      f.registry.documentRetirements.authorization.section = 'No such decision'
    },
    'authorization section missing',
  ],
  [
    'incomplete replacement scope',
    (f) => {
      f.registry.documentRetirements.entries[0].replacements = [
        { path: 'docs/ops/other.md', reviewRecord: 'current.json' },
      ]
    },
    'scope mismatch',
  ],
  [
    'missing replacement document',
    (f) => {
      rmSync(join(f.root, replacement))
    },
    'replacement missing or rebound',
  ],
  [
    'duplicate retirements',
    (f) => {
      f.registry.documentRetirements.entries.push(
        structuredClone(f.registry.documentRetirements.entries[0]),
      )
    },
    'duplicate document retirement',
  ],
  [
    'still-active registration',
    (f) => {
      f.registry.entries.push({ path: retiredPath, reviewRecord: 'current.json' })
    },
    'still registered active',
  ],
  [
    'changed preserved quote',
    (f) => {
      f.write(quotePath, `# Index\n${f.quote.replace('old ledger', 'new claim')}`)
    },
    'historical quote changed',
  ],
  [
    'reappeared target',
    (f) => {
      f.json(retiredPath, { entries: [] })
    },
    'reappeared',
  ],
  [
    'unapproved cohort member',
    (f) => {
      f.options.cohort.clear()
    },
    'outside fixed cohort',
  ],
  [
    'still-migrated route',
    (f) => {
      f.json('docs/phase-governance/routing.json', { migratedDocuments: [{ path: retiredPath }] })
    },
    'still has migrated route',
  ],
]) {
  test(`retirement refuses ${name}`, (t) => {
    const f = fixture(t)
    mutate(f)
    const result = f.inspect()
    assert.equal(result.entries.length, 0)
    assert.ok(
      result.issues.some((issue) => issue.includes(message)),
      result.issues.join('\n'),
    )
  })
}

test('archived link resolution preserves quote bytes while current and unrelated broken links fail', (t) => {
  const f = fixture(t)
  const result = f.inspect()
  const text = `# Current index\n\n[current broken link](20261004-lore-guijie-batch2.json)\n[unrelated](missing.json)\n\n${f.quote}`
  const links = markdownLinks(text, { positions: true })
  assert.equal(result.historicalTarget(quotePath, text, links[0], retiredPath), false)
  assert.equal(
    result.historicalTarget(
      quotePath,
      text,
      links[1],
      'docs/phase-governance/reviews/missing.json',
    ),
    false,
  )
  assert.equal(result.historicalTarget(quotePath, text, links[2], retiredPath), true)
  const audit = auditDocuments({
    documents: new Map([[quotePath, text]]),
    exists: () => false,
    expectedVersions: {},
    sectionRules: [],
    exceptions: [],
    historicalTarget: result.historicalTarget,
  })
  const missing = audit.issues.filter((issue) => issue.message.includes('本地目标不存在'))
  assert.equal(missing.length, 2)
  assert.deepEqual(
    missing.map((issue) => issue.line),
    [3, 4],
  )
})

test('progress consumer keeps denominator 1838, reports retirement separately and refuses full completion', (t) => {
  const f = fixture(t)
  cpSync(join(repo, 'scripts/docs'), join(f.root, 'scripts/docs'), { recursive: true })
  installHistoricalLocationFixture(f.root)
  installBaselineSource(f)
  f.write('AGENTS.md', '# Fixture\n\n## Routes\n\nNo operations.\n')
  f.write(
    'docs/phase-governance/templates/registry.json',
    readFileSync(join(repo, 'docs/phase-governance/templates/registry.json')),
  )
  const entry = {
    path: replacement,
    phase: 'ops',
    docType: 'guide-runbook',
    templateId: 'guide-runbook-v1',
    templateCompliance: 'needs-migration',
    reviewStatus: 'partial-review-unknown',
    reviewRecord: 'current.json',
  }
  const manifest = saveDocumentRegistryFixture(f.root, [entry])
  const value = JSON.parse(readFileSync(manifest, 'utf8'))
  value.documentRetirements = f.registry.documentRetirements
  writeFileSync(manifest, JSON.stringify(value))
  assert.deepEqual(readDocumentRetirements(f.root, { ...value, entries: [entry] }).issues, [])
  const run = spawnSync(
    process.execPath,
    ['scripts/docs/report-governance-progress.mjs', '--json', '--require-complete'],
    { cwd: f.root, encoding: 'utf8', timeout: 30000 },
  )
  assert.equal(run.error, undefined)
  assert.equal(run.status, 1)
  const report = JSON.parse(run.stdout)
  assert.deepEqual(report.issues, [])
  assert.equal(report.approvedCohort, 1838)
  assert.equal(report.cohortMigrated, 0)
  assert.equal(report.cohortRetired, 1)
  assert.equal(report.cohortPending, 1837)
  assert.match(run.stderr, /full governance incomplete/)
  symlinkSync('missing-ledger.json', join(f.root, retiredPath))
  assert.ok(
    readDocumentRetirements(f.root, { ...value, entries: [entry] }).issues.some((issue) =>
      issue.includes('reappeared'),
    ),
  )
  rmSync(join(f.root, retiredPath))
  delete value.documentRetirements
  writeFileSync(manifest, JSON.stringify(value))
  const unregistered = spawnSync(
    process.execPath,
    ['scripts/docs/report-governance-progress.mjs', '--json', '--require-complete'],
    { cwd: f.root, encoding: 'utf8', timeout: 30000 },
  )
  assert.equal(unregistered.status, 1)
  const missing = JSON.parse(unregistered.stdout)
  assert.equal(missing.cohortRetired, 0)
  assert.equal(missing.cohortPending, 1838)
})
