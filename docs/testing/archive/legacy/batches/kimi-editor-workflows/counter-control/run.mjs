#!/usr/bin/env node
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 单点反控 runner（判据见 judge.mjs 与同目录 README.md）。
 * 用法（仓库根）：
 *   node docs/testing/archive/legacy/batches/kimi-editor-workflows/counter-control/run.mjs <injections 模块名> [--only <label>]
 * 模块名先按 cwd 解析，找不到再按本目录解析——README/回执命令的裸文件名因此可复跑。
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  appendFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { judgeRun } from './judge.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '..', '..', '..', '..')
const injectionsArg = process.argv[2] ?? ''
const injectionsPath = [resolve(process.cwd(), injectionsArg), resolve(here, injectionsArg)].find(
  (candidate) => existsSync(candidate),
)
if (!injectionsPath) {
  console.error(
    JSON.stringify({
      verdict: 'invalid:module-not-found',
      tried: [injectionsArg, 'counter-control/'],
    }),
  )
  process.exit(2)
}
const onlyIndex = process.argv.indexOf('--only')
const only = onlyIndex >= 0 ? process.argv[onlyIndex + 1] : undefined
const { injections } = await import(pathToFileURL(injectionsPath).href)

const sha = (file) => createHash('sha256').update(readFileSync(file)).digest('hex')
const outJsonl = '/tmp/type-pal-kimi-editor-workflows/counter-control.jsonl'
mkdirSync('/tmp/type-pal-kimi-editor-workflows', { recursive: true })

const selected = injections.filter((item) => !only || item.label === only)
if (!selected.length) {
  console.error(JSON.stringify({ verdict: 'invalid:no-such-needle', only }))
  process.exit(2)
}

const controlCounts = new Map()
const records = []

for (const item of selected) {
  const targetAbs = item.target ? resolve(root, item.target) : null
  const beforeHash = targetAbs ? sha(targetAbs) : null
  const logs = mkdtempSync(join(tmpdir(), 'kimi-cc-'))

  const source = targetAbs ? readFileSync(targetAbs, 'utf8') : ''
  const findOccurrences = targetAbs ? source.split(item.find).length - 1 : 1

  const mutation = targetAbs
    ? { label: item.label, file: targetAbs, find: item.find, replace: item.replace }
    : { label: item.label, file: null, find: '', replace: '' }
  const config = join(logs, 'vitest.config.mjs')
  writeFileSync(
    config,
    `import { readFileSync } from 'node:fs'\n` +
      `const mutation=${JSON.stringify(mutation)}\n` +
      `export default {\n` +
      `  root: ${JSON.stringify(resolve(root, 'packages/editor'))},\n` +
      `  plugins: [{ name: 'kimi-cc-single-point', enforce: 'pre', load(id) {\n` +
      `    if (!mutation.file || id.split('?')[0] !== mutation.file) return\n` +
      `    const before = readFileSync(mutation.file, 'utf8')\n` +
      `    if (before.split(mutation.find).length !== 2) throw new Error('unique injection point lost')\n` +
      `    console.log('MUTATION_HIT', mutation.label)\n` +
      `    return before.replace(mutation.find, mutation.replace)\n` +
      `  }}],\n` +
      `  test: { include: ${JSON.stringify(item.tests.map((t) => t.replace(/^packages\/editor\//, '')))}, maxWorkers: 1, fileParallelism: false },\n` +
      `}\n`,
  )
  const jsonOut = join(logs, 'vitest.json')
  const run = spawnSync(
    'pnpm',
    [
      '--filter',
      '@type-pal/editor',
      'exec',
      'vitest',
      'run',
      '--config',
      config,
      '--reporter=json',
      '--outputFile',
      jsonOut,
    ],
    { cwd: root, encoding: 'utf8', timeout: 300_000, maxBuffer: 32 * 1024 * 1024 },
  )
  const stdout = (run.stdout ?? '') + (run.stderr ?? '')
  writeFileSync(join(logs, 'stdout.log'), stdout)

  let report = null
  try {
    report = JSON.parse(readFileSync(jsonOut, 'utf8'))
  } catch {
    report = null
  }

  const setKey = item.tests.join('|')
  const reasons = judgeRun({
    item,
    expectedTestFiles: item.tests.map((t) => resolve(root, t)),
    exitCode: run.status ?? null,
    signal: run.signal ?? null,
    spawnError: run.error?.message,
    stdout,
    report,
    controlExecuted: item.control ? undefined : controlCounts.get(setKey),
    mutationHitExpected: !item.control,
    productHashChanged: targetAbs ? sha(targetAbs) !== beforeHash : false,
    findOccurrences,
  })

  const failedFullNames = report
    ? report.testResults.flatMap((file) =>
        file.assertionResults
          .filter((assertion) => assertion.status === 'failed')
          .map((assertion) => assertion.fullName),
      )
    : []
  if (item.control && report && reasons.length === 0)
    controlCounts.set(setKey, report.numTotalTests)

  records.push({
    label: item.label,
    target: item.target ?? null,
    tests: item.tests,
    exitCode: run.status ?? null,
    executed: report?.numTotalTests ?? null,
    failedFullNames,
    verdict: reasons.length
      ? reasons.join(';')
      : item.control
        ? 'valid-green-control'
        : 'valid-red',
    logs,
  })
}

appendFileSync(outJsonl, `${records.map((record) => JSON.stringify(record)).join('\n')}\n`)
console.log(JSON.stringify({ results: records }, null, 2))
const invalid = records.filter(
  (record) => record.verdict !== 'valid-red' && record.verdict !== 'valid-green-control',
)
if (invalid.length) {
  console.error(JSON.stringify({ invalid: invalid.map((record) => record.label) }))
  process.exit(1)
}
