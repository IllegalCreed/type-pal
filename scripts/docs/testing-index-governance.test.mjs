import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { validateIndexes } from './check-testing.mjs'
import { checkMigratedDocument } from './document-model.mjs'
import { loadCatalog, renderIndexes, writeIndexes } from './generate-testing-index.mjs'

const repo = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const testing = join(repo, 'docs/testing')
const catalog = loadCatalog(testing)
const classification = JSON.parse(readFileSync(join(testing, 'legacy-flat-classification.json')))
const registry = JSON.parse(
  readFileSync(join(repo, 'docs/phase-governance/templates/registry.json')),
)
const names = [
  'by-domain.md',
  'by-engine.md',
  'by-module.md',
  'by-owner.md',
  'by-phase.md',
  'by-stage.md',
  'by-status.md',
  'by-tag.md',
  'legacy-by-domain.md',
]

function fixture(t) {
  const directory = mkdtempSync(join(realpathSync(tmpdir()), 'type-pal-index-governance-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const root = join(directory, 'docs/testing')
  mkdirSync(join(root, 'indexes'), { recursive: true })
  copyFileSync(join(testing, 'catalog.json'), join(root, 'catalog.json'))
  copyFileSync(
    join(testing, 'legacy-flat-classification.json'),
    join(root, 'legacy-flat-classification.json'),
  )
  writeFileSync(join(root, 'indexes/README.md'), 'manual README must survive\n')
  writeFileSync(join(root, 'untouched.txt'), 'unrelated sentinel\n')
  writeFileSync(join(root, 'indexes', names[0]), 'existing output sentinel\n')
  return { directory, root }
}

function snapshot(root, prefix = '') {
  return Object.fromEntries(
    readdirSync(join(root, prefix), { withFileTypes: true }).flatMap((entry) => {
      const path = join(prefix, entry.name)
      return entry.isDirectory()
        ? Object.entries(snapshot(root, path))
        : [[path, readFileSync(join(root, path), 'utf8')]]
    }),
  )
}

// Read rendered records rather than calling renderer helpers for an expected string.
function records(text) {
  let group = ''
  const result = []
  for (const line of text.split('\n')) {
    if (line.startsWith('### ')) group = line.slice(4)
    const row = /^\| ([^|]+) \| \[([^\]]+)\]\(([^)]+)\) \| ([^|]+) \| ([^|]+) \|$/.exec(line)
    const item = /^- (\S+) — \[([^\]]+)\]\(([^)]+)\)（([^）]+)）$/.exec(line)
    if (row)
      result.push({ group, id: row[1], title: row[2], href: row[3], status: row[4], owner: row[5] })
    if (item) result.push({ group, id: item[1], title: item[2], href: item[3], status: item[4] })
  }
  return result
}

function assertProjection(input, views) {
  const dimensions = {
    'by-domain.md': (entry) => [entry.domain ?? 'unspecified'],
    'by-engine.md': (entry) => entry.engines ?? [],
    'by-module.md': (entry) => [
      `${entry.domain ?? 'unspecified'}/${entry.module ?? 'unspecified'}`,
    ],
    'by-owner.md': (entry) => [entry.owner],
    'by-phase.md': (entry) => entry.phase ?? [],
    'by-stage.md': (entry) => (entry.kind === 'e2e-stage' ? [''] : []),
    'by-status.md': (entry) => [entry.status],
    'by-tag.md': (entry) => entry.tags,
  }
  const sort = (items) =>
    items.sort((left, right) => JSON.stringify(left).localeCompare(JSON.stringify(right)))
  for (const [name, values] of Object.entries(dimensions)) {
    const expected = []
    for (const entry of input.entries)
      for (const group of values(entry)) {
        const value = {
          group,
          id: entry.id,
          title: entry.title,
          href: `../${entry.canonical}`,
          status: entry.status,
        }
        if (!['by-owner.md', 'by-tag.md'].includes(name)) value.owner = entry.owner
        expected.push(value)
      }
    assert.deepEqual(sort(records(views[name])), sort(expected), name)
  }
}

