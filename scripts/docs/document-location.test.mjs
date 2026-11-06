import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  chmodSync,
  cpSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { delimiter, join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { gzipSync } from 'node:zlib'
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

test('the admitted root manifest has an exact 1 MiB boundary before parsing', (t) => {
  const f = fixture(t)
  const original = readFileSync(join(f.root, documentLocationManifest))
  const boundary = Buffer.concat([original, Buffer.alloc(1_048_576 - original.length, 0x20)])
  f.write(documentLocationManifest, boundary)
  const admission = { ...f.admission, manifestSha256: hash(boundary) }
  loadDocumentLocations(f.root, admission).assertUnchanged()
  const oversized = Buffer.concat([boundary, Buffer.from(' ')])
  f.write(documentLocationManifest, oversized)
  assert.throws(() => loadDocumentLocations(f.root, admission), /unaccepted manifest/u)
  assert.throws(
    () => loadDocumentLocations(f.root, { ...admission, manifestSha256: hash(oversized) }),
    /root manifest exceeds 1 MiB/u,
  )
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
  const bytes = Buffer.from('file\tcontract\tpassed\n'.repeat(100))
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

  // Content sharing composes with a compressed baseline without losing the
  // original final-replay descriptor or allowing a missing target fallback.
  chmodSync(join(f.root, currentDocumentPath(retained)), 0o644)
  const packed = gzipSync(bytes)
  const stored = `${currentDocumentPath(retained)}.gz`
  f.write(stored, packed)
  rmSync(join(f.root, currentDocumentPath(retained)))
  f.manifest.compressedArtifacts = [
    {
      path: retained,
      stored,
      codec: 'gzip',
      bytes: bytes.length,
      sha256: hash(bytes),
      sourceBlob: f.manifest.artifactAliases[0].sourceBlob,
      storedBytes: packed.length,
      storedSha256: hash(packed),
    },
  ]
  const compressed = loadDocumentLocations(f.root, f.save())
  assert.deepEqual(compressed.readBuffer(alias), bytes)
  assert.equal(compressed.currentPath(alias), stored)
  compressed.assertUnchanged()
})

function compressedFixture(t) {
  const path = 'docs/ops/evidence/CASE/check.txt'
  const bytes = Buffer.from(
    'historical diagnostic display copy; original output has its own map\n'.repeat(4000),
  )
  const sourceText = `${original}\n[carrier](../evidence/CASE/check.txt)\n`
  const f = fixture(t, { sourceText, seedFiles: { [path]: bytes } })
  const stored = `${currentDocumentPath(path)}.gz`
  const packed = gzipSync(bytes, { level: 9 })
  f.write(stored, packed)
  rmSync(join(f.root, currentDocumentPath(path)))
  const row = {
    path,
    stored,
    codec: 'gzip',
    bytes: bytes.length,
    sha256: hash(bytes),
    sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
      cwd: f.root,
      encoding: 'utf8',
    }).trim(),
    storedBytes: packed.length,
    storedSha256: hash(packed),
  }
  f.manifest.compressedArtifacts = [row]
  const mapped = transformDocument(
    sourceText,
    'docs/ops/tasks/T.md',
    'docs/tasks/cards/T.md',
    (target) => (target === currentDocumentPath(path) ? stored : target),
  )
  f.write('docs/tasks/cards/T.md', mapped)
  f.manifest.documents[0].afterSha256 = hash(mapped)
  return { ...f, path, bytes, stored, packed, row }
}

test('compressed carrier preserves fixed logical bytes and public CLI reads all declared path forms', (t) => {
  const f = compressedFixture(t)
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  assert.deepEqual(locations.assertCurrent(f.path).current, f.bytes)
  assert.deepEqual(locations.readBuffer(currentDocumentPath(f.path)), f.bytes)
  assert.equal(locations.currentPath(f.path), f.stored)
  assert.equal(locations.identity(f.stored), f.path)
  locations.assertUnchanged()
  // Actual copied CLI, with this real Git fixture's independently supplied pin.
  cpSync(fileURLToPath(new URL('./', import.meta.url)), join(f.root, 'scripts/docs'), {
    recursive: true,
  })
  f.write('package.json', '{"type":"module"}\n')
  f.write(
    'scripts/docs/document-location-admission.mjs',
    `export const documentLocationAdmission = ${JSON.stringify(admission)}\n`,
  )
  for (const path of [f.path, currentDocumentPath(f.path), f.stored]) {
    assert.deepEqual(
      execFileSync(process.execPath, ['scripts/docs/read-retained-artifact.mjs', path, '--cat'], {
        cwd: f.root,
        maxBuffer: 1024 * 1024,
      }),
      f.bytes,
    )
  }
  const meta = JSON.parse(
    execFileSync(process.execPath, ['scripts/docs/read-retained-artifact.mjs', f.path], {
      cwd: f.root,
    }),
  )
  assert.equal(meta.sourceRevision, admission.baseRevision)
  assert.equal(meta.codec, 'gzip')
  assert.equal(meta.currentPath, f.stored)

  f.write(
    'packages/content/src/character.ts',
    'export const CONTENT_VERSION = 22 as const\nexport const CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 12 as const\n',
  )
  f.write(
    'README.md',
    '# Fixture\n\n[retained](docs/tasks/evidence/CASE/check.txt.gz)\n[stale](docs/tasks/evidence/CASE/check.txt)\n[missing](docs/tasks/evidence/CASE/missing.txt)\n',
  )
  const navigation = spawnSync(process.execPath, ['scripts/docs/check.mjs', '--json'], {
    cwd: f.root,
    encoding: 'utf8',
    maxBuffer: 1024 * 1024,
  })
  assert.equal(navigation.error, undefined)
  const navigationIssues = JSON.parse(navigation.stdout).issues
  assert(navigationIssues.some((issue) => issue.message.includes('missing.txt')))
  assert(
    navigationIssues.some(
      (issue) => issue.file === 'README.md' && issue.message.includes('CASE/check.txt'),
    ),
  )
  assert(!navigationIssues.some((issue) => issue.message.includes('CASE/check.txt.gz')))
  assert.throws(
    () =>
      execFileSync(
        process.execPath,
        ['scripts/docs/read-retained-artifact.mjs', 'docs/ops/evidence/raw.log'],
        { cwd: f.root, stdio: 'pipe' },
      ),
    /not an admitted retained artifact/u,
  )
})

