import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import {
  currentDocumentPath,
  documentLocationManifest,
  fixedGitSourceUrl,
  loadDocumentLocations,
  transformDocument,
} from './document-location.mjs'
import { markdownLinks } from './markdown.mjs'
import { preservedMarkdownRanges } from './markdown-source-spans.mjs'

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const original =
  '# Card\n\n[guide](../guides/documentation.md)\n\n<!-- original-source-quote:start -->\n[original](../guides/documentation.md)\n<!-- original-source-quote:end -->\n'
function fixture(t, { collision = false, sourceText = original, seedFiles = {} } = {}) {
  const root = mkdtempSync('/tmp/type-pal-document-location-')
  t.after(() => rmSync(root, { recursive: true, force: true }))
  const write = (path, text) => {
    mkdirSync(join(root, path, '..'), { recursive: true })
    writeFileSync(join(root, path), text)
  }
  write('docs/ops/tasks/T.md', sourceText)
  write('docs/ops/guides/documentation.md', '# Guide\n')
  write('docs/ops/evidence/result.json', '{"executionPath":"docs/ops/tasks/T.md","passed":false}\n')
  write('docs/ops/evidence/raw.log', 'run: fixed\nexit: 1\n')
  for (const [path, bytes] of Object.entries(seedFiles)) write(path, bytes)
  if (collision) write('docs/tasks/cards/T.md', '# Collision\n')
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
  git('init', '-q')
  git('add', '-f', '.')
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'base',
  )
  const baseRevision = git('rev-parse', 'HEAD')
  for (const path of [
    'docs/ops/tasks/T.md',
    'docs/ops/guides/documentation.md',
    'docs/ops/evidence/result.json',
    'docs/ops/evidence/raw.log',
    ...Object.keys(seedFiles),
  ]) {
    const target = currentDocumentPath(path)
    mkdirSync(join(root, target, '..'), { recursive: true })
    if (!collision) renameSync(join(root, path), join(root, target))
  }
  const current = transformDocument(sourceText, 'docs/ops/tasks/T.md')
  write('docs/tasks/cards/T.md', current)
  const manifest = {
    schemaVersion: 1,
    kind: 'document-location-migration',
    baseRevision,
    documents: [{ path: 'docs/ops/tasks/T.md', mode: 'links', afterSha256: hash(current) }],
    additions: [],
    retired: [],
    routing: { entry: 'AGENTS.md', entrySection: '操作与必读', forwardingEntries: [], routes: [] },
  }
  const save = () => {
    const bytes = `${JSON.stringify(manifest)}\n`
    write(documentLocationManifest, bytes)
    return { baseRevision, manifestSha256: hash(bytes) }
  }
  return { root, write, manifest, save, current, admission: save() }
}

test('actual relocated bytes retain identity, exact native evidence and protected source spans', (t) => {
  const f = fixture(t)
  const locations = loadDocumentLocations(f.root, f.admission)
  assert.equal(locations.identity('docs/tasks/cards/T.md'), 'docs/ops/tasks/T.md')
  assert.equal(locations.read('docs/ops/tasks/T.md'), f.current)
  assert.match(f.current, /\[guide\]\(\.\.\/\.\.\/engineering\/guides\/documentation.md\)/u)
  assert.match(f.current, /\[original\]\(\.\.\/guides\/documentation.md\)/u)
  assert.equal(
    locations.assertCurrent('docs/ops/tasks/T.md', hash(original)).previous.toString(),
    original,
  )
  assert.match(locations.read('docs/ops/evidence/result.json'), /"passed":false/u)
  locations.assertUnchanged()
})

test('missing files and edited current prose fail real filesystem validation', (t) => {
  const f = fixture(t)
  f.write('docs/tasks/cards/T.md', f.current.replace('# Card', '# Changed claim'))
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /nonmechanical document change/u)
  f.write('docs/tasks/cards/T.md', f.current)
  rmSync(join(f.root, 'docs/tasks/evidence/result.json'))
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /current file missing/u)
  rmSync(join(f.root, documentLocationManifest))
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /admitted manifest missing/u)
})

test('a freshly pinned manifest cannot call a semantic edit a mechanical link change', (t) => {
  const f = fixture(t)
  const changed = f.current.replace('# Card', '# Different meaning')
  f.write('docs/tasks/cards/T.md', changed)
  f.manifest.documents[0].afterSha256 = hash(changed)
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /nonmechanical document change/u)
})

