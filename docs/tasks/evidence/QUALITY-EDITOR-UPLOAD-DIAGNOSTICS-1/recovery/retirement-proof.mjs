import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { mkdtempSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { basename, dirname, join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync, gzipSync } from 'node:zlib'

const out = dirname(fileURLToPath(import.meta.url))
const root = resolve(out, '../../../../..')
const base = join(root, 'packages/editor/src/ui')
const tests = ['01', '02', '07'].map((n) => `SpriteUploadWizard.c03-g${n}.cursor-r1.test.tsx`)
const file = `packages/editor/src/ui/${tests[2]}`
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const native = {}
const receipts = []
const temporary = mkdtempSync(join(tmpdir(), 'type-pal-c10-list-'))
try {
  for (const phase of ['initial', 'before', 'after']) {
    const copies = []
    const paths = tests.map((test) => {
      if (phase === 'after') return join(base, test)
      const path = join(base, `pre94-c10-list-${phase}-${test}`)
      writeFileSync(path, gunzipSync(readFileSync(join(out, `${phase}-${test}.gz`))))
      copies.push(path)
      return path
    })
    try {
      const report = join(temporary, `${phase}.json`)
      const command = [
        'pnpm',
        '--filter',
        '@type-pal/editor',
        'exec',
        'vitest',
        'list',
        ...paths.map((path) => `src/ui/${basename(path)}`),
        `--json=${report}`,
      ]
      const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8' })
      assert.equal(result.status, 0)
      assert.equal(result.signal, null)
      assert.equal(result.error, undefined)
      const bytes = readFileSync(report)
      const identities = JSON.parse(bytes)
        .map(
          (row) =>
            `${relative(root, row.file.replace(`/pre94-c10-list-${phase}-`, '/'))} :: project root :: ${row.name}`,
        )
        .sort((a, b) => a.localeCompare(b))
      const own = identities.filter((id) => id.startsWith(`${file} ::`))
      native[phase] = {
        identities,
        fileEntry: { file, testCount: own.length, identityDigest: sha(JSON.stringify(own)) },
      }
      receipts.push({
        phase,
        command,
        cwd: root,
        exit: result.status,
        signal: result.signal,
        rawSha256: sha(result.stdout + result.stderr),
        nativeSha256: sha(bytes),
        copySha256: Object.fromEntries(
          copies.map((p) => [relative(root, p), sha(readFileSync(p))]),
        ),
      })
      writeFileSync(join(out, `${phase}-list.raw.gz`), gzipSync(result.stdout + result.stderr))
      writeFileSync(join(out, `${phase}-list.json.gz`), gzipSync(bytes))
    } finally {
      for (const path of copies) unlinkSync(path)
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
assert.deepEqual(native.initial, native.before)
assert.equal(native.before.identities.length, 30)
assert.equal(native.after.identities.length, 28)
assert.equal(native.before.fileEntry.testCount, 10)
assert.equal(native.after.fileEntry.testCount, 8)
const snapshots = []
for (const ref of [
  'd261e1d17a41594f80f08a225ad4d2bbab75a932',
  'f98d0ddd89ebdee7b04502ee35de26ee82c6d246',
  'd4cf7f57d',
]) {
  const bytes = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root })
  assert.equal(sha(bytes), sha(gunzipSync(readFileSync(join(out, `initial-${tests[2]}.gz`)))))
  const baseline = JSON.parse(
    execFileSync('git', ['show', `${ref}:scripts/coverage/baseline.fast.json`], {
      cwd: root,
      encoding: 'utf8',
    }),
  )
  const entries = []
  function visit(value) {
    if (Array.isArray(value)) return value.forEach(visit)
    if (value && typeof value === 'object') {
      if (value.file === file) entries.push(value)
      Object.values(value).forEach(visit)
    }
  }
  visit(baseline)
  assert.deepEqual(entries, [native.before.fileEntry])
  snapshots.push({
    revision: execFileSync('git', ['rev-parse', ref], { cwd: root, encoding: 'utf8' }).trim(),
    fileSha256: sha(bytes),
    fileEntry: entries[0],
  })
}
const approval = {
  file,
  previous: 10,
  current: 8,
  previousIdentityDigest: native.before.fileEntry.identityDigest,
  currentIdentityDigest: native.after.fileEntry.identityDigest,
  fileSha256: sha(readFileSync(join(root, file))),
}
const input = {
  removal: { kind: 'test-count', value: file, previous: 10, current: 8 },
  previous: native.before.fileEntry,
  current: native.after.fileEntry,
  fileSha256: approval.fileSha256,
}
const support = join(root, 'scripts/coverage/approved-test-retirements.mjs')
const previousBytes = readFileSync(support, 'utf8')
const previous = await import(
  `data:text/javascript;base64,${Buffer.from(previousBytes).toString('base64')}`
)
assert.equal(previous.isApprovedTestRetirement(input), false)
const marker = '  ].map((entry) => Object.freeze(entry)),'
assert.equal(previousBytes.split(marker).length, 2)
const entry = `    // Codex C10: G07-03/09 weak subsets transfer to G07-02/04.\n    ${JSON.stringify(approval, null, 2).replaceAll('\n', '\n    ')},\n`
writeFileSync(support, previousBytes.replace(marker, entry + marker))
const current = await import(
  `data:text/javascript;base64,${readFileSync(support).toString('base64')}`
)
assert.equal(current.isApprovedTestRetirement(input), true)
assert.equal(current.isApprovedTestRetirement({ ...input, fileSha256: 'drift' }), false)
assert.equal(
  current.isApprovedTestRetirement({ ...input, removal: { ...input.removal, current: 7 } }),
  false,
)
assert.equal(
  current.isApprovedTestRetirement({
    ...input,
    current: { ...input.current, identityDigest: 'drift' },
  }),
  false,
)
assert.deepEqual(current.approvedTestRetirements.slice(0, -1), previous.approvedTestRetirements)
assert.equal(
  current.isApprovedTestRetirement.toString(),
  previous.isApprovedTestRetirement.toString(),
)
assert.equal(current.approvedTestRetirements.length, 27)
assert.equal(
  current.approvedTestRetirements.reduce((n, e) => n + e.previous - e.current, 0),
  62,
)
const testPath = join(root, 'scripts/coverage/approved-test-retirements.test.mjs')
const testBytes = readFileSync(testPath, 'utf8')
writeFileSync(
  testPath,
  testBytes
    .replace('length, 26)', 'length, 27)')
    .replace('size, 26)', 'size, 27)')
    .replace('    60,', '    62,')
    .replace('C1精简一条同输入BALL弱重复。', 'C1精简一条同输入BALL弱重复；C10合并G07两弱子集。'),
)
writeFileSync(
  join(out, 'retirement.json'),
  `${JSON.stringify(
    {
      approval,
      input,
      native,
      receipts,
      snapshots,
      removedIdentities: native.before.identities.filter(
        (id) => !native.after.identities.includes(id),
      ),
      addedIdentities: native.after.identities.filter(
        (id) => !native.before.identities.includes(id),
      ),
      rejectedBeforeRegistration: true,
      acceptedAfterRegistration: true,
      sourceDriftRejected: true,
      extraRemovalRejected: true,
      identityDriftRejected: true,
      other26RowsAndMatcherUnchanged: true,
    },
    null,
    2,
  )}\n`,
)
console.log(JSON.stringify(approval))