test('compression rejects raw reappearance, damaged storage, wrong source and undeclared storage', (t) => {
  const f = compressedFixture(t)
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  f.write(currentDocumentPath(f.path), f.bytes)
  assert.throws(() => locations.assertUnchanged(), /uncompressed carrier still exists/u)
  rmSync(join(f.root, currentDocumentPath(f.path)))
  chmodSync(join(f.root, f.stored), 0o755)
  assert.throws(() => locations.assertUnchanged(), /stored carrier missing or changed/u)
  chmodSync(join(f.root, f.stored), 0o644)
  f.write(f.stored, Buffer.from(f.packed).fill(0, 30, 35))
  assert.throws(() => locations.assertUnchanged(), /stored carrier missing or changed/u)
  f.write(f.stored, f.packed)
  for (const delta of [
    { sourceBlob: '0'.repeat(40) },
    { sha256: '0'.repeat(64) },
    { stored: 'docs/tasks/evidence/OTHER/check.txt.gz' },
    { bytes: f.bytes.length + 1 },
    { codec: 'zip' },
    { storedBytes: f.bytes.length },
    { extra: true },
  ]) {
    f.manifest.compressedArtifacts = [{ ...f.row, ...delta }]
    assert.throws(() => loadDocumentLocations(f.root, f.save()), /artifact compression:/u)
  }
  f.manifest.compressedArtifacts = [f.row, f.row]
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /duplicate or colliding identity/u)
  f.manifest.compressedArtifacts = []
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /current file missing/u)
})

test('a newly pinned compressed hash cannot substitute different decoded carrier bytes or a gzip bomb', (t) => {
  const f = compressedFixture(t)
  for (const bytes of [
    Buffer.alloc(f.bytes.length, 'x'),
    Buffer.alloc(f.bytes.length + 5000, 'x'),
  ]) {
    const packed = gzipSync(bytes)
    f.write(f.stored, packed)
    f.manifest.compressedArtifacts = [
      {
        ...f.row,
        storedBytes: packed.length,
        storedSha256: hash(packed),
      },
    ]
    assert.throws(
      () => loadDocumentLocations(f.root, f.save()),
      /decoded carrier differs|larger than/u,
    )
  }
})

test('compression storage cannot take the location of a different fixed source', (t) => {
  const f = fixture(t, {
    seedFiles: {
      'docs/ops/evidence/CASE/check.txt': 'fixed source\n'.repeat(100),
      'docs/ops/evidence/CASE/check.txt.gz': 'separate original carrier',
    },
  })
  const path = 'docs/ops/evidence/CASE/check.txt',
    bytes = Buffer.from('fixed source\n'.repeat(100))
  const packed = gzipSync(bytes),
    stored = `${currentDocumentPath(path)}.gz`
  f.write(stored, packed)
  rmSync(join(f.root, currentDocumentPath(path)))
  f.manifest.compressedArtifacts = [
    {
      path,
      stored,
      codec: 'gzip',
      bytes: bytes.length,
      sha256: hash(bytes),
      sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
        cwd: f.root,
        encoding: 'utf8',
      }).trim(),
      storedBytes: packed.length,
      storedSha256: hash(packed),
    },
  ]
  assert.throws(
    () => loadDocumentLocations(f.root, f.save()),
    /fixed source or storage identity differs/u,
  )
})

// Exercise the public reader against actual Git, with only one batch response
// changed by the child-local wrapper. The parent test runner's PATH is untouched.
function batchGitFixture(t, f) {
  const directory = mkdtempSync('/tmp/type-pal-location-git-')
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const realGit = execFileSync('which', ['git'], { encoding: 'utf8' }).trim()
  const trace = join(directory, 'trace.jsonl')
  const wrapper = join(directory, 'git')
  writeFileSync(
    wrapper,
    `#!${process.execPath}
const {spawnSync} = require('node:child_process')
const {appendFileSync,readFileSync,writeFileSync} = require('node:fs')
const args = process.argv.slice(2), batch = args[0] === 'cat-file' && args[1] === '--batch'
const input = batch ? readFileSync(0) : undefined
appendFileSync(${JSON.stringify(trace)}, JSON.stringify({args,objects:input?.toString().trim().split('\\n')})+'\\n')
const result = spawnSync(${JSON.stringify(realGit)},args,{input,maxBuffer:64*1024*1024})
if (result.error) throw result.error
let output = result.stdout, status = result.status
if (batch && status === 0) {
  const end = output.indexOf(10), header = output.subarray(0,end).toString()
  const mode = process.env.LOCATION_GIT_TEST_MODE
  if (mode === 'object') output = Buffer.concat([Buffer.from(header.replace(/^[a-f0-9]{40}/,process.env.LOCATION_GIT_OTHER_OBJECT)),output.subarray(end)])
  if (mode === 'type') output = Buffer.concat([Buffer.from(header.replace(' blob ',' tree ')),output.subarray(end)])
  if (mode === 'extent') output = Buffer.concat([Buffer.from(header.replace(/ [0-9]+$/,' 9007199254740992')),output.subarray(end)])
  if (mode === 'extent-limit') output = Buffer.concat([Buffer.from(header.replace(/ [0-9]+$/,' 33554433')),output.subarray(end)])
  if (mode === 'extent-mismatch') output = Buffer.concat([Buffer.from(header.replace(/ [0-9]+$/,' 123456')),output.subarray(end)])
  if (mode === 'content') {output=Buffer.from(output);output[end+1]^=1}
  if (mode === 'truncated') output = output.subarray(0,output.length-1)
  if (mode === 'trailing') output = Buffer.concat([output,Buffer.from('!')])
  if (mode === 'stderr') writeFileSync(2,'owned Git diagnostic\\n')
  if (mode === 'exit') status = 7
}
writeFileSync(1,output)
writeFileSync(2,result.stderr)
process.exitCode = status ?? 1
`,
    { mode: 0o755 },
  )
  const run = (body, { mode = 'pass', admission = f.save(), otherObject } = {}) => {
    writeFileSync(trace, '')
    return spawnSync(
      process.execPath,
      [
        '--input-type=module',
        '-e',
        `import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import {loadDocumentLocations} from ${JSON.stringify(new URL('./document-location.mjs', import.meta.url).href)}
const root=${JSON.stringify(f.root)}, admission=${JSON.stringify(admission)}
const trace=()=>readFileSync(${JSON.stringify(trace)},'utf8').trim().split('\\n').filter(Boolean).map(line=>JSON.parse(line))
${body}`,
      ],
      {
        cwd: f.root,
        env: {
          ...process.env,
          PATH: `${directory}${delimiter}${process.env.PATH}`,
          LOCATION_GIT_TEST_MODE: mode,
          ...(otherObject ? { LOCATION_GIT_OTHER_OBJECT: otherObject } : {}),
        },
        encoding: 'utf8',
        maxBuffer: 1024 * 1024,
      },
    )
  }
  return { run, trace }
}