test('mechanical hashes are derived from fixed source rather than refreshed from current prose', (t) => {
  const f = fixture(t)
  delete f.manifest.documents[0].afterSha256
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  assert.equal(locations.changes.get('docs/ops/tasks/T.md').afterSha256, hash(f.current))
  f.write('docs/tasks/cards/T.md', f.current.replace('# Card', '# New conclusion'))
  assert.throws(() => loadDocumentLocations(f.root, admission), /nonmechanical document change/u)
})

test('path collisions and a changed frozen revision cannot borrow the admitted identity', (t) => {
  const collision = fixture(t, { collision: true })
  assert.throws(() => loadDocumentLocations(collision.root, collision.admission), /path collision/u)
  const f = fixture(t)
  f.manifest.baseRevision = 'a'.repeat(40)
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /frozen source revision/u)
})

test('editing native historical fields is rejected even when old paths look stale', (t) => {
  const f = fixture(t)
  const path = 'docs/tasks/evidence/result.json'
  f.write(
    path,
    readFileSync(join(f.root, path), 'utf8').replace(
      'docs/ops/tasks/T.md',
      'docs/tasks/cards/T.md',
    ),
  )
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /unreviewed body drift/u)
})

test('retired CLAUDE links resolve to a fixed Git source outside preserved spans', () => {
  const input = '[old](../../../CLAUDE.md#history)\n\n<pre>[source](../../../CLAUDE.md)</pre>\n'
  const output = transformDocument(input, 'docs/ops/tasks/T.md')
  assert.match(
    output,
    /https:\/\/github.com\/IllegalCreed\/type-pal\/blob\/159cd0e2f8753536800ba4635e896020a897fddc\/CLAUDE.md#history/u,
  )
  assert.match(output, /<pre>\[source\]\(\.\.\/\.\.\/\.\.\/CLAUDE.md\)<\/pre>/u)
})

test('fenced headings cannot truncate overlapping historical codecs or leak link rewrites', () => {
  const preserved =
    '<!-- incremental-original-source:start -->\n```markdown\n# Original 😀\n\n## Original section\n[old](../guides/documentation.md)\n```\n<!-- incremental-original-source:end -->'
  const before = `[live](../guides/documentation.md)\n\n## 原文保全\n\n${preserved}\n\n## 当前状态\n[after](../guides/documentation.md)\n`
  const after = transformDocument(before, 'docs/ops/tasks/T.md')
  assert(after.includes(preserved), 'complete original marker bytes must survive unchanged')
  assert.match(after, /\[live\]\(\.\.\/\.\.\/engineering\/guides\/documentation.md\)/u)
  assert.match(after, /\[after\]\(\.\.\/\.\.\/engineering\/guides\/documentation.md\)/u)
  const fenced =
    '<!-- original-source-fenced:start -->\n[old](../guides/documentation.md)\n<!-- original-source-fenced:end -->'
  assert.equal(transformDocument(fenced, 'docs/ops/tasks/T.md'), fenced)
  const unicodeHistory = `## 原文保全\n${fenced.replace('[old]', '😀 [old]')}\n## 当前状态\n[live](../guides/documentation.md)\n`
  assert.equal(
    preservedMarkdownRanges(unicodeHistory)[0].end,
    unicodeHistory.indexOf('## 当前状态'),
  )
  assert.match(
    transformDocument(unicodeHistory, 'docs/ops/tasks/T.md'),
    /\[live\]\(\.\.\/\.\.\/engineering\/guides\/documentation.md\)/u,
  )
})

test('the accepted retention ledger keeps its original quote through EOF without a fabricated terminator', (t) => {
  const path = 'docs/ops/archive/evidence/ARCH-CURRENT-ONLY-1-retention-ledger.md'
  const source = execFileSync('git', ['show', `159cd0e2f8753536800ba4635e896020a897fddc:${path}`], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    encoding: 'utf8',
  })
  const marker = '<!-- original-source-quote:start -->'
  const start = source.indexOf(marker)
  assert(start >= 0)
  assert(!source.includes('<!-- original-source-quote:end -->'))
  const transformed = transformDocument(source, path)
  assert(transformed.endsWith(source.slice(start)))
  assert(!transformed.includes('<!-- original-source-quote:end -->'))
  const f = fixture(t, { sourceText: source })
  assert.doesNotThrow(() => loadDocumentLocations(f.root, f.admission))
  const altered = f.current.replace(marker, `${marker}\nChanged historical sentence.`)
  f.write('docs/tasks/cards/T.md', altered)
  f.manifest.documents[0] = {
    path: 'docs/ops/tasks/T.md',
    mode: 'reviewed',
    afterSha256: hash(altered),
    review: {
      author: 'Contributor',
      reviewer: 'Owner',
      date: '2026-11-02',
      conclusion: 'No historical source edits authorized.',
      reviewedLines: altered.split('\n').length,
    },
  }
  assert.throws(
    () => loadDocumentLocations(f.root, f.save()),
    /preserved historical source changed/u,
  )
})

