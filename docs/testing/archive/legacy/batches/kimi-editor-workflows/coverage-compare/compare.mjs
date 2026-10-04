#!/usr/bin/env node
/**
 * TEST-KIMI-EDITOR-WORKFLOWS-1 同口径 before/after 覆盖对照（口径见同目录 README.md）。
 * 官方 run.mjs 不拆 before/after，这里只做本卡局部对照，不写基线。
 */
import { spawnSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  coverageExcludes,
  coveragePackages,
  listProductionSources,
  testSelection,
} from '../../../../../../../scripts/coverage/config.mjs'

const here = fileURLToPath(new URL('.', import.meta.url))
const root = resolve(here, '..', '..', '..', '..')
const editor = coveragePackages.find((pkg) => pkg.id === 'editor')
if (!editor) throw new Error('coverage config 缺 editor 包')
const reuse = process.argv.includes('--reuse')

const selection = testSelection(editor, 'fast')
const baseArgs = [
  '--filter',
  editor.name,
  'exec',
  'vitest',
  'run',
  ...selection.args,
  ...selection.excludes.flatMap((pattern) => ['--exclude', pattern]),
]
const coverageArgs = (reportDir) => [
  '--coverage',
  '--coverage.provider=v8',
  `--coverage.reportsDirectory=${reportDir}`,
  '--coverage.reporter=json-summary',
]
const includeArgs = [
  ...editor.include.flatMap((pattern) => ['--coverage.include', pattern]),
  ...coverageExcludes.flatMap((pattern) => ['--coverage.exclude', pattern]),
]

const outDir = '/tmp/type-pal-kimi-editor-workflows/coverage-compare'
mkdirSync(outDir, { recursive: true })

function runPass(label, extraTestExcludes) {
  const reportDir = resolve(outDir, label)
  const args = [
    ...baseArgs,
    ...extraTestExcludes.flatMap((pattern) => ['--exclude', pattern]),
    ...coverageArgs(reportDir),
    ...includeArgs,
  ]
  console.log(`[compare] ${label}: pnpm ${args.join(' ')}`)
  const run = spawnSync('pnpm', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: 1800_000,
    maxBuffer: 64 * 1024 * 1024,
    env: { ...process.env, TYPE_PAL_COVERAGE_PROFILE: 'fast', NODE_COMPILE_CACHE: '' },
  })
  writeFileSync(resolve(outDir, `${label}.log`), (run.stdout ?? '') + (run.stderr ?? ''))
  if (run.status !== 0)
    throw new Error(`${label} 覆盖运行 exit ${run.status ?? 'null'}（日志 ${label}.log）`)
  return JSON.parse(readFileSync(resolve(reportDir, 'coverage-summary.json'), 'utf8'))
}

const before = reuse
  ? JSON.parse(readFileSync(resolve(outDir, 'before', 'coverage-summary.json'), 'utf8'))
  : runPass('before', ['**/*.kimi-workflows.test.*'])
const after = reuse
  ? JSON.parse(readFileSync(resolve(outDir, 'after', 'coverage-summary.json'), 'utf8'))
  : runPass('after', [])

// 生产分母闭合：两侧文件集必须与 census 一致且互相一致。
const expected = new Set((await listProductionSources(editor)).map((file) => resolve(file)))
const filesOf = (summary) =>
  new Set(
    Object.keys(summary)
      .filter((key) => key !== 'total')
      .map((file) => resolve(file)),
  )
const beforeFiles = filesOf(before)
const afterFiles = filesOf(after)
const drift = (side, files) => ({
  missing: [...expected].filter((file) => !files.has(file)).length,
  unexpected: [...files].filter((file) => !expected.has(file)).length,
  side,
})
const census = [drift('before', beforeFiles), drift('after', afterFiles)]
if (census.some((entry) => entry.missing || entry.unexpected))
  throw new Error(`覆盖文件 census 不闭合: ${JSON.stringify(census)}`)

// 20 目标清单（targets.json 冻结源）。
const targets = JSON.parse(
  readFileSync(
    resolve(root, 'docs/testing/archive/legacy/batches/kimi-editor-workflows/targets.json'),
    'utf8',
  ),
).groups.flatMap((group) => group.targets.map((target) => resolve(root, target.source)))

const metricsOf = (summary, file) => {
  const entry = summary[file]
  if (!entry) throw new Error(`目标不在覆盖报告: ${file}`)
  return {
    lines: { covered: entry.lines.covered, total: entry.lines.total },
    branches: { covered: entry.branches.covered, total: entry.branches.total },
  }
}
const sum = (files, summary) =>
  files.reduce(
    (acc, file) => {
      const m = metricsOf(summary, file)
      acc.lines.covered += m.lines.covered
      acc.lines.total += m.lines.total
      acc.branches.covered += m.branches.covered
      acc.branches.total += m.branches.total
      return acc
    },
    { lines: { covered: 0, total: 0 }, branches: { covered: 0, total: 0 } },
  )
const totalsOf = (summary) => ({
  lines: { covered: summary.total.lines.covered, total: summary.total.lines.total },
  branches: { covered: summary.total.branches.covered, total: summary.total.branches.total },
})

const perFile = targets.map((file) => ({
  source: file.replace(`${root}/`, ''),
  before: metricsOf(before, file),
  after: metricsOf(after, file),
  delta: (() => {
    const b = metricsOf(before, file)
    const a = metricsOf(after, file)
    return {
      lines: a.lines.covered - b.lines.covered,
      branches: a.branches.covered - b.branches.covered,
    }
  })(),
}))

const report = {
  argsEcho: { beforeExcludes: ['**/*.kimi-workflows.test.*'], afterExcludes: [] },
  census,
  targets20: {
    before: sum(targets, before),
    after: sum(targets, after),
    delta: (() => {
      const b = sum(targets, before)
      const a = sum(targets, after)
      return {
        lines: a.lines.covered - b.lines.covered,
        branches: a.branches.covered - b.branches.covered,
      }
    })(),
  },
  editorTotal: {
    before: totalsOf(before),
    after: totalsOf(after),
    delta: (() => {
      const b = totalsOf(before)
      const a = totalsOf(after)
      return {
        lines: a.lines.covered - b.lines.covered,
        branches: a.branches.covered - b.branches.covered,
      }
    })(),
  },
  perFile,
}
writeFileSync(
  '/tmp/type-pal-kimi-editor-workflows/coverage-compare.json',
  JSON.stringify(report, null, 2),
)
console.log(
  JSON.stringify({ targets20: report.targets20, editorTotal: report.editorTotal }, null, 2),
)
