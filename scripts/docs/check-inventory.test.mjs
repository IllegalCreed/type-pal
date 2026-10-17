import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { test } from 'node:test'
import { auditDocuments, checkoutTargets, renderTaskIndex } from './check.mjs'

function fixture(t) {
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-docs-inventory-test-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const root = join(directory, 'checkout')
  const spool = join(directory, 'spool')
  mkdirSync(root)
  mkdirSync(spool)
  return { root, spool }
}

function collect(root, spool, env = {}) {
  const output = join(spool, '..', 'collected.json')
  rmSync(output, { force: true })
  const result = spawnSync(
    process.execPath,
    [
      '--input-type=module',
      '--eval',
      `import { writeFileSync } from 'node:fs';
       import { checkoutFiles } from ${JSON.stringify(new URL('./check.mjs', import.meta.url).href)};
       writeFileSync(process.argv[2], JSON.stringify(checkoutFiles(process.argv[1])));`,
      root,
      output,
    ],
    { encoding: 'utf8', env: { ...process.env, TMPDIR: spool, ...env } },
  )
  return {
    ...result,
    files: existsSync(output) ? JSON.parse(readFileSync(output, 'utf8')) : undefined,
  }
}

test('real Git census exceeds 1 MiB without losing tail, NUL-delimited Unicode or checkout navigation', (t) => {
  const { root, spool } = fixture(t)
  const git = (args) => execFileSync('git', args, { cwd: root })
  const write = (file, text = '') => {
    mkdirSync(dirname(join(root, file)), { recursive: true })
    writeFileSync(join(root, file), text)
  }
  git(['init', '--quiet'])
  const tracked = ['tracked-ignored.bin', 'deleted.md', 'zz-tail-空 格😀\t换\n行"\\.md']
  for (const file of tracked) write(file)
  git(['add', '--', ...tracked])
  unlinkSync(join(root, 'deleted.md'))
  write('.gitignore', 'ignored.bin\ntracked-ignored.bin\n')
  write('ignored.bin')
  const untracked = Array.from(
    { length: 4700 },
    (_, i) => `bulk/${String(i).padStart(4, '0')}-${'x'.repeat(220)}.bin`,
  )
  for (const file of untracked) write(file)
  // A target near the end of the untracked output must still drive navigation.
  const target = 'zz-untracked/末 尾😀.md'
  write(target)
  const navigation = new Map([
    ['README.md', `[docs](docs/README.md) [tail](${encodeURI(target)})`],
    ['docs/README.md', '[ops](ops/README.md)'],
    ['docs/ops/README.md', '[board](board.md) [tasks](tasks/README.md)'],
    ['docs/ops/board.md', '# Board'],
    ['docs/ops/tasks/README.md', '[index](index.md)'],
    ['docs/ops/tasks/index.md', renderTaskIndex([])],
  ])
  for (const [file, text] of navigation) write(file, text)
  const expectedRaw = [
    ...['.gitignore', ...untracked, target, ...navigation.keys()].sort(),
    ...tracked.toSorted(),
  ]
  const rawBytes = Buffer.byteLength(`${expectedRaw.join('\0')}\0`)
  assert.ok(rawBytes > 1024 * 1024)
  const result = collect(root, spool)
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, result.stderr)
  const files = result.files
  assert.deepEqual(
    files,
    expectedRaw.filter((file) => file !== 'deleted.md'),
  )
  assert.deepEqual(readdirSync(spool), [])
  const available = checkoutTargets(files)
  assert.ok(available.has('zz-untracked'))
  assert.equal(available.has('ignored.bin'), false)
  assert.equal(available.has('deleted.md'), false)
  const documents = new Map(
    files
      .filter((file) => /\.md$/i.test(file))
      .map((file) => [file, readFileSync(join(root, file), 'utf8')]),
  )
  const audit = () =>
    auditDocuments({
      documents,
      exists: (file) => available.has(file) && existsSync(join(root, file)),
      expectedVersions: { content: 22, save: 12 },
      sectionRules: [],
      exceptions: [],
    })
  assert.deepEqual(audit().issues, [])
  unlinkSync(join(root, target))
  const broken = audit().issues
  assert.equal(broken.length, 1)
  assert.equal(broken[0].file, 'README.md')
  assert.match(broken[0].message, /本地目标不存在/)
  t.diagnostic(
    JSON.stringify({
      gitStdoutBytes: rawBytes,
      retainedFiles: files.length,
      finalPath: files.at(-1),
      spoolEntries: readdirSync(spool),
    }),
  )
})

test('real Git failure and spawn failure throw instead of returning an empty successful census, and clean the spool', (t) => {
  const { root, spool } = fixture(t)
  writeFileSync(join(root, 'present.md'), '# Present')
  const failedGit = collect(root, spool)
  assert.equal(failedGit.error, undefined)
  assert.equal(failedGit.signal, null)
  assert.notEqual(failedGit.status, 0)
  assert.equal(failedGit.files, undefined)
  assert.equal(failedGit.stdout, '')
  assert.match(failedGit.stderr, /not a git repository/)
  assert.deepEqual(readdirSync(spool), [])
  const absentGit = collect(root, spool, { PATH: spool })
  assert.equal(absentGit.error, undefined)
  assert.equal(absentGit.signal, null)
  assert.notEqual(absentGit.status, 0)
  assert.equal(absentGit.files, undefined)
  assert.equal(absentGit.stdout, '')
  assert.match(absentGit.stderr, /ENOENT/)
  assert.deepEqual(readdirSync(spool), [])
  execFileSync('git', ['init', '--quiet'], { cwd: root })
  unlinkSync(join(root, 'present.md'))
  const internalSpool = join(root, 'temporary')
  mkdirSync(internalSpool)
  const empty = collect(root, internalSpool)
  assert.equal(empty.status, 0, empty.stderr)
  assert.deepEqual(empty.files, [])
  assert.deepEqual(readdirSync(internalSpool), [])
})
