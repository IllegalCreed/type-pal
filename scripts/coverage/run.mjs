#!/usr/bin/env node

import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { existsSync } from 'node:fs'
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import process from 'node:process'
import {
  baselinePath,
  coverageExcludes,
  coveragePackages,
  coverageRoot,
  coverageVersions,
  fullRequiredBinaryFiles,
  fullRequiredDirectories,
  fullRequiredJsonFiles,
  listProductionSources,
  repoRoot,
  scopeDigest,
  testExecutionDigest,
  testSelection,
} from './config.mjs'
import {
  assertDirectoryFileCount,
  assertFullJsonContracts,
  assertRegularNonEmptyFile,
  readRequiredJson,
} from './full-inputs.mjs'
import { auditScope, missingFromSuperset } from './inventory.mjs'
import {
  aggregateMetrics,
  compareCoverage,
  formatPercent,
  metricNames,
  normalizeMetrics,
} from './metrics.mjs'
import { classifyProtectedBaseline } from './protected-baseline.mjs'

const [profile = '', ...flags] = process.argv.slice(2)
const supportedFlags = new Set(['--ratchet', '--allow-scope-removal'])
const ratchet = flags.includes('--ratchet')
const allowScopeRemoval = flags.includes('--allow-scope-removal')

if (!['fast', 'full'].includes(profile) || flags.some((flag) => !supportedFlags.has(flag))) {
  console.error(
    '用法: node scripts/coverage/run.mjs <fast|full> [--ratchet] [--allow-scope-removal]',
  )
  process.exit(2)
}
if (ratchet && profile !== 'fast') {
  console.error('覆盖率基线只允许由 fast profile 更新')
  process.exit(2)
}
if (allowScopeRemoval && !ratchet) {
  console.error('--allow-scope-removal 只能与 --ratchet 一起使用')
  process.exit(2)
}

const readJson = async (path) => JSON.parse(await readFile(path, 'utf8'))
const childEnvironment = (overrides = {}) => ({
  ...process.env,
  TYPE_PAL_COVERAGE: '1',
  ...overrides,
})

