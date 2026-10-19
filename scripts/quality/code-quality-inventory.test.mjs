import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import test from 'node:test'
import { fileURLToPath } from 'node:url'

const script = fileURLToPath(new URL('./code-quality-inventory.mjs', import.meta.url))
const root = fileURLToPath(new URL('../../', import.meta.url))

test('code-quality inventory emits deterministic scoped records with caller and category fields', (t) => {
  const run = spawnSync(process.execPath, [script], {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15000,
  })
  assert.equal(run.status, 0, run.stderr)
  assert.equal(run.stderr, '')
  const directory = mkdtempSync(join(tmpdir(), 'type-pal-quality-inventory-'))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const destination = join(directory, 'inventory.json')
  const written = spawnSync(process.execPath, [script, `--out=${destination}`], {
    cwd: directory,
    encoding: 'utf8',
    maxBuffer: 32 * 1024 * 1024,
    timeout: 15000,
  })
  assert.equal(written.status, 0, written.stderr)
  assert.equal(written.stdout, '')
  assert.equal(written.stderr, '')
  assert.equal(readFileSync(destination, 'utf8'), run.stdout)
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

/** Real Git metadata may contain staged paths absent from the checkout. Do not create thousands of files. */
function largePathFixture(t) {
  const directory = realpathSync(mkdtempSync(join(tmpdir(), 'type-pal-path-enumeration-')))
  t.after(() => rmSync(directory, { recursive: true, force: true }))
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => !key.startsWith('GIT_')),
  )
  env.GIT_CONFIG_NOSYSTEM = '1'
  env.GIT_CONFIG_GLOBAL = '/dev/null'
  const git = (args, input) =>
    execFileSync('git', ['-C', directory, ...args], {
      env,
      input,
      maxBuffer: 16 * 1024 * 1024,
    })
  const put = (path, body) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    writeFileSync(join(directory, path), body)
  }
  git(['init', '-q'])
  const first = 'packages/shared/src/first.ts'
  const last = 'packages/shared/src/zz space-末尾.ts'
  const task = 'docs/ops/tasks/Z-LATE.md'
  put(first, 'export const value = 1\n')
  put(last, "import { value } from './first.js'\nexport const twice = value * 2\n")
  put(task, '# Z-LATE — actual tail task\n\nStatus: draft\n')
  git(['add', '--', first, last, task])
  git([
    '-c',
    'user.name=Owned enumeration fixture',
    '-c',
    'user.email=fixture@example.invalid',
    '-c',
    'core.hooksPath=/dev/null',
    'commit',
    '--no-gpg-sign',
    '-qm',
    'owned metadata fixture',
  ])
  const oid = git(['hash-object', '-w', '--stdin'], '').toString('utf8').trim()
  const padding = Array.from(
    { length: 5000 },
    (_, i) => `a-padding/${String(i).padStart(5, '0')}-${'p'.repeat(220)}.bin`,
  )
  git(['update-index', '--index-info'], padding.map((path) => `100644 ${oid}\t${path}\n`).join(''))
  const pathBytes = git(['ls-files', '-z'])
  assert.ok(pathBytes.length > 1024 * 1024)
  assert.equal(pathBytes.at(-1), 0)
  const copyFromRepository = (path) => {
    mkdirSync(dirname(join(directory, path)), { recursive: true })
    copyFileSync(join(root, path), join(directory, path))
  }
  const run = (path, args = []) =>
    spawnSync(process.execPath, [join(directory, path), ...args], {
      cwd: directory,
      env,
      encoding: 'utf8',
      maxBuffer: 8 * 1024 * 1024,
      timeout: 15000,
    })
  return { directory, first, last, task, put, run, copyFromRepository }
}

test('actual docs index CLI consumes over1MiB Git paths and still rejects an invalid tail task', (t) => {
  const fixture = largePathFixture(t)
  for (const path of [
    'scripts/docs/check.mjs',
    'scripts/docs/config.mjs',
    'scripts/docs/markdown.mjs',
    'scripts/docs/terminal-codec.mjs',
    'scripts/docs/terminal-json.mjs',
    'scripts/docs/terminal-git.mjs',
    'scripts/docs/terminal-namespace.mjs',
    'scripts/docs/terminal-contract.mjs',
  ]) {
    fixture.copyFromRepository(path)
  }
  fixture.put(
    'packages/content/src/character.ts',
    'export const CONTENT_VERSION = 22 as const\nexport const CURRENT_PROJECT_MINIMUM_SAVE_VERSION = 12 as const\n',
  )
  const generated = fixture.run('scripts/docs/check.mjs', ['--print-task-index'])
  assert.equal(generated.error, undefined)
  assert.equal(generated.signal, null)
  assert.equal(generated.status, 0, generated.stderr)
  assert.equal(generated.stderr, '')
  assert.ok(generated.stdout.includes('[Z-LATE — actual tail task](Z-LATE.md) | draft |'))
  fixture.put(fixture.task, '# Z-LATE — actual tail task\n\nStatus: invented\n')
  const rejected = fixture.run('scripts/docs/check.mjs', ['--print-task-index'])
  assert.equal(rejected.error, undefined)
  assert.equal(rejected.signal, null)
  assert.equal(rejected.status, 1)
  assert.equal(rejected.stdout, '')
  assert.match(rejected.stderr, /任务状态无效：docs\/ops\/tasks\/Z-LATE\.md/)
})

test('actual quality inventory CLI consumes over1MiB Git paths and preserves exact tail records and callers', (t) => {
  const fixture = largePathFixture(t)
  fixture.copyFromRepository('scripts/quality/code-quality-inventory.mjs')
  const result = fixture.run('scripts/quality/code-quality-inventory.mjs')
  assert.equal(result.error, undefined)
  assert.equal(result.signal, null)
  assert.equal(result.status, 0, result.stderr)
  assert.equal(result.stderr, '')
  const inventory = JSON.parse(result.stdout)
  assert.deepEqual(
    inventory.records.map((record) => record.path),
    [fixture.first, fixture.last],
  )
  const [first, last] = inventory.records
  assert.deepEqual(first.publicExports, ['value'])
  assert.deepEqual(first.productionCallers, [fixture.last])
  assert.deepEqual(last.publicExports, ['twice'])
  assert.deepEqual(last.directDependencies, ['./first.js'])
  assert.equal(last.status, '待核')
})
