import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./code-quality-inventory.mjs', import.meta.url))
const root = fileURLToPath(new URL('../../', import.meta.url))

test('code-quality inventory emits deterministic scoped records with caller and category fields', () => {
  const run = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
  })
  assert.equal(run.status, 0, run.stderr)
  const inventory = JSON.parse(run.stdout)
  assert.equal(inventory.schemaVersion, 1)
  assert.match(inventory.base, /^[0-9a-f]{40}$/)
  assert.ok(inventory.records.length > 2000)

  const rle = inventory.records.find((record) => record.path === 'packages/shared/src/rle.ts')
  assert.deepEqual(
    {
      category: rle?.category,
      domain: rle?.domain,
      feature: rle?.feature,
    },
    { category: 'product', domain: '@type-pal/shared', feature: 'rle.ts' },
  )
  assert.ok(rle?.publicExports.includes('decodeRle'))
  assert.ok(
    rle?.productionCallers.includes('packages/game/src/assets/tileset-blob.test.ts') === false,
  )
  assert.ok(rle?.productionCallers.includes('packages/game/src/assets/tileset-blob.ts'))
  assert.ok(rle?.productionCallers.includes('packages/pal-extract/src/resources/sprite.ts'))
  assert.ok(rle?.productionCallers.every((caller) => !/\.test\.|__tests__/.test(caller)))

  const generated = inventory.records.find(
    (record) => record.path === 'packages/migrate/baselines/pal/content/scenes/s108.json',
  )
  assert.equal(generated?.category, 'generated')
  assert.equal(
    inventory.records.some((record) =>
      record.directDependencies.some((dependency) => /\n|\[/.test(dependency)),
    ),
    false,
  )
})
