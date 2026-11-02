import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { cpSync, mkdtempSync, realpathSync, rmSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import { fileURLToPath } from 'node:url'
import { loadDocumentRegistry } from './document-registry.mjs'
import { saveDocumentRegistryFixture } from './document-registry.test-support.mjs'

const root = fileURLToPath(new URL('../../', import.meta.url))
const entry = (path) => ({
  path,
  phase: 'ops',
  docType: 'guide-runbook',
  templateId: 'guide-runbook-v1',
  templateCompliance: 'needs-migration',
  reviewStatus: 'partial-review-unknown',
  reviewRecord: 'fixture.json',
})
function fixture(t, paths) {
  const directory = realpathSync(mkdtempSync('/tmp/type-pal-registry-native-path-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const manifestPath = saveDocumentRegistryFixture(directory, paths.map(entry))
  cpSync(join(root, 'scripts/docs'), join(directory, 'scripts/docs'), { recursive: true })
  execFileSync('git', ['init', '-q'], { cwd: directory })
  return { directory, manifestPath }
}

test('canonical native paths retain distinct basenames, Unicode and interior spaces', (t) => {
  const paths = [
    'docs/ops/one.md',
    'docs/ops/中文 document.md',
    'docs/lore/reference.json',
    'docs/ops/emoji-\u{1f600}.md',
    'docs/ops/supplementary-\u{20000}.md',
  ]
  const f = fixture(t, paths)
  assert.deepEqual(
    loadDocumentRegistry(f).registry.entries.map((value) => value.path),
    paths,
  )
  for (const path of paths) assert.equal(Buffer.from(path, 'utf8').toString('utf8'), path)
})

const invalidPaths = [
  ['unpaired high surrogate', 'docs/ops/\ud800.md'],
  ['unpaired low surrogate', 'docs/ops/\udc00.md'],
  ['first parent segment', 'docs/../AGENTS.md'],
  ['first current-directory alias', 'docs/./ops/one.md'],
  ['middle current-directory alias', 'docs/ops/./one.md'],
  ['middle parent alias', 'docs/ops/../ops/one.md'],
  ['first empty segment', 'docs//ops/one.md'],
  ['middle empty segment', 'docs/ops//one.md'],
  ['backslash separator alias', 'docs/ops\\one.md'],
  ['leading segment whitespace', 'docs/ ops/one.md'],
  ['trailing segment whitespace', 'docs/ops /one.md'],
  ['trailing segment dot', 'docs/ops./one.md'],
  ['alternate data stream colon', 'docs/ops/one.md:stream.md'],
  ['control character', 'docs/ops/one\u0000.md'],
  ['line break', 'docs/ops/one\n.md'],
  ['rooted absolute path', '/docs/ops/one.md'],
]
for (const [label, path] of invalidPaths)
  test(`native document path IO rejects ${label} through loader and both real consumers`, (t) => {
    // Keep a real canonical counterpart so aliases cannot bypass path identity.
    const f = fixture(t, ['docs/ops/one.md', path])
    const expected = `document registry: unsafe document path: ${path}`
    const expectedStderr = Buffer.from(expected, 'utf8').toString('utf8')
    let loaderRejection
    try {
      loadDocumentRegistry(f)
    } catch (error) {
      loaderRejection = error.message
    }
    const results = ['check-content-review', 'report-governance-progress'].map((name) => {
      const result = spawnSync(process.execPath, [`scripts/docs/${name}.mjs`], {
        cwd: f.directory,
        encoding: 'utf8',
      })
      return {
        name,
        code: result.status,
        signal: result.signal,
        spawnError: result.error?.message,
        rejectedPath: result.stderr.includes(expectedStderr),
      }
    })
    assert.equal(loaderRejection, expected)
    assert.deepEqual(
      results,
      ['check-content-review', 'report-governance-progress'].map((name) => ({
        name,
        code: 1,
        signal: null,
        spawnError: undefined,
        rejectedPath: true,
      })),
    )
  })
