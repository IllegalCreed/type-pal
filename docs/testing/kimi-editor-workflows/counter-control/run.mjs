#!/usr/bin/env node
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 单点反控 runner（判据见同目录 README.md）。
 * 用法：node run.mjs <injections 模块> [--only <label>]
 */
import { spawnSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { appendFileSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '..', '..', '..', '..')
const injectionsPath = resolve(process.cwd(), process.argv[2] ?? '')
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
  const verdicts = []
  const logs = mkdtempSync(join(tmpdir(), 'kimi-cc-'))

  if (targetAbs) {
    const source = readFileSync(targetAbs, 'utf8')
    const occurrences = source.split(item.find).length - 1
    if (occurrences !== 1) verdicts.push(`invalid:find-occurrences=${occurrences}`)
  }

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
    verdicts.push('invalid:no-json-report')
  }

  if (run.signal) verdicts.push(`invalid:signal=${run.signal}`)
  if (run.error) verdicts.push(`invalid:spawn=${run.error.message}`)

  const expectedExit = item.control ? 0 : 1
  if (run.status !== expectedExit) verdicts.push(`invalid:exit=${String(run.status)}`)

  let failedFullNames = []
  let executed = null
  if (report) {
    executed = report.numTotalTests
    failedFullNames = report.testResults.flatMap((file) =>
      file.assertionResults
        .filter((assertion) => assertion.status === 'failed')
        .map((assertion) => assertion.fullName),
    )
    if (item.control) {
      if (failedFullNames.length) verdicts.push(`invalid:control-red=${failedFullNames.join(',')}`)
    } else {
      const expectedSet = [...item.expectFailed].sort()
      const actualSet = [...failedFullNames].sort()
      if (JSON.stringify(actualSet) !== JSON.stringify(expectedSet))
        verdicts.push(`invalid:failed-set=${actualSet.join('|') || '(empty)'}`)
      const allAssertionError = report.testResults
        .flatMap((file) => file.assertionResults)
        .filter((assertion) => assertion.status === 'failed')
        .every((assertion) =>
          assertion.failureMessages.every((message) => message.startsWith('AssertionError')),
        )
      if (failedFullNames.length && !allAssertionError)
        verdicts.push('invalid:non-assertion-failure')
    }
    const key = item.tests.join('|')
    if (item.control) controlCounts.set(key, executed)
    else if (controlCounts.has(key) && controlCounts.get(key) !== executed)
      verdicts.push(`invalid:executed=${executed}!=control=${controlCounts.get(key)}`)
  }

  if (!item.control && !stdout.includes(`MUTATION_HIT ${item.label}`))
    verdicts.push('invalid:mutation-not-loaded')
  if (item.control && stdout.includes('MUTATION_HIT'))
    verdicts.push('invalid:control-loaded-mutation')
  if (targetAbs && sha(targetAbs) !== beforeHash) verdicts.push('invalid:product-hash-changed')

  records.push({
    label: item.label,
    target: item.target ?? null,
    tests: item.tests,
    exitCode: run.status ?? null,
    executed,
    failedFullNames,
    verdict: verdicts.length
      ? verdicts.join(';')
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