test('fixed Git batching shares only bytes and retains independent paths, copies and lazy reads', (t) => {
  const paths = ['docs/ops/evidence/CASE/one.raw', 'docs/ops/evidence/CASE/two.raw']
  const lazy = 'docs/phase1/lazy.raw'
  const binary = Buffer.concat(Array.from({ length: 1000 }, () => Buffer.from([0, 255, 10, 65])))
  const f = fixture(t, { seedFiles: { [paths[0]]: binary, [paths[1]]: binary, [lazy]: 'lazy\n' } })
  f.manifest.compressedArtifacts = paths.map((path) => {
    const packed = gzipSync(binary),
      stored = `${currentDocumentPath(path)}.gz`
    f.write(stored, packed)
    rmSync(join(f.root, currentDocumentPath(path)))
    return {
      path,
      stored,
      codec: 'gzip',
      bytes: binary.length,
      sha256: hash(binary),
      sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
        cwd: f.root,
        encoding: 'utf8',
      }).trim(),
      storedBytes: packed.length,
      storedSha256: hash(packed),
    }
  })
  const expected = execFileSync('git', ['show', `HEAD:${paths[0]}`], { cwd: f.root })
  const lazyObject = execFileSync('git', ['rev-parse', `HEAD:${lazy}`], {
    cwd: f.root,
    encoding: 'utf8',
  }).trim()
  const wrapped = batchGitFixture(t, f)
  const result = wrapped.run(`
const locations=loadDocumentLocations(root,admission), expected=Buffer.from(${JSON.stringify(expected.toString('base64'))},'base64')
const paths=${JSON.stringify(paths)}, lazy=${JSON.stringify(lazy)}
const initial=trace(), batches=initial.filter(x=>x.args[1]==='--batch')
assert.equal(batches.length,1)
assert.equal(batches[0].objects.filter(x=>x===${JSON.stringify(f.manifest.compressedArtifacts[0].sourceBlob)}).length,1)
assert(!batches[0].objects.includes(${JSON.stringify(lazyObject)}))
const first=locations.sourceBuffer(paths[0]);assert.deepEqual(first,expected);first.fill(0)
for(const path of paths){assert.deepEqual(locations.sourceBuffer(path),expected);assert.equal(locations.identity(locations.currentPath(path)),path)}
assert.equal(locations.sourceBuffer('docs/phase1/unknown.raw'),undefined)
assert.deepEqual(trace(),initial)
assert.equal(locations.sourceBuffer(lazy).toString(),'lazy\\n')
const after=trace();assert.equal(after.length,initial.length+1)
assert.deepEqual(after.at(-1).args,['cat-file','blob',${JSON.stringify(lazyObject)}])
locations.sourceBuffer(lazy).fill(0)
assert.equal(locations.sourceBuffer(lazy).toString(),'lazy\\n');assert.deepEqual(trace(),after)
locations.assertUnchanged()
`)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
})

test('fixed Git batch rejects changed framing, content, extent, incomplete output and diagnostics', async (t) => {
  const f = fixture(t),
    wrapped = batchGitFixture(t, f)
  const positive = wrapped.run('loadDocumentLocations(root,admission).assertUnchanged()')
  assert.ifError(positive.error)
  assert.equal(positive.status, 0, positive.stderr)
  assert.equal(positive.stderr, '')
  const otherObject = execFileSync('git', ['rev-parse', 'HEAD:docs/ops/evidence/raw.log'], {
    cwd: f.root,
    encoding: 'utf8',
  }).trim()
  for (const [mode, message] of [
    ['object', 'framing/object differs'],
    ['type', 'framing/object differs'],
    ['extent', 'extent differs'],
    ['extent-limit', 'extent differs'],
    ['extent-mismatch', 'extent differs'],
    ['content', 'content drift'],
    ['truncated', 'payload truncated'],
    ['trailing', 'trailing Git batch payload'],
    ['stderr', 'batch failed or emitted diagnostics'],
    ['exit', 'batch failed or emitted diagnostics'],
  ]) {
    await t.test(mode, () => {
      const result = wrapped.run(
        `assert.throws(()=>loadDocumentLocations(root,admission),error=>error.code==='ERR_ASSERTION'&&error.message.includes(${JSON.stringify(message)}))`,
        { mode, otherObject },
      )
      assert.ifError(result.error)
      assert.equal(result.status, 0, result.stderr)
      assert.equal(result.stderr, '')
      assert(
        JSON.parse(readFileSync(wrapped.trace, 'utf8').trim().split('\n').at(-1)).args.includes(
          '--batch',
        ),
      )
    })
  }
})

test('a mandatory source set larger than one batch keeps bounded requests and every fixed byte', (t) => {
  const seeds = Object.fromEntries(
    Array.from({ length: 513 }, (_, index) => [
      `docs/ops/tasks/batch/${index}.md`,
      `# Fixed source ${index}\n`,
    ]),
  )
  const empty = 'docs/ops/tasks/batch/empty.md'
  seeds[empty] = ''
  const f = fixture(t, { seedFiles: seeds })
  f.manifest.documents.push(...Object.keys(seeds).map((path) => ({ path, mode: 'links' })))
  const wrapped = batchGitFixture(t, f)
  const result = wrapped.run(`
const locations=loadDocumentLocations(root,admission), batches=trace().filter(x=>x.args[1]==='--batch')
assert.equal(batches.length,2)
assert(batches.every(x=>x.objects.length<=512))
assert.equal(new Set(batches.flatMap(x=>x.objects)).size,515)
for(const [path,text] of Object.entries(${JSON.stringify(seeds)})) assert.equal(locations.sourceBuffer(path).toString(),text)
assert.equal(trace().filter(x=>x.args[1]==='blob').length,0)
locations.assertUnchanged()
`)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
})