const spawnCommand = (command, args, environment = {}) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: childEnvironment(environment),
      stdio: 'inherit',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${command} 被信号 ${signal} 终止`))
      else if (code !== 0) reject(new Error(`${command} 退出码 ${String(code)}`))
      else resolvePromise()
    })
  })

const spawnCapture = (command, args, environment = {}) =>
  new Promise((resolvePromise, reject) => {
    const stdout = []
    const stderr = []
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: childEnvironment(environment),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`${command} 被信号 ${signal} 终止`))
      else if (code !== 0)
        reject(
          new Error(`${command} 退出码 ${String(code)}\n${Buffer.concat(stderr).toString('utf8')}`),
        )
      else resolvePromise(Buffer.concat(stdout).toString('utf8'))
    })
  })

const gitPathExists = (ref, path) =>
  new Promise((resolvePromise, reject) => {
    const child = spawn('git', ['cat-file', '-e', `${ref}:${path}`], {
      cwd: repoRoot,
      env: childEnvironment(),
      stdio: 'ignore',
    })
    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (signal) reject(new Error(`git cat-file 被信号 ${signal} 终止`))
      else if (code === 0) resolvePromise(true)
      else if (code === 1 || code === 128) resolvePromise(false)
      else reject(new Error(`git cat-file 退出码 ${String(code)}`))
    })
  })

async function assertToolVersions() {
  const rootPackage = await readJson(resolve(repoRoot, 'package.json'))
  const installedVitest = await readJson(resolve(repoRoot, 'node_modules/vitest/package.json'))
  const installedCoverage = await readJson(
    resolve(repoRoot, 'node_modules/@vitest/coverage-v8/package.json'),
  )
  const found = {
    vitest: installedVitest.version,
    coverageV8: installedCoverage.version,
  }
  if (
    rootPackage.devDependencies?.vitest !== coverageVersions.vitest ||
    rootPackage.devDependencies?.['@vitest/coverage-v8'] !== coverageVersions.coverageV8 ||
    found.vitest !== coverageVersions.vitest ||
    found.coverageV8 !== coverageVersions.coverageV8
  ) {
    throw new Error(
      `Vitest/V8 provider 必须锁步为 ${coverageVersions.vitest}；当前 ${JSON.stringify(found)}`,
    )
  }
}

async function assertFullInputs() {
  if (profile !== 'full') return
  for (const path of fullRequiredBinaryFiles) await assertRegularNonEmptyFile(repoRoot, path)
  const json = new Map()
  for (const path of fullRequiredJsonFiles) json.set(path, await readRequiredJson(repoRoot, path))
  for (const requirement of fullRequiredDirectories)
    await assertDirectoryFileCount(repoRoot, requirement)
  assertFullJsonContracts(json)
}

function selectedVitestArgs(packageConfig, selectedProfile) {
  const selection = testSelection(packageConfig, selectedProfile)
  return [...selection.args, ...selection.excludes.flatMap((pattern) => ['--exclude', pattern])]
}

const normalizeRepoPath = (path) => relative(repoRoot, path).replaceAll('\\', '/')

async function collectTestInventory(packageConfig, selectedProfile, outputRoot) {
  const inventoryDirectory = resolve(outputRoot, '.test-inventory')
  await mkdir(inventoryDirectory, { recursive: true })
  const outputFile = resolve(inventoryDirectory, `${packageConfig.id}.${selectedProfile}.json`)
  await rm(outputFile, { force: true })
  await spawnCommand(
    'pnpm',
    [
      '--filter',
      packageConfig.name,
      'exec',
      'vitest',
      'list',
      ...selectedVitestArgs(packageConfig, selectedProfile),
      `--json=${outputFile}`,
    ],
    { TYPE_PAL_COVERAGE_PROFILE: selectedProfile },
  )
  const raw = await readJson(outputFile)
  if (!Array.isArray(raw) || raw.length === 0)
    throw new Error(`${packageConfig.id}/${selectedProfile}: test inventory 为空或不是数组`)
  const entries = raw
    .map((entry, index) => {
      if (!entry || typeof entry.name !== 'string' || typeof entry.file !== 'string')
        throw new Error(`${packageConfig.id}/${selectedProfile}: test inventory[${index}] 非法`)
      const absoluteFile = isAbsolute(entry.file)
        ? resolve(entry.file)
        : resolve(repoRoot, packageConfig.directory, entry.file)
      const file = normalizeRepoPath(absoluteFile)
      if (file.startsWith('../'))
        throw new Error(`${packageConfig.id}/${selectedProfile}: 测试越出仓库 ${entry.file}`)
      const projectName =
        typeof entry.projectName === 'string' && entry.projectName ? entry.projectName : 'root'
      return { file, identity: `${file} :: project ${projectName} :: ${entry.name}` }
    })
    .sort((left, right) => left.identity.localeCompare(right.identity))
  const totals = new Map()
  for (const entry of entries) totals.set(entry.identity, (totals.get(entry.identity) ?? 0) + 1)
  const seen = new Map()
  const identities = entries.map((entry) => {
    const occurrence = (seen.get(entry.identity) ?? 0) + 1
    seen.set(entry.identity, occurrence)
    const total = totals.get(entry.identity)
    return total === 1 ? entry.identity : `${entry.identity} :: occurrence ${occurrence}/${total}`
  })
  const files = [...new Set(entries.map((entry) => entry.file))].sort()
  const fileEntries = files.map((file) => {
    const fileIdentities = identities.filter((identity) => identity.startsWith(`${file} :: `))
    return {
      file,
      testCount: fileIdentities.length,
      identityDigest: createHash('sha256').update(JSON.stringify(fileIdentities)).digest('hex'),
    }
  })
  return {
    testCount: identities.length,
    testFileCount: files.length,
    files,
    fileEntries,
    identities,
    identityDigest: createHash('sha256').update(JSON.stringify(identities)).digest('hex'),
    duplicateIdentityCount: [...totals.values()].filter((count) => count > 1).length,
    executionDigest: await testExecutionDigest(packageConfig, selectedProfile, identities),
  }
}

function assertTestSuperset(packageConfig, fastTests, fullTests) {
  const missing = missingFromSuperset(fastTests.identities, fullTests.identities)
  if (missing.length > 0) {
    throw new Error(
      `${packageConfig.id}: full test inventory 不是 fast 超集；缺失:\n- ${missing.slice(0, 8).join('\n- ')}`,
    )
  }
}

async function collectPackage(packageConfig, outputRoot) {
  const fastTests = await collectTestInventory(packageConfig, 'fast', outputRoot)
  const selectedTests =
    profile === 'fast' ? fastTests : await collectTestInventory(packageConfig, 'full', outputRoot)
  if (profile === 'full') assertTestSuperset(packageConfig, fastTests, selectedTests)

  const reportDirectory = resolve(outputRoot, packageConfig.id)
  const args = [
    '--filter',
    packageConfig.name,
    'exec',
    'vitest',
    'run',
    ...selectedVitestArgs(packageConfig, profile),
    '--coverage',
    '--coverage.provider=v8',
    `--coverage.reportsDirectory=${reportDirectory}`,
    '--coverage.reporter=text-summary',
    '--coverage.reporter=json-summary',
    '--coverage.reporter=html',
    '--coverage.reporter=lcov',
  ]
  for (const pattern of packageConfig.include) args.push('--coverage.include', pattern)
  for (const pattern of coverageExcludes) args.push('--coverage.exclude', pattern)

  console.log(`\n[coverage:${profile}] ${packageConfig.name}`)
  await spawnCommand('pnpm', args, { TYPE_PAL_COVERAGE_PROFILE: profile })

  const raw = await readJson(resolve(reportDirectory, 'coverage-summary.json'))
  const packageRoot = resolve(repoRoot, packageConfig.directory)
  const expectedFiles = await listProductionSources(packageConfig)
  const actualFiles = Object.keys(raw)
    .filter((file) => file !== 'total')
    .map((file) => (isAbsolute(file) ? resolve(file) : resolve(packageRoot, file)))
    .sort()
  const expected = new Set(expectedFiles)
  const actual = new Set(actualFiles)
  const missing = expectedFiles.filter((file) => !actual.has(file))
  const unexpected = actualFiles.filter((file) => !expected.has(file))
  if (missing.length > 0 || unexpected.length > 0) {
    const show = (files) => files.slice(0, 8).map(normalizeRepoPath).join(', ')
    throw new Error(
      `${packageConfig.id} coverage 文件 census 不闭合` +
        `${missing.length ? `；缺失 ${show(missing)}` : ''}` +
        `${unexpected.length ? `；越界 ${show(unexpected)}` : ''}`,
    )
  }

  return {
    name: packageConfig.name,
    directory: packageConfig.directory,
    include: packageConfig.include,
    exclude: coverageExcludes,
    sourceFileCount: expectedFiles.length,
    sourceFiles: expectedFiles.map(normalizeRepoPath),
    scopeDigest: scopeDigest(packageConfig, expectedFiles),
    fastTests,
    selectedTests,
    metrics: normalizeMetrics(raw.total, packageConfig.id),
  }
}

function printSummary(result) {
  const header = ['package', 'statements', 'branches', 'functions', 'lines', 'files', 'tests']
  const rows = Object.entries(result.packages).map(([id, value]) => [
    id,
    ...metricNames.map((metric) => formatPercent(value.metrics[metric])),
    String(value.sourceFileCount),
    String(value.selectedTests.testCount),
  ])
  rows.push([
    'TOTAL',
    ...metricNames.map((metric) => formatPercent(result.total[metric])),
    String(result.sourceFileCount),
    String(result.testCount),
  ])
  const widths = header.map((name, index) =>
    Math.max(name.length, ...rows.map((row) => row[index].length)),
  )
  const render = (row) => row.map((cell, index) => cell.padEnd(widths[index])).join('  ')
  console.log(`\n[coverage:${profile}] consolidated`)
  console.log(render(header))
  console.log(render(widths.map((width) => '-'.repeat(width))))
  for (const row of rows) console.log(render(row))
}

const baselineView = (result) => ({
  schemaVersion: 2,
  profile: 'fast',
  generatedAt: result.generatedAt,
  provider: result.provider,
  sourceFileCount: result.sourceFileCount,
  testCount: result.testCount,
  packages: Object.fromEntries(
    Object.entries(result.packages).map(([id, value]) => [
      id,
      {
        name: value.name,
        directory: value.directory,
        include: value.include,
        exclude: value.exclude,
        sourceFileCount: value.sourceFileCount,
        sourceFiles: value.sourceFiles,
        scopeDigest: value.scopeDigest,
        fastTests: Object.fromEntries(
          Object.entries(value.fastTests).filter(([key]) => key !== 'identities'),
        ),
        metrics: value.metrics,
      },
    ]),
  ),
  total: result.total,
})

async function writeBaseline(result) {
  const expected = baselineView(result)
  const temporaryPath = resolve(
    dirname(baselinePath),
    `baseline.fast.tmp-${String(process.pid)}-${String(Date.now())}.json`,
  )
  try {
    await writeFile(temporaryPath, `${JSON.stringify(expected, null, 2)}\n`)
    await spawnCommand('pnpm', [
      'exec',
      'biome',
      'format',
      '--write',
      normalizeRepoPath(temporaryPath),
    ])
    const parsed = await readJson(temporaryPath)
    if (JSON.stringify(parsed) !== JSON.stringify(expected))
      throw new Error('格式化后的 coverage baseline 内容发生语义变化')
    await rename(temporaryPath, baselinePath)
    const persisted = await readJson(baselinePath)
    if (JSON.stringify(persisted) !== JSON.stringify(expected))
      throw new Error('coverage baseline 原子替换后复读不一致')
  } finally {
    await rm(temporaryPath, { force: true })
  }
}

function assertComparableProvider(actual, baseline) {
  if (
    baseline.schemaVersion !== 2 ||
    baseline.profile !== 'fast' ||
    baseline.provider?.name !== actual.provider.name ||
    baseline.provider?.vitest !== actual.provider.vitest ||
    baseline.provider?.coverageV8 !== actual.provider.coverageV8
  ) {
    throw new Error('覆盖率基线 schema/provider/version 不匹配；版本升级必须显式重建基线')
  }
}

function assertSafeRatchetScope(scopeAudit) {
  const existingSourceRemoval = scopeAudit.removals.find(
    (entry) =>
      (entry.kind === 'source' || entry.kind === 'package') &&
      existsSync(resolve(repoRoot, entry.value)),
  )
  if (existingSourceRemoval)
    throw new Error(`ratchet 不得把仍存在的生产范围移出 coverage: ${existingSourceRemoval.value}`)
  if (scopeAudit.removals.length > 0 && !allowScopeRemoval)
    throw new Error(
      `scope/test identity 有删除；核实真实删除或重命名后显式加 --allow-scope-removal:\n- ${scopeAudit.removals
        .slice(0, 8)
        .map((entry) => `${entry.kind}: ${entry.value}`)
        .join('\n- ')}`,
    )
}

async function readBaselineFromGit(ref) {
  const path = normalizeRepoPath(baselinePath)
  await spawnCapture('git', ['rev-parse', '--verify', `${ref}^{commit}`])
  const baselineExists = await gitPathExists(ref, path)
  const configExists = await gitPathExists(ref, 'scripts/coverage/config.mjs')
  const mode = classifyProtectedBaseline({ baselineExists, configExists })
  if (mode === 'bootstrap') return undefined
  const text = await spawnCapture('git', ['show', `${ref}:${path}`])
  return JSON.parse(text)
}

function assertCandidateDoesNotLowerProtectedBaseline(candidate, protectedBaseline) {
  assertComparableProvider(candidate, protectedBaseline)
  const comparison = compareCoverage(candidate, protectedBaseline, { allowNewPackages: true })
  if (comparison.regressions.length > 0)
    throw new Error(
      `候选 baseline 低于目标分支 baseline:\n- ${comparison.regressions.join('\n- ')}`,
    )
  const scopeAudit = auditScope(candidate, protectedBaseline)
  const unsafeSourceRemoval = scopeAudit.removals.find(
    (entry) =>
      (entry.kind === 'source' || entry.kind === 'package') &&
      existsSync(resolve(repoRoot, entry.value)),
  )
  if (unsafeSourceRemoval)
    throw new Error(`候选 baseline 缩窄仍存在的生产范围: ${unsafeSourceRemoval.value}`)
  const removedTestsInExistingFiles = scopeAudit.removals.filter(
    (entry) =>
      (entry.kind === 'test-file' || entry.kind === 'test-count') &&
      existsSync(resolve(repoRoot, entry.value)),
  )
  if (removedTestsInExistingFiles.length > 0)
    throw new Error(
      `候选 baseline 删除仍存在文件中的 fast tests:\n- ${removedTestsInExistingFiles
        .slice(0, 8)
        .map((entry) => `${entry.kind}: ${entry.value}`)
        .join('\n- ')}`,
    )
}

async function main() {
  await assertToolVersions()
  await assertFullInputs()
  const outputRoot = resolve(coverageRoot, profile)
  if (!outputRoot.startsWith(`${coverageRoot}${sep}`)) throw new Error('coverage 输出路径越界')
  await rm(outputRoot, { recursive: true, force: true })

  const packages = {}
  for (const packageConfig of coveragePackages) {
    packages[packageConfig.id] = await collectPackage(packageConfig, outputRoot)
  }
  const total = aggregateMetrics(Object.values(packages).map((item) => item.metrics))
  const generatedAt = new Date().toISOString()
  const result = {
    schemaVersion: 2,
    profile,
    generatedAt,
    provider: {
      name: coverageVersions.provider,
      vitest: coverageVersions.vitest,
      coverageV8: coverageVersions.coverageV8,
    },
    sourceFileCount: Object.values(packages).reduce(
      (count, item) => count + item.sourceFileCount,
      0,
    ),
    testCount: Object.values(packages).reduce(
      (count, item) => count + item.selectedTests.testCount,
      0,
    ),
    packages,
    total,
  }
  await writeFile(resolve(outputRoot, 'summary.json'), `${JSON.stringify(result, null, 2)}\n`)
  printSummary(result)

  let baseline
  try {
    baseline = await readJson(baselinePath)
  } catch (error) {
    if (!(error instanceof Error) || !('code' in error) || error.code !== 'ENOENT') throw error
  }

  if (!baseline) {
    if (!ratchet) throw new Error('尚无 fast coverage 基线；首次请运行 pnpm coverage:ratchet')
    await writeBaseline(result)
    console.log(`\n已建立首份覆盖率基线: ${normalizeRepoPath(baselinePath)}`)
    return
  }

  assertComparableProvider(result, baseline)
  const protectedRef = process.env.TYPE_PAL_COVERAGE_BASE_REF?.trim()
  if (protectedRef) {
    const protectedBaseline = await readBaselineFromGit(protectedRef)
    if (protectedBaseline) assertCandidateDoesNotLowerProtectedBaseline(baseline, protectedBaseline)
    else console.log(`\n目标分支 ${protectedRef} 尚无 coverage 设施；允许本次唯一 bootstrap。`)
  }

  const comparison = compareCoverage(result, baseline, { allowNewPackages: ratchet })
  if (comparison.regressions.length > 0)
    throw new Error(`覆盖率不得下降:\n- ${comparison.regressions.join('\n- ')}`)
  const scopeAudit = auditScope(result, baseline)
  if (!ratchet && scopeAudit.changes.length > 0)
    throw new Error(
      `生产源码或 fast 测试范围已变化；覆盖率未下降后用 pnpm coverage:ratchet 确认新基线:\n- ${scopeAudit.changes.join('\n- ')}`,
    )
  if (ratchet) {
    assertSafeRatchetScope(scopeAudit)
    if (comparison.improvements.length === 0 && scopeAudit.changes.length === 0) {
      console.log('\n覆盖率与范围均未提升；基线保持不变。')
      return
    }
    await writeBaseline(result)
    console.log(
      `\n覆盖率基线已只升不降地更新（提升 ${comparison.improvements.length} 项，范围变化 ${scopeAudit.changes.length} 项）`,
    )
  } else {
    console.log(
      `\n覆盖率门禁通过；相对 fast 基线未下降，提升 ${comparison.improvements.length} 项。`,
    )
  }
}

main().catch((error) => {
  console.error(`\n[coverage:${profile}] FAIL`)
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
