/** F–J parallel wave inventory check; read-only and independent of generated coverage. */
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../..')
const readJson = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'))
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex')
const targets = readJson('docs/testing/archive/legacy/batches/glm-new-waves/targets.json')
const priorQueues = [
  'kimi-editor-workflows',
  'glm-leaf-workflows',
  'glm-runtime-resource-wave',
  'glm-phase1-leaves',
]
const priorSources = new Set(
  priorQueues.flatMap((directory) =>
    readJson(`docs/testing/${directory}/targets.json`).groups.flatMap((group) =>
      group.targets.map((target) => target.source),
    ),
  ),
)
const active = readJson('docs/testing/archive/legacy/batches/glm-large-wave/targets.json')
for (const batch of active.batches) {
  for (const group of batch.groups) {
    for (const source of group.sources) priorSources.add(source)
  }
}

assert.equal(targets.schemaVersion, 1)
assert.equal(targets.waves.length, 5)
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
for (const wave of targets.waves) {
  assert.equal(wave.groups.length, 6, `${wave.id}: expected six groups`)
  const sources = wave.groups.flatMap((group) => group.sources)
  assert.equal(sources.length, 12, `${wave.id}: expected twelve sources`)
  const rows = []
  for (const source of sources) {
    assert.match(source, /^packages\/(?:editor|reforge|game|migrate)\/src\/.+\.(?:ts|tsx)$/)
    assert.ok(!priorSources.has(source), `prior/active queue owns ${source}`)
    assert.ok(!seen.has(source), `duplicate source ${source}`)
    seen.add(source)

    const current = readFileSync(resolve(root, source))
    const frozen = execFileSync('git', ['show', `${targets.productionFreeze}:${source}`], {
      cwd: root,
    })
    assert.deepEqual(current, frozen, `${source}: product source drifted from freeze`)
    rows.push([source, digest(current)])

    const newTest = source.replace(/\.(ts|tsx)$/, '.glm-next-wave.test.$1')
    const occupiedAtDispatch = spawnSync(
      'git',
      ['cat-file', '-e', `${targets.productionFreeze}:${newTest}`],
      {
        cwd: root,
        stdio: 'ignore',
      },
    )
    assert.ok(
      occupiedAtDispatch.status !== null && occupiedAtDispatch.status !== 0,
      `new test path occupied at dispatch: ${newTest}`,
    )
  }
  rows.sort((left, right) => (left[0] < right[0] ? -1 : left[0] > right[0] ? 1 : 0))
  const actual = digest(`${rows.map(([source, sha]) => `${source}\0${sha}`).join('\n')}\n`)
  assert.equal(actual, wave.sourceDigestSha256, `${wave.id}: source digest mismatch`)
  summary.push({
    wave: wave.id,
    groups: wave.groups.length,
    sources: sources.length,
    digest: actual,
  })
}

assert.equal(seen.size, 60)
console.log(
  JSON.stringify({ freeze: targets.productionFreeze, totalSources: seen.size, summary }, null, 2),
)