test('source batching cannot turn real tags, executable files or symlinks into ordinary fixed sources', (t) => {
  const f = fixture(t, {
    seedFiles: { 'docs/phase1/executable.raw': 'exe\n', 'docs/phase1/link.raw': 'target\n' },
  })
  const git = (...args) => execFileSync('git', args, { cwd: f.root, encoding: 'utf8' }).trim()
  // Both forbidden modes deliberately share the already prefetched card OID;
  // an OID cache hit must not bypass the requested path's actual tree mode.
  const cached = git('rev-parse', 'HEAD:docs/ops/tasks/T.md')
  git('update-index', '--cacheinfo', `100755,${cached},docs/phase1/executable.raw`)
  git('update-index', '--cacheinfo', `120000,${cached},docs/phase1/link.raw`)
  const commit = git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit-tree',
    git('write-tree'),
    '-m',
    'mode boundaries',
  )
  f.manifest.baseRevision = commit
  const locations = loadDocumentLocations(f.root, { ...f.save(), baseRevision: commit })
  for (const path of ['docs/phase1/executable.raw', 'docs/phase1/link.raw'])
    assert.throws(() => locations.sourceBuffer(path), /nonordinary source/u)
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'tag',
    '-a',
    'not-a-commit',
    commit,
    '-m',
    'owned tag boundary',
  )
  const tag = git('rev-parse', 'not-a-commit')
  f.manifest.baseRevision = tag
  assert.throws(
    () => loadDocumentLocations(f.root, { ...f.save(), baseRevision: tag }),
    /source revision is not a commit/u,
  )
})

function retiredArtifactFixture(t, { sourceText = original } = {}) {
  const path = 'docs/ops/evidence/CASE/input.source.gz'
  const keep = 'docs/ops/evidence/CASE/other.source.gz'
  const receipt = 'docs/ops/evidence/CASE/input.json'
  const bytes = gzipSync('fixed staged input\n')
  const keepBytes = gzipSync('different retained input\n')
  const native = `${JSON.stringify({ input: path, exit: 1, fullRead: false })}\n`
  const f = fixture(t, {
    sourceText,
    seedFiles: { [path]: bytes, [keep]: keepBytes, [receipt]: native },
  })
  const row = {
    path,
    sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
      cwd: f.root,
      encoding: 'utf8',
    }).trim(),
    sha256: hash(bytes),
    bytes: bytes.length,
  }
  rmSync(join(f.root, currentDocumentPath(path)))
  f.manifest.retiredArtifacts = [row]
  return { ...f, path, keep, keepBytes, receipt, native, bytes, row }
}

test('only a positive admitted attachment retirement has no current body and keeps original-source access explicit', (t) => {
  const f = retiredArtifactFixture(t)
  assert.throws(() => loadDocumentLocations(f.root, f.admission), /current file missing/u)
  const locations = loadDocumentLocations(f.root, f.save())
  assert.deepEqual(locations.retiredArtifacts, [f.row])
  assert.equal(locations.identity(currentDocumentPath(f.path)), f.path)
  for (const path of [f.path, currentDocumentPath(f.path)])
    assert.equal(locations.readBuffer(path), undefined)
  assert.deepEqual(locations.sourceBuffer(f.path), f.bytes)
  assert.equal(locations.read(f.receipt), f.native)
  assert.equal(locations.additions.size, 0)
  locations.assertUnchanged()
  for (const path of [f.path, currentDocumentPath(f.path)])
    assert.throws(() => locations.assertCurrent(path), /retired artifact has no current body/u)
})

test('attachment retirement does not hide new files, missing unselected evidence or native receipt edits', (t) => {
  const f = retiredArtifactFixture(t)
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  const unclassified = 'docs/tasks/evidence/CASE/new.source.gz'
  f.write(unclassified, f.bytes)
  assert.throws(() => locations.assertUnchanged(), /target file set differs/u)
  assert.throws(() => loadDocumentLocations(f.root, admission), /target file set differs/u)
  rmSync(join(f.root, unclassified))
  rmSync(join(f.root, currentDocumentPath(f.keep)))
  assert.throws(() => locations.assertUnchanged(), /current file missing/u)
  assert.throws(() => loadDocumentLocations(f.root, admission), /current file missing/u)
  f.write(currentDocumentPath(f.keep), f.keepBytes)
  f.write(currentDocumentPath(f.receipt), f.native.replace('"exit":1', '"exit":0'))
  assert.throws(() => locations.assertUnchanged(), /unreviewed body drift/u)
  assert.throws(() => loadDocumentLocations(f.root, admission), /unreviewed body drift/u)
  f.write(currentDocumentPath(f.receipt), f.native)
  locations.assertUnchanged()
})

