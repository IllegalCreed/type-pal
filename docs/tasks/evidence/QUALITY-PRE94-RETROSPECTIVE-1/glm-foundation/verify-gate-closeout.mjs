import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { gunzipSync } from 'node:zlib'

// Identity/integrity check only. Semantic judgments retain their named scope.
// No fetch, test/coverage execution, baseline refresh or filesystem writes.
const root = fileURLToPath(new URL('../../../../../', import.meta.url))
const args = process.argv.slice(2)
assert(
  args.length === 0 || (args.length === 2 && args[0] === '--receipt'),
  'usage: node verify-gate-closeout.mjs [--receipt PATH]',
)
const receiptPath = args.length
  ? resolve(args[1])
  : fileURLToPath(new URL('gate-closeout.json', import.meta.url))
const packet = JSON.parse(readFileSync(receiptPath, 'utf8'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (args) =>
  execFileSync('git', args, {
    cwd: root,
    env: { ...process.env, GIT_OPTIONAL_LOCKS: '0' },
    maxBuffer: 16 * 1024 * 1024,
    encoding: 'utf8',
  })
// Excluding the two receipt outputs prevents self-hashing. Everything else
// tracked, including callers, tests, configuration and docs, remains bound.
const prefix = 'docs/ops/evidence/QUALITY-PRE94-RETROSPECTIVE-1/glm-foundation'
const excluded = new Set([`${prefix}/gate-closeout.json`, `${prefix}/gate-closeout-native.json.gz`])
assert.deepEqual(
  packet.repositoryScope.excluded,
  [...excluded],
  'receipt may not narrow repository scope',
)
const entries = git(['ls-files', '--stage', '-z'])
  .split('\0')
  .filter((entry) => entry && !excluded.has(entry.slice(entry.indexOf('\t') + 1)))
assert.equal(
  digest(entries.join('\0')),
  packet.repositoryScope.sha256,
  'stale repository scope: tracked source/test/config/document snapshot changed',
)
assert.equal(entries.length, packet.repositoryScope.entries, 'repository scope count differs')
for (const args of [
  ['diff', '--name-only', '-z'],
  ['ls-files', '--others', '--exclude-standard', '-z'],
]) {
  const changed = git(args)
    .split('\0')
    .filter((path) => path && !excluded.has(path))
  assert.deepEqual(changed, [], 'unfrozen changes outside the receipt outputs')
}
assert.equal(process.version, packet.toolVersions.node, 'stale Node runtime version')
for (const [name, expected] of Object.entries(packet.toolVersions.installed)) {
  const actual = JSON.parse(
    readFileSync(resolve(root, 'node_modules', name, 'package.json'), 'utf8'),
  )
  assert.equal(actual.version, expected, `stale installed tool version: ${name}`)
}
for (const binding of packet.bindings) {
  assert.equal(
    digest(readFileSync(resolve(root, binding.path))),
    binding.sha256,
    `stale binding: ${binding.path}`,
  )
}
const compressed = readFileSync(resolve(root, packet.artifact.path))
assert.equal(digest(compressed), packet.artifact.sha256, 'raw archive SHA mismatch')
const { members } = JSON.parse(gunzipSync(compressed))
for (const member of packet.artifact.members) {
  assert.equal(typeof members[member.name], 'string', `missing raw: ${member.name}`)
  assert.equal(digest(members[member.name]), member.sha256, `raw SHA mismatch: ${member.name}`)
  assert.equal(
    Buffer.byteLength(members[member.name]),
    member.bytes,
    `raw bytes mismatch: ${member.name}`,
  )
}
for (const id of packet.finalGateIds) {
  const gate = packet.checks.find((entry) => entry.id === id)
  assert(gate, `missing gate: ${id}`)
  assert.deepEqual(
    gate,
    JSON.parse(members[`${id}.execution.json`]),
    `execution receipt differs: ${id}`,
  )
  for (const stream of ['stdout', 'stderr']) {
    const body = members[`${id}.${stream}.raw`]
    assert.equal(digest(body), gate[stream].sha256, `execution stream differs: ${id}/${stream}`)
    assert.equal(
      Buffer.byteLength(body),
      gate[stream].bytes,
      `execution stream bytes differ: ${id}/${stream}`,
    )
  }
  assert.equal(gate.exit, 0, `failed gate: ${id}`)
  assert.equal(gate.signal, null, `signalled gate: ${id}`)
}
assert.equal(packet.status, 'gates-passed', 'gate closeout still incomplete')
assert.deepEqual(packet.diagnostics, {
  error: 0,
  warning: 0,
  info: 0,
  reactAct: 0,
  actEnvironment: 0,
  testStderrBlocks: 0,
})
console.log(
  JSON.stringify({
    status: 'matched',
    bindings: packet.bindings.length,
    rawMembers: packet.artifact.members.length,
    gates: packet.finalGateIds,
    limits: 'Identity/integrity only; no new source-quality, browser/E2E or visual acceptance.',
  }),
)
