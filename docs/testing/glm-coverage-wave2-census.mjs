// Planning metadata only: no coverage run, no product edits, no official baseline writes.
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { posix, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../', import.meta.url))
const args = process.argv.slice(2)
const reportIndex = args.indexOf('--reports')
assert.ok(
  reportIndex >= 0 && args[reportIndex + 1],
  'Provide --reports <official fast report directory>',
)
assert.ok(
  args.every(
    (arg, i) =>
      arg === '--reports' || i === reportIndex + 1 || arg === '--write' || arg === '--check',
  ),
)
assert.ok(!(args.includes('--write') && args.includes('--check')))
const reportRoot = resolve(args[reportIndex + 1])
const outputFile = resolve(root, 'docs/testing/glm-coverage-wave2-evidence.json')
const read = (path) => readFileSync(resolve(root, path), 'utf8')
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
const productionRef = git('rev-parse', '57dda7ed')
const metrics = ['lines', 'statements', 'functions', 'branches']
const names = (pkg, paths) => paths.map((path) => `packages/${pkg}/src/${path}.ts`)
const groups = [
  {
    id: 'W2-A',
    title: '运行时脚本状态与宿主调用',
    files: names('reforge', ['script-host-adapter', 'script-world', 'script-project-core']),
  },
  {
    id: 'W2-B',
    title: '战斗模拟器配置与启动资源快照',
    files: [
      ...names('reforge', ['battle-trial-config', 'battle-trial-prepare', 'battle-trial-assets']),
      ...names('editor', [
        'core/battle-simulator-state',
        'core/battle-simulator-library',
        'core/battle-simulator-commands',
      ]),
    ],
  },
  {
    id: 'W2-C',
    title: '精灵行为投影与帧动画草稿',
    files: names('editor', [
      'core/world-sprite-behavior',
      'core/frame-animation-draft',
      'core/sprite-actions',
    ]),
  },
  {
    id: 'W2-D',
    title: '当前引用图与删除凭据',
    files: names('editor', [
      'core/project-reference',
      'core/project-reference-adapters',
      'core/tileset-references',
      'core/script-references',
      'core/battle-data-references',
      'core/world-variable-references',
    ]),
  },
  {
    id: 'W2-E',
    title: '当前脚本与运行态内容守卫',
    files: names('content', [
      'enemy-script',
      'author-script-core',
      'runtime-scene',
      'validate-runtime',
    ]),
  },
  {
    id: 'W2-F',
    title: 'current迁移映射与脚本库审计的无资产输入',
    files: names('migrate', ['migrate-enemies', 'pal-casualty-scripts', 'script-library-audit']),
  },
]
const baselineBytes = read('scripts/coverage/baseline.fast.json')
const baseline = JSON.parse(baselineBytes)
const summary = JSON.parse(readFileSync(resolve(reportRoot, 'summary.json'), 'utf8'))
assert.equal(summary.profile, 'fast')
assert.deepEqual(summary.total, baseline.total, 'stale or mismatched report totals')
const sourceFiles = Object.values(baseline.packages).flatMap((p) => p.sourceFiles)
assert.equal(sourceFiles.length, 633)
assert.equal(summary.testCount, 7538)
execFileSync('git', ['diff', '--quiet', productionRef, '--', ...sourceFiles], { cwd: root })
const testFiles = git('ls-files', '--', 'packages/**/*.test.ts', 'packages/**/*.test.tsx')
  .split('\n')
  .filter((path) => path && existsSync(resolve(root, path)))
const testText = new Map(testFiles.map((path) => [path, read(path)]))
const countsByFile = new Map()
const lcovByFile = new Map()
const reportHashes = {}
for (const [pkg, expected] of Object.entries(baseline.packages)) {
  const actual = summary.packages[pkg]
  for (const key of ['sourceFiles', 'scopeDigest', 'metrics'])
    assert.deepEqual(actual[key], expected[key], `${pkg} mismatch: ${key}`)
  // The official report additionally includes full identities; the persisted baseline keeps their digests.
  for (const key of Object.keys(expected.fastTests))
    assert.deepEqual(
      actual.fastTests[key],
      expected.fastTests[key],
      `${pkg} test inventory mismatch: ${key}`,
    )
  const report = readFileSync(resolve(reportRoot, pkg, 'coverage-summary.json'), 'utf8')
  const lcov = readFileSync(resolve(reportRoot, pkg, 'lcov.info'), 'utf8')
  reportHashes[pkg] = { summary: hash(report), lcov: hash(lcov) }
  const sum = Object.fromEntries(metrics.map((key) => [key, { covered: 0, total: 0 }]))
  let count = 0
  for (const [absolute, values] of Object.entries(JSON.parse(report))) {
    if (absolute === 'total') continue
    const file = absolute.slice(absolute.lastIndexOf('/packages/') + 1)
    assert.ok(expected.sourceFiles.includes(file), `unexpected source ${file}`)
    const normalized = Object.fromEntries(
      metrics.map((key) => {
        const { covered, total } = values[key]
        assert.ok(
          Number.isInteger(covered) && Number.isInteger(total) && covered >= 0 && covered <= total,
        )
        sum[key].covered += covered
        sum[key].total += total
        return [key, { covered, total }]
      }),
    )
    assert.ok(!countsByFile.has(file))
    countsByFile.set(file, normalized)
    count++
  }
  assert.equal(count, expected.sourceFileCount)
  assert.deepEqual(sum, expected.metrics, `${pkg} file sums`)
  for (const block of lcov.split('end_of_record')) {
    const source = /^SF:(.+)$/m.exec(block)?.[1]
    if (!source) continue
    const file = posix.normalize(`packages/${pkg}/${source}`)
    const missedLines = [...block.matchAll(/^DA:(\d+),0(?:,.*)?$/gm)].map((match) =>
      Number(match[1]),
    )
    const missedBranches = [...block.matchAll(/^BRDA:(\d+),(\d+),(\d+),(0|-)$/gm)].map((match) =>
      match.slice(1, 4).map(Number),
    )
    lcovByFile.set(file, { missedLines, missedBranches })
  }
}
const old = JSON.parse(read('docs/testing/glm-coverage-work-queue.json'))
const oldTargets = new Set((old.batches ?? []).flatMap((batch) => batch.files ?? []))
const allTargets = groups.flatMap((group) => group.files)
assert.equal(new Set(allTargets).size, 25)
const rows = allTargets.map((file) => {
  const source = read(file)
  const counts = countsByFile.get(file)
  const lcov = lcovByFile.get(file)
  assert.ok(counts && lcov, `missing official file data: ${file}`)
  assert.equal(
    lcov.missedLines.length,
    counts.lines.total - counts.lines.covered,
    `${file} line hints`,
  )
  assert.equal(
    lcov.missedBranches.length,
    counts.branches.total - counts.branches.covered,
    `${file} branch hints`,
  )
  const stem = posix.basename(file, '.ts')
  return {
    file,
    sourceSha256: hash(source),
    metrics: counts,
    previousTbTarget: oldTargets.has(file),
    ...lcov,
    testHints: testFiles.filter(
      (path) =>
        path.includes(stem) ||
        testText.get(path).includes(`${stem}.js`) ||
        testText.get(path).includes(`${stem}.ts`),
    ),
    hintLimit:
      'Filename/import hints only. GLM must inspect barrel/indirect/cross-package tests and give exact test titles before claiming new coverage.',
  }
})
const groupSummary = groups.map((group) => ({
  ...group,
  files: group.files.map((file) => rows.find((row) => row.file === file)),
  remainingLines: group.files.reduce(
    (n, file) => n + countsByFile.get(file).lines.total - countsByFile.get(file).lines.covered,
    0,
  ),
  remainingBranches: group.files.reduce(
    (n, file) =>
      n + countsByFile.get(file).branches.total - countsByFile.get(file).branches.covered,
    0,
  ),
}))
const result = {
  schemaVersion: 1,
  purpose:
    'Frozen planning inventory, not reachable-branch certification, promised gains, or build authorization',
  productionRef,
  baselineSha256: hash(baselineBytes),
  sourceFileCount: 633,
  fastTestCount: 7538,
  total: baseline.total,
  reportHashes,
  targetFiles: 25,
  groups: groupSummary,
}
if (args.includes('--check')) assert.deepEqual(JSON.parse(readFileSync(outputFile, 'utf8')), result)
if (args.includes('--write')) writeFileSync(outputFile, `${JSON.stringify(result, null, 2)}\n`)
console.log(
  JSON.stringify(
    {
      productionRef,
      targetFiles: rows.length,
      groups: groupSummary.map(({ id, remainingLines, remainingBranches }) => ({
        id,
        remainingLines,
        remainingBranches,
      })),
      mode: args.includes('--check') ? 'checked' : args.includes('--write') ? 'written' : 'preview',
    },
    null,
    2,
  ),
)