test('attachment retirement cannot hide a governed body or bless a new live link as historical', (t) => {
  const sourceText =
    '# Card\n[live](../evidence/CASE/input.source.gz)\n\n<!-- original-source-quote:start -->\n[past](../evidence/CASE/input.source.gz)\n<!-- original-source-quote:end -->\n'
  const f = retiredArtifactFixture(t, { sourceText })
  const locations = loadDocumentLocations(f.root, f.save())
  const links = markdownLinks(f.current, { positions: true })
  assert.equal(locations.historicalLink('docs/tasks/cards/T.md', f.current, links[0]), false)
  assert.equal(locations.historicalLink('docs/tasks/cards/T.md', f.current, links[1]), true)
  const body = 'docs/ops/evidence/result.json'
  const bytes = execFileSync('git', ['show', `HEAD:${body}`], { cwd: f.root })
  f.manifest.retiredArtifacts = [
    {
      path: body,
      sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${body}`], {
        cwd: f.root,
        encoding: 'utf8',
      }).trim(),
      sha256: hash(bytes),
      bytes: bytes.length,
    },
  ]
  rmSync(join(f.root, currentDocumentPath(body)))
  assert.throws(
    () => loadDocumentLocations(f.root, f.save()),
    /only declared historical gzip attachments/u,
  )
})

test('declared retired inputs join bounded fixed Git prefetch without prefetching unrelated carriers', (t) => {
  const f = retiredArtifactFixture(t)
  const keepObject = execFileSync('git', ['rev-parse', `HEAD:${f.keep}`], {
    cwd: f.root,
    encoding: 'utf8',
  }).trim()
  const wrapped = batchGitFixture(t, f)
  const result = wrapped.run(`
const locations=loadDocumentLocations(root,admission)
const objects=trace().filter(x=>x.args[1]==='--batch').flatMap(x=>x.objects)
assert.equal(objects.filter(x=>x===${JSON.stringify(f.row.sourceBlob)}).length,1)
assert(!objects.includes(${JSON.stringify(keepObject)}))
const initial=trace()
assert.equal(locations.readBuffer(${JSON.stringify(f.path)}),undefined)
assert.deepEqual(locations.sourceBuffer(${JSON.stringify(f.path)}),Buffer.from(${JSON.stringify(f.bytes.toString('base64'))},'base64'))
locations.assertUnchanged()
assert.deepEqual(trace(),initial)
`)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
})

function packRetirementRows(f, rows, { suffix = '' } = {}) {
  const path = `docs/tasks/evidence/REPO-SLIM-PLAN-1-retired-artifacts${suffix}.json.gz`
  const decoded = Buffer.from(`${JSON.stringify(rows)}\n`)
  const packed = gzipSync(decoded)
  f.write(path, packed)
  f.manifest.artifacts = [
    {
      path,
      sha256: hash(packed),
      bytes: packed.length,
      purpose: 'Finite retirement membership only',
    },
  ]
  f.manifest.retiredArtifacts = {
    codec: 'gzip',
    path,
    storedSha256: hash(packed),
    storedBytes: packed.length,
    decodedSha256: hash(decoded),
    decodedBytes: decoded.length,
    entries: rows.length,
  }
  return { ...f, listPath: path, packed }
}

function packedRetirementFixture(t) {
  const f = retiredArtifactFixture(t)
  return packRetirementRows(f, f.manifest.retiredArtifacts)
}

test('the ordinary gzip member set is part of complete inventory and joins fixed source prefetch', (t) => {
  const f = packedRetirementFixture(t)
  const locations = loadDocumentLocations(f.root, f.save())
  assert.deepEqual(locations.retiredArtifacts, [f.row])
  assert.equal(locations.manifest.retiredArtifacts.entries, 1)
  assert.equal(locations.artifacts.size, 1)
  assert.deepEqual(locations.readBuffer(f.listPath), f.packed)
  assert.equal(locations.readBuffer(f.path), undefined)
  locations.assertUnchanged()
  const wrapped = batchGitFixture(t, f)
  const result = wrapped.run(`
const locations=loadDocumentLocations(root,admission)
assert.equal(locations.retiredArtifacts.length,1)
assert(trace().filter(x=>x.args[1]==='--batch').flatMap(x=>x.objects).includes(${JSON.stringify(f.row.sourceBlob)}))
locations.assertUnchanged()
`)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  f.write('docs/tasks/evidence/unclassified-list.json.gz', f.packed)
  assert.throws(() => locations.assertUnchanged(), /target file set differs/u)
})

test('the gzip list cannot replace ordinary registration or survive carrier replacement during a read', (t) => {
  const f = packedRetirementFixture(t)
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  const temporary = join(f.root, 'replacement.gz')
  writeFileSync(temporary, f.packed)
  renameSync(temporary, join(f.root, f.listPath))
  assert.throws(() => locations.assertUnchanged(), /carrier identity changed/u)
  loadDocumentLocations(f.root, admission).assertUnchanged()
  f.manifest.artifacts = []
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /registration differs/u)
  f.manifest.artifacts = [
    {
      path: f.listPath,
      sha256: hash(f.packed),
      bytes: f.packed.length,
      purpose: 'Finite membership',
    },
  ]
  rmSync(join(f.root, f.listPath))
  assert.throws(() => loadDocumentLocations(f.root, f.save()), /stored carrier missing/u)
})

test('retirement windows exceed 4096 independent Git blobs without single-blob reads or losing the tail checks', (t) => {
  const prefix = 'docs/ops/evidence/LARGE'
  const seedFiles = Object.fromEntries(
    Array.from({ length: 4101 }, (_, index) => [
      `${prefix}/${String(index).padStart(4, '0')}.source.gz`,
      gzipSync(`fixed historical input ${index}\n`),
    ]),
  )
  const f = fixture(t, { seedFiles })
  const entries = new Map(
    execFileSync('git', ['ls-tree', '-rlz', 'HEAD', '--', prefix], {
      cwd: f.root,
      encoding: 'utf8',
      maxBuffer: 2 * 1024 * 1024,
    })
      .split('\0')
      .filter(Boolean)
      .map((line) => {
        const [, object, bytes, path] = /^100644 blob ([a-f\d]{40}) +(\d+)\t(.+)$/u.exec(line)
        return [path, { object, bytes: Number(bytes) }]
      }),
  )
  assert.equal(new Set([...entries.values()].map((row) => row.object)).size, 4101)
  const rows = Object.entries(seedFiles).map(([path, bytes]) => ({
    path,
    sourceBlob: entries.get(path).object,
    sha256: hash(bytes),
    bytes: bytes.length,
  }))
  for (const row of rows) rmSync(join(f.root, currentDocumentPath(row.path)))
  packRetirementRows(f, rows)
  f.write(
    'expected-retirements.json',
    JSON.stringify({
      rows,
      bytesByObject: Object.fromEntries(
        [...entries.values()].map((row) => [row.object, row.bytes]),
      ),
      tailBytes: seedFiles[rows.at(-1).path].toString('base64'),
    }),
  )
  const wrapped = batchGitFixture(t, f)
  const result = wrapped.run(`
const {rows,bytesByObject,tailBytes}=JSON.parse(readFileSync(root+'/expected-retirements.json','utf8'))
const locations=loadDocumentLocations(root,admission)
assert.equal(locations.retiredArtifacts.length,4101)
locations.assertUnchanged()
const calls=trace(), batches=calls.filter(x=>x.args[1]==='--batch')
assert(batches.length>1&&batches.length<50)
assert(batches.every(x=>x.objects.length<=512&&x.objects.reduce((n,oid)=>n+(bytesByObject[oid]??0),0)<=32*1024*1024))
assert.equal(calls.filter(x=>x.args[0]==='cat-file'&&x.args[1]==='blob').length,0)
const seen=new Set(batches.flatMap(x=>x.objects));assert(rows.every(row=>seen.has(row.sourceBlob)))
const fs=await import('node:fs'), tail=rows.at(-1), current=root+'/'+tail.path.replace('docs/ops/evidence/','docs/tasks/evidence/')
fs.writeFileSync(current,Buffer.from(tailBytes,'base64'))
assert.throws(()=>locations.assertUnchanged(),/retired physical carrier reappeared/)
fs.rmSync(current)
locations.assertUnchanged()
assert.equal(trace().filter(x=>x.args[0]==='cat-file'&&x.args[1]==='blob').length,0)
`)
  assert.ifError(result.error)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const bad = rows.map((row) => ({ ...row }))
  bad.at(-1).sha256 = '0'.repeat(64)
  packRetirementRows(f, bad)
  const negative = wrapped.run(`
assert.throws(()=>loadDocumentLocations(root,admission),/fixed source bytes differ/)
assert.equal(trace().filter(x=>x.args[0]==='cat-file'&&x.args[1]==='blob').length,0)
`)
  assert.ifError(negative.error)
  assert.equal(negative.status, 0, negative.stderr)
  assert.equal(negative.stderr, '')
})

test('two physical list shards preserve one retirement set and still reject a repinned corrupt second tail', (t) => {
  const f = retiredArtifactFixture(t)
  const keepRow = {
    path: f.keep,
    sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${f.keep}`], {
      cwd: f.root,
      encoding: 'utf8',
    }).trim(),
    sha256: hash(f.keepBytes),
    bytes: f.keepBytes.length,
  }
  rmSync(join(f.root, currentDocumentPath(f.keep)))
  packRetirementRows(f, [f.row])
  const first = { ...f.manifest.retiredArtifacts },
    firstArtifact = { ...f.manifest.artifacts[0] }
  const setSecond = (row) => {
    packRetirementRows(f, [row], { suffix: '-2' })
    f.manifest.retiredArtifacts = [first, f.manifest.retiredArtifacts]
    f.manifest.artifacts.unshift(firstArtifact)
    return f.save()
  }
  const locations = loadDocumentLocations(f.root, setSecond(keepRow))
  assert.deepEqual(locations.retiredArtifacts, [f.row, keepRow])
  assert.equal(locations.artifacts.size, 2)
  locations.assertUnchanged()
  assert.throws(
    () => loadDocumentLocations(f.root, setSecond({ ...keepRow, sha256: '0'.repeat(64) })),
    /fixed source bytes differ/u,
  )
  assert.throws(
    () => loadDocumentLocations(f.root, setSecond(f.row)),
    /duplicate or colliding identity/u,
  )
})

