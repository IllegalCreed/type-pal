/** Wave K dispatch inventory. Read-only; generated coverage is only a historical lead. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const sha = (bytes) => createHash('sha256').update(bytes).digest('hex')
const gitShow = (revision, path) =>
  execFileSync('git', ['show', `${revision}:${path}`], { cwd: root })
const targets = readJson('docs/testing/archive/legacy/batches/glm-event-wave-k/targets.json')

assert.equal(targets.schemaVersion, 1)
assert.equal(targets.groups.length, 6)
assert.match(targets.source, /^packages\/game\/src\/core\/.+\.ts$/)
assert.equal(
  sha(gitShow(targets.productionFreeze, 'scripts/coverage/baseline.fast.json')),
  targets.baselineSha256,
  'dispatch baseline hash mismatch',
)
const frozenSource = gitShow(targets.productionFreeze, targets.source)
assert.equal(sha(frozenSource), targets.sourceSha256, 'frozen source hash mismatch')
assert.deepEqual(
  readFileSync(resolve(root, targets.source)),
  frozenSource,
  'source drifted from freeze',
)

const priorQueues = [
  'kimi-editor-workflows',
  'glm-leaf-workflows',
  'glm-runtime-resource-wave',
  'glm-phase1-leaves',
  'glm-large-wave',
  'glm-new-waves',
]
const priorSources = new Set()
function collectSources(value) {
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) collectSources(item)
    return
  }
  if (typeof value.source === 'string') priorSources.add(value.source)
  if (Array.isArray(value.sources)) {
    for (const source of value.sources) priorSources.add(source)
  }
  for (const item of Object.values(value)) collectSources(item)
}
for (const queue of priorQueues) collectSources(readJson(`docs/testing/${queue}/targets.json`))
assert.ok(!priorSources.has(targets.source), `${targets.source}: previous queue owns this source`)

const ids = new Set()
const tests = new Set()
for (const group of targets.groups) {
  assert.match(group.id, /^K0[1-6]$/)
  assert.ok(!ids.has(group.id), `duplicate group ${group.id}`)
  ids.add(group.id)
  assert.equal(
    group.test,
    targets.source.replace(/\.ts$/, `.glm-event-${group.id.toLowerCase()}.test.ts`),
  )
  assert.ok(!tests.has(group.test), `duplicate test ${group.test}`)
  tests.add(group.test)
  const occupied = spawnSync(
    'git',
    ['cat-file', '-e', `${targets.productionFreeze}:${group.test}`],
    {
      cwd: root,
      stdio: 'ignore',
    },
  )
  assert.ok(
    occupied.status !== null && occupied.status !== 0,
    `test occupied at dispatch: ${group.test}`,
  )
}
assert.equal(ids.size, 6)
console.log(
  JSON.stringify({
    campaign: targets.campaign,
    freeze: targets.productionFreeze,
    source: targets.source,
    sourceSha256: targets.sourceSha256,
    groups: ids.size,
    priorQueueOverlap: false,
  }),
)