test('nine governed views preserve independent catalog and legacy row oracles', () => {
  const views = renderIndexes(catalog, classification)
  assert.deepEqual(Object.keys(views).sort(), names)
  assertProjection(catalog, views)
  const legacyRows = views['legacy-by-domain.md']
    .split('\n')
    .filter((line) => line.startsWith('| ['))
    .map((line) => line.replace(/ \|$/, '').split(' | '))
  const expected = classification.entries.map((entry) => [
    `| [${entry.path}](../${entry.disposition === 'migrated' ? entry.canonicalTarget : entry.path})`,
    entry.module,
    entry.disposition,
    entry.reviewStatus,
    entry.classificationBasis,
  ])
  assert.deepEqual(legacyRows.toSorted(), expected.toSorted())
  assert.match(views['legacy-by-domain.md'], /旧分类账 reviewStatus/)
  assert.doesNotMatch(views['legacy-by-domain.md'], /\| 深审状态 \|/)
  for (const [name, text] of Object.entries(views)) {
    const path = `docs/testing/indexes/${name}`
    assert.deepEqual(
      checkMigratedDocument({ path, templateId: 'governance-index-v1' }, registry, () => text),
      [],
      name,
    )
    assert.match(text, /^Last reviewed: 2026-10-16$/m)
    assert.match(text, /不会续期日期/)
  }
})

test('writer owns exactly nine views, preserves inputs and manual README, and is idempotent', (t) => {
  const { root } = fixture(t)
  const before = snapshot(root)
  const first = writeIndexes(root)
  assert.deepEqual(Object.keys(first).sort(), names)
  assert.deepEqual(validateIndexes(catalog, root), [])
  const after = snapshot(root)
  for (const [path, value] of Object.entries(before))
    if (!path.startsWith('indexes/') || path === 'indexes/README.md')
      assert.equal(after[path], value, path)
  assert.deepEqual(
    Object.keys(after)
      .filter((path) => !(path in before))
      .sort(),
    names.slice(1).map((name) => `indexes/${name}`),
  )
  writeIndexes(root)
  assert.deepEqual(snapshot(root), after)
})

test('missing or unparsable authoritative inputs reject before any existing or absent output changes', (t) => {
  for (const name of ['catalog.json', 'legacy-flat-classification.json'])
    for (const mode of ['missing', 'invalid-json']) {
      const { root } = fixture(t)
      if (mode === 'missing') rmSync(join(root, name))
      else writeFileSync(join(root, name), '{invalid source')
      const before = snapshot(root)
      assert.throws(
        () => writeIndexes(root),
        (error) =>
          mode === 'missing'
            ? error.code === 'ENOENT' && error.path === join(root, name)
            : error instanceof SyntaxError,
      )
      assert.deepEqual(snapshot(root), before, `${name} ${mode}`)
    }
})

test('copied real public CLI writes only its nine views and rejects either missing source without mutation', (t) => {
  const { directory, root } = fixture(t)
  const modulePath = join(directory, 'scripts/docs/generate-testing-index.mjs')
  mkdirSync(dirname(modulePath), { recursive: true })
  copyFileSync(join(repo, 'scripts/docs/generate-testing-index.mjs'), modulePath)
  const run = () => spawnSync(process.execPath, [modulePath], { encoding: 'utf8', cwd: directory })
  const before = snapshot(root)
  const positive = run()
  assert.equal(positive.status, 0, positive.stderr)
  assert.equal(positive.stderr, '')
  assert.match(positive.stdout, /^testing indexes generated: /)
  assert.deepEqual(validateIndexes(catalog, root), [])
  assert.equal(readFileSync(join(root, 'indexes/README.md'), 'utf8'), before['indexes/README.md'])
  assert.deepEqual(
    Object.keys(snapshot(root)).sort(),
    [
      'catalog.json',
      'legacy-flat-classification.json',
      'untouched.txt',
      'indexes/README.md',
      ...names.map((name) => `indexes/${name}`),
    ].sort(),
  )
  for (const name of ['catalog.json', 'legacy-flat-classification.json']) {
    const bytes = readFileSync(join(root, name))
    rmSync(join(root, name))
    const missingBefore = snapshot(root)
    const negative = run()
    assert.notEqual(negative.status, 0)
    assert.equal(negative.signal, null)
    assert.match(negative.stderr, /ENOENT/)
    assert.ok(negative.stderr.includes(join(root, name)))
    assert.deepEqual(snapshot(root), missingBefore)
    writeFileSync(join(root, name), bytes)
  }
})