test('exact archived replay sources retire while adjacent unadmitted files remain enforced', (t) => {
  const lab = 'docs/testing/archive/legacy/batches/glm-architecture-regression-lab'
  const input = `${lab}/fixtures/input.ts`
  const unresolved = 'docs/testing/archive/legacy/unresolved-tools/probe.mts'
  const keep = `${lab}/tools/keep.mjs`
  const seedFiles = {
    [input]: 'export const input = 1\n',
    [unresolved]: 'export const probe = 2\n',
    [keep]: 'export const keep = 3\n',
  }
  const f = fixture(t, { seedFiles })
  const rows = [input, unresolved].map((path) => ({
    path,
    sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
      cwd: f.root,
      encoding: 'utf8',
    }).trim(),
    sha256: hash(seedFiles[path]),
    bytes: Buffer.byteLength(seedFiles[path]),
  }))
  f.manifest.retiredArtifacts = rows
  for (const { path } of rows) rmSync(join(f.root, path))
  const admission = f.save()
  const locations = loadDocumentLocations(f.root, admission)
  assert.deepEqual(locations.retiredArtifacts, rows)
  assert.equal(locations.readBuffer(input), undefined)
  assert.equal(locations.sourceBuffer(input).toString(), seedFiles[input])
  locations.assertUnchanged()
  f.write(keep, 'export const keep = 4\n')
  assert.throws(() => locations.assertUnchanged(), /unreviewed body drift/u)
  f.write(keep, seedFiles[keep])
  rmSync(join(f.root, keep))
  assert.throws(() => loadDocumentLocations(f.root, admission), /current file missing/u)
  f.write(keep, seedFiles[keep])
  const extra = `${lab}/fixtures/unknown.mjs`
  f.write(extra, 'export const unknown = true\n')
  assert.throws(() => locations.assertUnchanged(), /unclassified addition or missing original/u)
  rmSync(join(f.root, extra))
  f.write(unresolved, seedFiles[unresolved])
  assert.throws(() => locations.assertUnchanged(), /retired physical carrier reappeared/u)
  rmSync(join(f.root, unresolved))
  locations.assertUnchanged()
})

test('archived replay source admission rejects bodies and sources outside the exact replay roots', (t) => {
  const lab = 'docs/testing/archive/legacy/batches/glm-architecture-regression-lab'
  const paths = [
    `${lab}/fixtures/README.md`,
    `${lab}/fixtures/evidence.json`,
    `${lab}/fixtures/archive.html`,
    `${lab}/other/probe.ts`,
    'docs/testing/archive/other/probe.mjs',
    'packages/game/src/probe.ts',
    'tests/probe.test.ts',
  ]
  const bytes = 'fixed historical source\n'
  const f = fixture(t, { seedFiles: Object.fromEntries(paths.map((path) => [path, bytes])) })
  for (const path of paths) {
    f.manifest.retiredArtifacts = [
      {
        path,
        sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
          cwd: f.root,
          encoding: 'utf8',
        }).trim(),
        sha256: hash(bytes),
        bytes: Buffer.byteLength(bytes),
      },
    ]
    assert.throws(
      () => loadDocumentLocations(f.root, f.save()),
      /only declared historical gzip attachments or archived replay sources/u,
      path,
    )
  }
})

