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
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const tests = [
  'resources/parsers/ball.glm-runtime-resource.test.ts',
  'resources/misc-guards.kimi-r1.test.ts',
]
const base = join(root, 'packages/pal-extract/src')
const file = `packages/pal-extract/src/${tests[0]}`
const native = {}
const receipts = []
const temporary = mkdtempSync(join(tmpdir(), 'type-pal-c1-list-'))
try {
  for (const phase of ['before', 'after']) {
    const copies = []
    const paths = tests.map((name) => {
      if (phase === 'after') return join(base, name)
      const path = join(base, dirname(name), `pre94-c1-list-${basename(name)}`)
      writeFileSync(path, gunzipSync(readFileSync(join(out, `${basename(name)}.before.gz`))))
      copies.push(path)
      return path
    })
    try {
      const report = join(temporary, `${phase}.json`)
      const command = [
        'pnpm',
        '--filter',
        '@type-pal/pal-extract',
        'exec',
        'vitest',
        'list',
        ...paths.map((p) => `src/${relative(base, p)}`),
        `--json=${report}`,
      ]
      const result = spawnSync(command[0], command.slice(1), { cwd: root, encoding: 'utf8' })
      const raw = result.stdout + result.stderr
      assert.equal(result.status, 0)
      assert.equal(result.signal, null)
      assert.equal(result.error, undefined)
      const bytes = readFileSync(report)
      const rows = JSON.parse(bytes)
      const identities = rows
        .map(
          (row) =>
            relative(root, row.file.replace('/pre94-c1-list-', '/')) +
            ' :: project root :: ' +
            row.name,
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
        rawSha256: sha(raw),
        nativeSha256: sha(bytes),
        copySha256: Object.fromEntries(
          copies.map((p) => [relative(root, p), sha(readFileSync(p))]),
        ),
      })
      writeFileSync(join(out, `${phase}-list.raw.gz`), gzipSync(raw))
      writeFileSync(join(out, `${phase}-list.json.gz`), gzipSync(bytes))
    } finally {
      for (const path of copies) unlinkSync(path)
    }
  }
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
assert.equal(native.before.identities.length, 21)
assert.equal(native.after.identities.length, 20)
assert.equal(native.before.fileEntry.testCount, 5)
assert.equal(native.after.fileEntry.testCount, 4)
const previousSnapshots = []
for (const ref of ['HEAD', 'origin/main', 'd4cf7f57d']) {
  const bytes = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root })
  assert.equal(sha(bytes), sha(gunzipSync(readFileSync(join(out, `${basename(file)}.before.gz`)))))
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
  previousSnapshots.push({
    ref,
    revision: execFileSync('git', ['rev-parse', ref], { cwd: root, encoding: 'utf8' }).trim(),
    fileSha256: sha(bytes),
    fileEntry: entries[0],
  })
}
const approval = {
  file,
  previous: 5,
  current: 4,
  previousIdentityDigest: native.before.fileEntry.identityDigest,
  currentIdentityDigest: native.after.fileEntry.identityDigest,
  fileSha256: sha(readFileSync(join(root, file))),
}
const input = {
  removal: { kind: 'test-count', value: file, previous: 5, current: 4 },
  previous: native.before.fileEntry,
  current: native.after.fileEntry,
  fileSha256: approval.fileSha256,
}
const supportPath = join(root, 'scripts/coverage/approved-test-retirements.mjs')
const before = readFileSync(supportPath, 'utf8')
const old = await import(`data:text/javascript;base64,${Buffer.from(before).toString('base64')}`)
assert.equal(old.isApprovedTestRetirement(input), false)
const marker = '  ].map((entry) => Object.freeze(entry)),'
assert.equal(before.split(marker).length, 2)
const entry =
  '    // Codex C1: exact duplicate bare-prefix case transfers to the full PNG oracle.\n    ' +
  JSON.stringify(approval, null, 2).replaceAll('\n', '\n    ') +
  ',\n'
writeFileSync(supportPath, before.replace(marker, entry + marker))
const now = await import(
  `data:text/javascript;base64,${readFileSync(supportPath).toString('base64')}`
)
assert.equal(now.isApprovedTestRetirement(input), true)
assert.equal(now.isApprovedTestRetirement({ ...input, fileSha256: 'drift' }), false)
assert.equal(
  now.isApprovedTestRetirement({ ...input, removal: { ...input.removal, current: 3 } }),
  false,
)
assert.deepEqual(now.approvedTestRetirements.slice(0, -1), old.approvedTestRetirements)
assert.equal(now.isApprovedTestRetirement.toString(), old.isApprovedTestRetirement.toString())
assert.equal(now.approvedTestRetirements.length, 26)
assert.equal(
  now.approvedTestRetirements.reduce((n, e) => n + e.previous - e.current, 0),
  60,
)
const testPath = join(root, 'scripts/coverage/approved-test-retirements.test.mjs')
let test = readFileSync(testPath, 'utf8')
test = test
  .replace('length, 25)', 'length, 26)')
  .replace('size, 25)', 'size, 26)')
  .replace('    59,', '    60,')
test = test.replace(
  'CODE3主文件转移3条注释合同。',
  'CODE3主文件转移3条注释合同；C1精简一条同输入BALL弱重复。',
)
writeFileSync(testPath, test)
writeFileSync(
  join(out, 'retirement.json'),
  `${JSON.stringify(
    {
      baseCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
        cwd: root,
        encoding: 'utf8',
      }).trim(),
      approval,
      input,
      native,
      receipts,
      previousSnapshots,
      removedIdentities: native.before.identities.filter(
        (id) => !native.after.identities.includes(id),
      ),
      addedIdentities: native.after.identities.filter(
        (id) => !native.before.identities.includes(id),
      ),
      rejectedBeforeRegistration: true,
      acceptedAfterRegistration: true,
      byteDriftRejected: true,
      extraRemovalRejected: true,
      matcherAndOther25RowsUnchanged: true,
    },
    null,
    2,
  )}\n`,
)
console.log(JSON.stringify(approval))