test('actual whole-file consumer rejects metadata, section, row, link and title mutations and missing views', (t) => {
  const { root } = fixture(t)
  const views = writeIndexes(root)
  for (const [name, text] of Object.entries(views)) {
    const mutations = [
      text.replace('Status: current', 'Status: historical'),
      text.replace('## 目的', '## omitted-purpose'),
      text.replace(
        name === 'legacy-by-domain.md'
          ? /\| reviewed \|/
          : /\| (?:current|proposal|rework|verified) \||（(?:current|proposal|rework|verified)）/,
        (row) =>
          row.replace(/reviewed|current|proposal|rework|verified/, 'candidate-needs-depth-review'),
      ),
      text.replace(/\]\(\.\.\//, '](../missing-target/'),
      text.replace(/^# /, '# forged-title '),
    ]
    for (const mutated of mutations) {
      assert.notEqual(mutated, text, name)
      writeFileSync(join(root, 'indexes', name), mutated)
      const issues = validateIndexes(catalog, root)
      assert.equal(issues.length, 1, `${name}: ${issues}`)
      assert.match(issues[0], /stale generated index/)
      assert.ok(issues[0].endsWith(name))
      writeFileSync(join(root, 'indexes', name), text)
    }
    rmSync(join(root, 'indexes', name))
    assert.match(validateIndexes(catalog, root)[0], /missing generated index/)
    writeFileSync(join(root, 'indexes', name), text)
  }
  assert.deepEqual(validateIndexes(catalog, root), [])
})

test('legal dimension changes update membership and derived scope without changing review date or source objects', () => {
  const changed = structuredClone(catalog)
  const entry = changed.entries.find((item) => item.id === 'e2e-006')
  assert.ok(entry)
  entry.domain = 'future-domain'
  entry.module = 'future-module'
  entry.tags = ['future-tag']
  entry.engines = ['future-engine']
  entry.phase = ['future-phase']
  entry.owner = 'Future Maintainer'
  const unchanged = structuredClone(changed)
  const views = renderIndexes(changed, classification)
  assertProjection(changed, views)
  assert.deepEqual(changed, unchanged)
  const expected = [
    ['by-domain.md', 'domain', (item) => [item.domain]],
    ['by-module.md', 'module', (item) => [`${item.domain}/${item.module}`]],
    ['by-tag.md', 'tag', (item) => item.tags],
    ['by-engine.md', 'engine', (item) => item.engines],
    ['by-phase.md', 'phase', (item) => item.phase],
    ['by-owner.md', 'owner', (item) => [item.owner]],
  ]
  for (const [name, dimension, values] of expected) {
    const members = changed.entries.flatMap(values)
    const groups = new Set(members).size
    const scope = views[name].split('## 范围\n\n')[1].split('\n\n')[0]
    assert.ok(scope.includes(`当前 ${groups} 个`), `${dimension}: ${scope}`)
    if (['tag', 'engine', 'phase'].includes(dimension))
      assert.ok(scope.includes(`${members.length} 个成员关系`), dimension)
  }
  for (const text of Object.values(views)) assert.match(text, /^Last reviewed: 2026-10-16$/m)
  assert.equal(entry.status, catalog.entries.find((item) => item.id === entry.id).status)
})