test('historical text and identity inputs exit codecs and aliases as one fixed-source set', (t) => {
  const prefix = 'docs/ops/evidence/CASE'
  const baseline = `${prefix}/counterproof-raw/baseline.identity.tsv`
  const alias = `${prefix}/counterproof-raw/final-replay.identity.tsv`
  const receipt = `${prefix}/counterproof.json`
  const bytes = Buffer.from('file\tcontract\tpassed\n'.repeat(100))
  const descriptor = (path) => ({ path, bytes: bytes.length, sha256: hash(bytes) })
  const native = JSON.stringify({
    baseline: {
      label: 'baseline',
      exitCode: 0,
      identity: { artifact: descriptor('counterproof-raw/baseline.identity.tsv') },
    },
    finalReplay: {
      phase: {
        label: 'final-replay',
        exitCode: 0,
        identity: { artifact: descriptor('counterproof-raw/final-replay.identity.tsv') },
      },
    },
  })
  const seedFiles = {
    [baseline]: bytes,
    [alias]: bytes,
    [`${prefix}/check.txt`]: 'exit: 1\noriginal failure\n',
    [`${prefix}/capture.log`]: 'argv: fixed historical command\n',
    [`${prefix}/capture.raw`]: 'unmodified capture\n',
    'docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/fullsuite.raw':
      'first exact legacy task capture\n',
    'docs/ops/tasks/evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1/directed-adjacent.raw':
      'second exact legacy task capture\n',
  }
  const f = fixture(t, { seedFiles: { ...seedFiles, [receipt]: native } })
  const rows = Object.entries(seedFiles).map(([path, value]) => ({
    path,
    sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
      cwd: f.root,
      encoding: 'utf8',
    }).trim(),
    sha256: hash(value),
    bytes: Buffer.byteLength(value),
  }))
  const packed = gzipSync(bytes)
  const stored = `${currentDocumentPath(baseline)}.gz`
  f.write(stored, packed)
  for (const path of [baseline, alias]) rmSync(join(f.root, currentDocumentPath(path)))
  f.manifest.compressedArtifacts = [
    {
      ...rows[0],
      stored,
      codec: 'gzip',
      storedBytes: packed.length,
      storedSha256: hash(packed),
    },
  ]
  f.manifest.artifactAliases = [
    {
      ...rows[1],
      retained: baseline,
      receipt,
      pointer: '/finalReplay/phase/identity/artifact',
    },
  ]
  const retained = loadDocumentLocations(f.root, f.save())
  assert.deepEqual(retained.readBuffer(alias), bytes)
  retained.assertUnchanged()
  f.manifest.retiredArtifacts = rows
  assert.throws(
    () => loadDocumentLocations(f.root, f.save()),
    /overlaps another document or artifact disposition/u,
  )
  f.manifest.compressedArtifacts = []
  f.manifest.artifactAliases = []
  rmSync(join(f.root, stored))
  for (const { path } of rows.slice(2)) rmSync(join(f.root, currentDocumentPath(path)))
  const admission = f.save()
  const retired = loadDocumentLocations(f.root, admission)
  assert.equal(retired.readBuffer(alias), undefined)
  assert.equal(retired.readBuffer(baseline), undefined)
  assert.deepEqual(retired.sourceBuffer(alias), bytes)
  assert.equal(retired.read(receipt), native)
  retired.assertUnchanged()
  f.write(stored, packed)
  assert.throws(() => retired.assertUnchanged(), /unclassified addition or missing original/u)
  rmSync(join(f.root, stored))
  f.write(currentDocumentPath(baseline), bytes)
  assert.throws(() => retired.assertUnchanged(), /retired physical carrier reappeared/u)
  rmSync(join(f.root, currentDocumentPath(baseline)))
  retired.assertUnchanged()
})

test('historical text admission does not widen the two exact legacy task capture paths', (t) => {
  const paths = [
    'docs/ops/tasks/evidence/OTHER/capture.raw',
    'docs/ops/tasks/evidence/TEST-GLM-EDITOR-CONTROL-FORM-RESIDUAL-1/other.raw',
    'docs/ops/tasks/evidence/TEST-GLM-EDITOR-ASSET-LIFECYCLE-1/directed-adjacent.txt',
    'docs/ops/archive/capture.log',
    'docs/testing/archive/legacy/unresolved-tools/capture.txt',
  ]
  const bytes = 'fixed capture\n'
  const f = fixture(t, { seedFiles: Object.fromEntries(paths.map((path) => [path, bytes])) })
  for (const path of paths) {
    f.manifest.retiredArtifacts = [
      {
        path,
        sourceBlob: execFileSync('git', ['rev-parse', `HEAD:${path}`], {
          cwd: f.root,
          encoding: 'utf8',
        }).trim(),
        sha256: hash(bytes),
        bytes: Buffer.byteLength(bytes),
      },
    ]
    assert.throws(
      () => loadDocumentLocations(f.root, f.save()),
      /only declared historical gzip attachments/u,
      path,
    )
  }
})