test('the accepted nested baseline design preserves all three quoted marker layers', () => {
  const path = 'docs/phase-governance/reviews/20261016-binding-baseline-design.md'
  const source = execFileSync('git', ['show', `159cd0e2f8753536800ba4635e896020a897fddc:${path}`], {
    cwd: fileURLToPath(new URL('../../', import.meta.url)),
    encoding: 'utf8',
  })
  const start = '<!-- original-source-quote:start -->'
  const end = '<!-- original-source-quote:end -->'
  assert.equal(source.split(start).length - 1, 3)
  const outerStart = source.indexOf(start)
  const outerEnd = source.lastIndexOf(end) + end.length
  assert(
    preservedMarkdownRanges(source).some(
      (range) => range.start <= outerStart && range.end >= outerEnd,
    ),
  )
  assert(transformDocument(source, path).endsWith(source.slice(outerStart)))
})

test('reviewed thin indexes can restore history from the exact fixed Git source, never a lookalike URL', (t) => {
  const f = fixture(t)
  const path = 'docs/ops/tasks/T.md'
  const expected = fixedGitSourceUrl(path, f.admission.baseRevision)
  const setBody = (url) => {
    const body = `# Thin index\n\n[Complete original](${url})\n`
    f.write(currentDocumentPath(path), body)
    f.manifest.documents[0] = {
      path,
      mode: 'reviewed',
      historyDisposition: 'fixed-git-source',
      afterSha256: hash(body),
      review: {
        author: 'Contributor',
        reviewer: 'Owner',
        date: '2026-11-02',
        conclusion: 'Current index and exact historical recovery were read.',
        reviewedLines: body.split('\n').length,
      },
    }
    return f.save()
  }
  assert.doesNotThrow(() => loadDocumentLocations(f.root, setBody(expected)))
  for (const url of [
    expected.replace(f.admission.baseRevision, 'main'),
    expected.replace('T.md', 'other.md'),
    expected.replace('github.com', 'github.com.invalid'),
  ])
    assert.throws(
      () => loadDocumentLocations(f.root, setBody(url)),
      /fixed historical source link missing/u,
    )
})

test('unclassified raw additions and post-load raw byte drift fail the same migration audit', (t) => {
  const f = fixture(t)
  const locations = loadDocumentLocations(f.root, f.admission)
  f.write('docs/tasks/evidence/undeclared.log', 'new unclassified run\n')
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /target file set differs/u)
  assert.throws(() => locations.assertUnchanged(), /target file set differs/u)
  rmSync(join(f.root, 'docs/tasks/evidence/undeclared.log'))
  f.write('docs/tasks/evidence/raw.log', 'run: fixed\nexit: 0\n')
  assert.throws(() => locations.assertUnchanged(), /unreviewed body drift/u)
})

test('only exact newly admitted raw attachments enter the inventory and retain zero document credit', (t) => {
  const f = fixture(t)
  const path = 'docs/tasks/evidence/accepted.log'
  const bytes = Buffer.from('original failed run\n')
  f.write(path, bytes)
  f.manifest.artifacts = [
    {
      path,
      sha256: hash(bytes),
      bytes: bytes.length,
      purpose: 'Necessary original failure receipt; no semantic or execution success credit.',
    },
  ]
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  assert.equal(locations.additions.size, 0)
  assert.equal(locations.artifacts.size, 1)
  locations.assertUnchanged()
  chmodSync(join(f.root, path), 0o755)
  assert.throws(
    () => loadDocumentLocations(f.root, admission),
    /artifact must retain regular 0644 mode/u,
  )
  assert.throws(() => locations.assertUnchanged(), /artifact must retain regular 0644 mode/u)
  chmodSync(join(f.root, path), 0o644)
  locations.assertUnchanged()
  f.write(path, Buffer.from('altered! failed run\n'))
  assert.throws(() => locations.assertUnchanged(), /artifact bytes drift/u)
  f.manifest.artifacts[0].path = 'docs/tasks/evidence/raw.log'
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /colliding or document artifact/u)
  f.manifest.artifacts[0].path = 'docs/tasks/evidence/hidden.md'
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /colliding or document artifact/u)
})

