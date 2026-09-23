import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cpSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import { createRequire } from 'node:module'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import test, { after } from 'node:test'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
const root = resolve(here, '../..')
const providerPath = realpathSync(
  resolve(root, 'node_modules/@vitest/coverage-v8/dist/provider.js'),
)
const require = createRequire(providerPath)
const { mergeProcessCovs } = require('@bcoe/v8-coverage')
const { V8CoverageProvider } = await import(pathToFileURL(providerPath).href)
const provider = new V8CoverageProvider()
provider.options = {}
const work = realpathSync(mkdtempSync(join(tmpdir(), 'type-pal-merge-regression-')))
cpSync(join(here, 'fixtures/initializers'), work, { recursive: true })
symlinkSync(resolve(root, 'node_modules'), join(work, 'node_modules'), 'dir')
after(() => rmSync(work, { recursive: true, force: true }))
const subject = join(work, 'native-subject.mjs')
const code = readFileSync(subject, 'utf8')
const captures = new Map()
const methods = {
  runBoth: 'both',
  runStatic: 'staticOnly',
  runInstance: 'instanceOnly',
  runNested: 'nested',
  runAnonymous: 'anonymous',
  plain: 'plain',
}

test('installed merger is the version-locked patch recorded in manifest and lockfile', () => {
  const manifest = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'))
  assert.equal(manifest.devDependencies.vitest, '4.1.7')
  assert.equal(manifest.devDependencies['@vitest/coverage-v8'], '4.1.7')
  const path = 'patches/@bcoe__v8-coverage@1.0.2.patch'
  assert.equal(manifest.pnpm.patchedDependencies['@bcoe/v8-coverage@1.0.2'], path)
  const hash = createHash('sha256')
    .update(readFileSync(resolve(root, path)))
    .digest('hex')
  const lock = readFileSync(resolve(root, 'pnpm-lock.yaml'), 'utf8')
  assert(lock.includes(`hash: ${hash}\n    path: ${path}`))
  assert(lock.includes(`'@bcoe/v8-coverage': 1.0.2(patch_hash=${hash})`))
  assert(
    realpathSync(require.resolve('@bcoe/v8-coverage')).includes(
      `@bcoe+v8-coverage@1.0.2_patch_hash=${hash}/`,
    ),
  )
  assert.equal(require('@bcoe/v8-coverage/package.json').version, '1.0.2')
})

function capture(mode) {
  if (captures.has(mode)) return captures.get(mode)
  const result = []
  for (let n = 0; n < 3; n++) {
    const path = join(work, `${mode}-${n}.json`)
    const run = spawnSync(process.execPath, [join(work, 'capture.mjs'), subject, path, mode], {
      encoding: 'utf8',
    })
    assert.equal(run.status, 0, run.stderr)
    result.push(JSON.parse(readFileSync(path, 'utf8')))
  }
  captures.set(mode, result)
  return result
}

async function counts(entry) {
  const mapped = Object.values(
    await provider.remapCoverage(entry.url, 0, { code }, entry.functions),
  )[0]
  return Object.fromEntries(
    Object.keys(methods).map((name) => {
      const key = Object.keys(mapped.fnMap).find((k) => mapped.fnMap[k].name === name)
      assert(key !== undefined, `missing ${name}`)
      return [methods[name], mapped.f[key]]
    }),
  )
}
const merge = (entries) =>
  mergeProcessCovs(entries.map((e) => ({ result: [structuredClone(e.coverage)] }))).result[0]
const sum = (entries) =>
  Object.fromEntries(
    Object.values(methods).map((key) => [key, entries.reduce((n, e) => n + e.actual[key], 0)]),
  )

for (const mode of ['import', 'construct', 'valid', 'reject']) {
  test(`native ${mode}: class/anonymous/nested/plain actual calls survive two/three-way merges and order`, async () => {
    const raw = capture(mode)
    for (const entry of raw) assert.deepEqual(await counts(entry.coverage), entry.actual)
    for (const group of [raw.slice(0, 2), raw.slice(0, 2).reverse(), raw, raw.toReversed()]) {
      assert.deepEqual(await counts(merge(group)), sum(group))
    }
  })
}