test('admitted testing source bridges retain publication bytes and recheck source drift', (t) => {
  const path = 'docs/testing/catalog.json'
  const source = 'packages/game/src/core/inventory-state.ts'
  const beforeSource = 'export const count = 1\n'
  const afterSource = 'export const count = 2\n'
  const reference = {
    path: source,
    lines: '1',
    anchor: 'export const count',
    role: 'owner',
    sha256: hash(beforeSource),
  }
  const before = {
    schemaVersion: 2,
    entries: [
      {
        id: 'phase1-dependency-ownership',
        status: 'current',
        sourceRefs: [reference],
        revision: { currentSha: '1'.repeat(40), history: [] },
      },
    ],
  }
  const beforeBytes = `${JSON.stringify(before)}\n`
  const f = fixture(t, {
    seedFiles: {
      [path]: beforeBytes,
      [source]: beforeSource,
      'docs/tasks/evidence/QUALITY-PHASE1-PENDING-93-1/README.md': '# Source bridge receipt\n',
    },
  })
  const current = structuredClone(before)
  current.entries[0].sourceRefs[0].sha256 = hash(afterSource)
  current.entries[0].revision.history.push({
    date: '2026-11-05',
    action: 'source-reference-bridge',
    base: f.admission.baseRevision,
    previousSourceRefs: [reference],
    scope: 'Source identity only; publication remains current.',
    evidence: 'docs/tasks/evidence/QUALITY-PHASE1-PENDING-93-1/README.md',
  })
  const currentBytes = `${JSON.stringify(current)}\n`
  f.write(source, afterSource)
  f.write(path, currentBytes)
  f.manifest.documents.push({
    path,
    mode: 'testing-source-bridge',
    afterSha256: hash(currentBytes),
    review: {
      author: 'Author',
      reviewer: 'Independent reviewer',
      date: '2026-11-05',
      conclusion: 'Only the declared source binding changes; execution facts are preserved.',
      reviewedLines: 2,
    },
  })
  const locations = loadDocumentLocations(f.root, f.save())
  assert.deepEqual(locations.assertCurrent(path).current, Buffer.from(currentBytes))
  assert.deepEqual(locations.sourceBuffer(path), Buffer.from(beforeBytes))
  locations.assertUnchanged()
  f.write(source, 'export const count = 3\n')
  assert.throws(() => locations.assertUnchanged(), /sourceRef hash mismatch/)
})

test('catalog source bridge composes the exact accepted maintenance Git layer without borrowing execution credit', (t) => {
  const path = 'docs/testing/catalog.json'
  const repository = fileURLToPath(new URL('../../', import.meta.url))
  const fixed = (revision, path) =>
    execFileSync('git', ['show', `${revision}:${path}`], { cwd: repository })
  const featureRevision = '98628aa7593a2d0867cb85b1d08f2be694e047d3'
  const mainRevision = 'c56192d8b388b8c1b677bb547895b89cea249475'
  const before = fixed('159cd0e2f8753536800ba4635e896020a897fddc', path)
  const maintained = fixed(featureRevision, path)
  const current = JSON.parse(maintained)
  const main = JSON.parse(fixed(mainRevision, path))
  const maintenanceIds = new Set(['e2e-001', 'e2e-common-issues'])
  const bridgeIds = new Set([
    'phase1-dependency-ownership',
    'game-script-corrections',
    'game-input-rotation',
  ])
  const seedFiles = { [path]: before }
  for (const entry of current.entries) {
    if (!maintenanceIds.has(entry.id)) continue
    for (const reference of entry.sourceRefs)
      seedFiles[reference.path] = fixed(featureRevision, reference.path)
  }
  for (const entry of main.entries) {
    if (!bridgeIds.has(entry.id)) continue
    current.entries[current.entries.findIndex((old) => old.id === entry.id)] = entry
    for (const reference of entry.sourceRefs)
      seedFiles[reference.path] = fixed(mainRevision, reference.path)
    const evidence = entry.revision.history.at(-1).evidence
    seedFiles[evidence] = fixed(mainRevision, evidence)
  }
  const f = fixture(t, { seedFiles })
  f.write(path, maintained)
  const git = (...args) => execFileSync('git', args, { cwd: f.root, encoding: 'utf8' }).trim()
  git('add', '-f', path)
  git(
    '-c',
    'user.name=Fixture',
    '-c',
    'user.email=fixture@example.invalid',
    'commit',
    '-qm',
    'maintained catalog',
  )
  const maintenanceRevision = git('rev-parse', 'HEAD')
  const currentBytes = `${JSON.stringify(current)}\n`
  f.write(path, currentBytes)
  const row = {
    path,
    mode: 'testing-source-bridge',
    afterSha256: hash(currentBytes),
    review: {
      author: 'Author',
      reviewer: 'Independent reviewer',
      date: '2026-11-05',
      conclusion: 'Each exact source maintenance layer retains its own checked boundary.',
      reviewedLines: 2,
    },
  }
  f.manifest.documents.push(row)
  const admission = () => ({
    ...f.save(),
    testingCatalogMaintenanceRevision: maintenanceRevision,
  })
  const locations = loadDocumentLocations(f.root, admission())
  assert.deepEqual(locations.assertCurrent(path).current, Buffer.from(currentBytes))
  assert.deepEqual(locations.assertCurrent(path).previous, before)
  assert.deepEqual(locations.sourceBuffer(path), before)
  locations.assertUnchanged()
  assert.throws(
    () => loadDocumentLocations(f.root, f.save()),
    /catalog ID\/order outside admitted bridge/,
  )
  assert.throws(
    () =>
      loadDocumentLocations(f.root, { ...admission(), testingCatalogMaintenanceRevision: 'HEAD' }),
    /fixed catalog maintenance revision required/,
  )
  assert.throws(
    () =>
      loadDocumentLocations(f.root, {
        ...admission(),
        testingCatalogMaintenanceRevision: f.admission.baseRevision,
      }),
    /testing source maintenance:/,
  )
  for (const source of [
    'scripts/e2e/opening-trace-plugin.mjs',
    'scripts/e2e/opening-trace.test.mjs',
    'packages/game/src/core/inventory-state.ts',
  ]) {
    f.write(source, Buffer.concat([seedFiles[source], Buffer.from('\n// drift\n')]))
    assert.throws(() => locations.assertUnchanged(), /source bytes differ|sourceRef hash mismatch/)
    f.write(source, seedFiles[source])
  }
  const executionClaim = structuredClone(current)
  executionClaim._governance.runtimeExecutionPerformed = true
  const tampered = `${JSON.stringify(executionClaim)}\n`
  f.write(path, tampered)
  row.afterSha256 = hash(tampered)
  assert.throws(
    () => loadDocumentLocations(f.root, admission()),
    /bridge changed publication, execution or unrelated native facts/,
  )
  f.write(path, currentBytes)
  row.afterSha256 = hash(currentBytes)
  loadDocumentLocations(f.root, admission()).assertUnchanged()
})