test('reviewed body hashes cannot rewrite the template source example status', (t) => {
  const f = fixture(t)
  const path = 'docs/ops/tasks/T.md'
  const source =
    '# Template\n\n<!-- template-source-example:start -->\nStatus: draft\n<!-- template-source-example:end -->\n'
  f.write(path, source)
  execFileSync('git', ['add', path], { cwd: f.root })
  execFileSync(
    'git',
    [
      '-c',
      'user.name=Fixture',
      '-c',
      'user.email=fixture@example.invalid',
      'commit',
      '-qm',
      'template source',
    ],
    { cwd: f.root },
  )
  f.manifest.baseRevision = execFileSync('git', ['rev-parse', 'HEAD'], {
    cwd: f.root,
    encoding: 'utf8',
  }).trim()
  rmSync(join(f.root, path))
  const changed = source.replace('Status: draft', 'Status: done')
  f.write(currentDocumentPath(path), changed)
  f.manifest.documents[0] = {
    path,
    mode: 'reviewed',
    afterSha256: hash(changed),
    review: {
      author: 'Contributor',
      reviewer: 'Owner',
      date: '2026-11-02',
      conclusion: 'Candidate decision; no historical rewrite authorized.',
      reviewedLines: changed.split('\n').length,
    },
  }
  const admission = { ...f.save(), baseRevision: f.manifest.baseRevision }
  assert.throws(
    () => loadDocumentLocations(f.root, admission),
    /preserved historical source changed/u,
  )
})

test('preserved historical directory links resolve only existing fixed-tree children', (t) => {
  const sourceText =
    '# Card\n<!-- original-source-quote:start -->\n[raw](../evidence/) [missing](../missing/)\n<!-- original-source-quote:end -->\n'
  const f = fixture(t, { sourceText })
  const locations = loadDocumentLocations(f.root, f.admission)
  const links = markdownLinks(f.current, { positions: true })
  assert.equal(locations.historicalLink('docs/tasks/cards/T.md', f.current, links[0]), true)
  assert.equal(locations.historicalLink('docs/tasks/cards/T.md', f.current, links[1]), false)
})

test('real migration admits only declared content aliases and still checks retained mode at exit', (t) => {
  const prefix = 'docs/ops/evidence/CASE'
  const alias = `${prefix}/counterproof-raw/final-replay.identity.tsv`
  const retained = `${prefix}/counterproof-raw/baseline.identity.tsv`
  const receipt = `${prefix}/counterproof.json`
  const bytes = Buffer.from('file\tcontract\tpassed\n')
  const native = JSON.stringify({
    finalReplay: {
      phase: {
        label: 'final-replay',
        identity: {
          artifact: {
            path: 'counterproof-raw/final-replay.identity.tsv',
            bytes: bytes.length,
            sha256: hash(bytes),
          },
        },
      },
    },
  })
  const f = fixture(t, { seedFiles: { [alias]: bytes, [retained]: bytes, [receipt]: native } })
  rmSync(join(f.root, currentDocumentPath(alias)))
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /current file missing/u)
  f.manifest.artifactAliases = [
    {
      path: alias,
      retained,
      receipt,
      pointer: '/finalReplay/phase/identity/artifact',
      bytes: bytes.length,
      sha256: hash(bytes),
      sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${alias}`], {
        cwd: f.root,
        encoding: 'utf8',
      }).trim(),
    },
  ]
  const locations = loadDocumentLocations(f.root, f.save())
  assert.equal(locations.identity(currentDocumentPath(alias)), alias)
  assert.equal(locations.currentPath(alias), currentDocumentPath(retained))
  assert.deepEqual(locations.readBuffer(alias), bytes)
  assert.equal(locations.read(receipt), native)
  locations.assertUnchanged()
  chmodSync(join(f.root, currentDocumentPath(retained)), 0o755)
  assert.throws(() => locations.assertUnchanged(), /file mode drift/u)
})
