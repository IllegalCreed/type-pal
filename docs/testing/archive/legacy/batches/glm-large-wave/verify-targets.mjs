/** TEST-GLM-LARGE-WAVE-4 · read-only dispatch inventory check. */
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const targets = readJson('docs/testing/archive/legacy/batches/glm-large-wave/targets.json')
const oldQueues = [
  'kimi-editor-workflows',
  'glm-leaf-workflows',
  'glm-runtime-resource-wave',
  'glm-phase1-leaves',
]
const priorSources = new Set(
  oldQueues.flatMap((directory) =>
    readJson(`docs/testing/${directory}/targets.json`).groups.flatMap((group) =>
      group.targets.map((target) => target.source),
    ),
  ),
)
const priorTests = new Set(
  oldQueues.flatMap((directory) =>
    readJson(`docs/testing/${directory}/targets.json`).groups.flatMap((group) =>
      group.targets.map((target) => target.newTest),
    ),
  ),
)

assert.equal(targets.schemaVersion, 1)
assert.equal(targets.batches.length, 5)
assert.equal(
  digest(
    execFileSync(
      'git',
      ['show', `${targets.productionFreeze}:scripts/coverage/baseline.fast.json`],
      {
        cwd: root,
      },
    ),
  ),
  targets.baselineSha256,
  'dispatch freeze baseline hash mismatch',
)

const seen = new Set()
const summary = []
for (const batch of targets.batches) {
  assert.equal(batch.groups.length, 6, `${batch.id}: expected six bounded groups`)
  const sources = batch.groups.flatMap((group) => group.sources)
  assert.equal(sources.length, 12, `${batch.id}: expected twelve source targets`)
  const rows = []
  for (const source of sources) {
    assert.match(source, /^packages\/(?:editor|content|reforge|migrate)\/src\/.+\.(?:ts|tsx)$/)
    assert.ok(!seen.has(source), `duplicate target: ${source}`)
    assert.ok(!priorSources.has(source), `prior accepted target: ${source}`)
    seen.add(source)

    const current = readFileSync(resolve(root, source))
    const frozen = execFileSync('git', ['show', `${targets.productionFreeze}:${source}`], {
      cwd: root,
    })
    assert.deepEqual(current, frozen, `${source}: source changed since production freeze`)
    rows.push([source, digest(current)])

    const newTest = source.replace(/\.(ts|tsx)$/, '.glm-large-wave.test.$1')
    assert.ok(!priorTests.has(newTest), `prior queue owns test path: ${newTest}`)
  }
  rows.sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
  const actual = digest(`${rows.map(([source, sha]) => `${source}\0${sha}`).join('\n')}\n`)
  assert.equal(actual, batch.sourceDigestSha256, `${batch.id}: source digest mismatch`)
  summary.push({
    batch: batch.id,
    groups: batch.groups.length,
    sources: sources.length,
    digest: actual,
  })
}

assert.equal(seen.size, 60)
console.log(
  JSON.stringify({ freeze: targets.productionFreeze, totalSources: seen.size, summary }, null, 2),
)
