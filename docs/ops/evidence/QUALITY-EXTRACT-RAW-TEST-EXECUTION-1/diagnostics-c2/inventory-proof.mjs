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
  'resources/tables.test.ts',
  'resources/parsers/__tests__/enemy-teams.boundaries.test.ts',
]
const base = join(root, 'packages/pal-extract/src')
const native = {}
const receipts = []
const temporary = mkdtempSync(join(tmpdir(), 'type-pal-c2-list-'))
try {
  for (const phase of ['before', 'after']) {
    const copies = []
    const paths = tests.map((name) => {
      if (phase === 'after') return join(base, name)
      const path = join(base, dirname(name), `pre94-c2-list-${basename(name)}`)
      writeFileSync(path, gunzipSync(readFileSync(join(out, `before-${basename(name)}.gz`))))
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
      assert.equal(result.status, 0)
      assert.equal(result.signal, null)
      assert.equal(result.error, undefined)
      const bytes = readFileSync(report)
      const identities = JSON.parse(bytes)
        .map(
          (row) =>
            `${relative(root, row.file.replace('/pre94-c2-list-', '/'))} :: project root :: ${row.name}`,
        )
        .sort((a, b) => a.localeCompare(b))
      native[phase] = { identities, identityDigest: sha(JSON.stringify(identities)) }
      receipts.push({
        phase,
        command,
        cwd: root,
        exit: result.status,
        signal: result.signal,
        rawSha256: sha(result.stdout + result.stderr),
        nativeSha256: sha(bytes),
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
assert.equal(native.before.identities.length, 92)
assert.equal(native.after.identities.length, 92)
const file = `packages/pal-extract/src/${tests[0]}`
const snapshots = []
for (const ref of [
  '3bcdaadc3fd173ebd735e396f6147b4c6bc64b13',
  'f98d0ddd89ebdee7b04502ee35de26ee82c6d246',
  'd4cf7f57d',
]) {
  const bytes = execFileSync('git', ['show', `${ref}:${file}`], { cwd: root })
  assert.equal(sha(bytes), sha(gunzipSync(readFileSync(join(out, 'before-tables.test.ts.gz')))))
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
  assert.deepEqual(entries, [])
  snapshots.push({
    revision: execFileSync('git', ['rev-parse', ref], { cwd: root, encoding: 'utf8' }).trim(),
    fileSha256: sha(bytes),
    fastEntries: entries,
  })
}
writeFileSync(
  join(out, 'inventory.json'),
  `${JSON.stringify(
    {
      native,
      receipts,
      snapshots,
      removedIdentities: native.before.identities.filter(
        (id) => !native.after.identities.includes(id),
      ),
      addedIdentities: native.after.identities.filter(
        (id) => !native.before.identities.includes(id),
      ),
      noNewRetirementApproval: true,
    },
    null,
    2,
  )}\n`,
)
console.log(
  'Native 92→92; tables90→89/P07 2→3; tables already excluded from all three fast snapshots.',
)