test('mixed import and genuine call preserve zero branches and actual method counts in both orders', async () => {
  const group = [capture('import')[0], capture('valid')[0], capture('reject')[0]]
  for (const entries of [group, group.toReversed()])
    assert.deepEqual(await counts(merge(entries)), sum(entries))
})

test('same-range static and instance initialization identities and counts stay separate', () => {
  const raw = capture('import').slice(0, 2)
  const first = raw[0].coverage.functions.filter((f) => f.functionName.includes('initializer'))
  const expected = first.map((f) => ({
    name: f.functionName,
    range: [f.ranges[0].startOffset, f.ranges[0].endOffset],
    count: f.ranges[0].count * 2,
  }))
  for (const group of [raw, raw.toReversed()]) {
    const actual = merge(group)
      .functions.filter((f) => f.functionName.includes('initializer'))
      .map((f) => ({
        name: f.functionName,
        range: [f.ranges[0].startOffset, f.ranges[0].endOffset],
        count: f.ranges[0].count,
      }))
    assert.deepEqual(
      actual.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
      expected.toSorted((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
    )
  }
})

test('ordinary functions still merge by range, not arbitrary names; empty/single input stay valid', async () => {
  assert.deepEqual(mergeProcessCovs([]), { result: [] })
  const raw = capture('valid')[0]
  assert.deepEqual(await counts(merge([raw])), raw.actual)
  const fn = (name, count) => ({
    scriptId: '0',
    url: 'file:///range-contract.js',
    functions: [
      {
        functionName: name,
        ranges: [{ startOffset: 0, endOffset: 10, count }],
        isBlockCoverage: true,
      },
    ],
  })
  const merged = mergeProcessCovs([{ result: [fn('first', 2)] }, { result: [fn('renamed', 3)] }])
    .result[0]
  assert.equal(merged.functions.length, 1)
  assert.equal(merged.functions[0].ranges[0].count, 5)
})

for (const called of [false, true]) {
  test(`real Vitest ssr/client ${called ? 'genuine calls' : 'import-only'}: actual report method count`, () => {
    const dir = join(work, called ? 'called' : 'imports')
    const include = [
      'import-one.test.ts',
      'import-two.test.ts',
      'import-one.client.test.ts',
      'import-two.client.test.ts',
      ...(called ? ['call.test.ts', 'call.client.test.ts'] : []),
    ]
    const config = {
      root: work,
      test: {
        include,
        maxWorkers: 2,
        reporters: ['json'],
        outputFile: `${dir}/tests.json`,
        coverage: {
          enabled: true,
          provider: 'v8',
          include: ['subject.ts'],
          reporter: ['json'],
          reportsDirectory: dir,
        },
      },
    }
    const configPath = join(work, called ? 'called.config.mjs' : 'imports.config.mjs')
    writeFileSync(configPath, `export default ${JSON.stringify(config)};\n`)
    const run = spawnSync('pnpm', ['exec', 'vitest', 'run', '--config', configPath], {
      cwd: root,
      encoding: 'utf8',
    })
    assert.equal(run.status, 0, `${run.stdout}\n${run.stderr}`)
    const results = JSON.parse(readFileSync(`${dir}/tests.json`, 'utf8'))
    assert.equal(results.numPassedTests, include.length)
    assert.equal(results.numFailedTests, 0)
    assert.equal(results.numPendingTests, 0)
    const coverage = Object.values(JSON.parse(readFileSync(`${dir}/coverage-final.json`, 'utf8')))
    assert.equal(coverage.length, 1)
    const data = coverage[0]
    const key = Object.keys(data.fnMap).find((id) => data.fnMap[id].name === 'run')
    assert(key !== undefined)
    assert.equal(
      data.f[key],
      called ? 2 : 0,
      'importing the class must not cover run; real calls still count',
    )
  })
}
