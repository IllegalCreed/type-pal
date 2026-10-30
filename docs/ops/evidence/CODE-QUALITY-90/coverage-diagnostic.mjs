import { execFileSync, spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { createWriteStream } from 'node:fs'
import {
  access,
  copyFile,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { gzipSync } from 'node:zlib'
import {
  coverageExcludes,
  coveragePackages,
  testSelection,
} from '../../../../scripts/coverage/config.mjs'
import { preciseCoverageEnvironment } from '../../../../scripts/coverage/environment.mjs'

// Diagnostic only. Both counterfactuals intentionally remove the incoming RNG
// test in a disposable snapshot; neither can satisfy an official quality gate.
const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const evidence = resolve(new URL('./', import.meta.url).pathname)
const temp = await mkdtemp(join(tmpdir(), 'type-pal-cq92-coverage-scope-'))
const parent = 'd7e9831f4'
const sources = ['packages/game/src/core/event-system.ts', 'packages/game/src/core/game-state.ts']
const test = 'packages/game/src/core/menu/magic-script.test.ts'
const rngTest = 'packages/game/src/core/event-rng-scene-restore.test.ts'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const sourceBase = execFileSync('git', ['rev-parse', 'HEAD'], {
  cwd: repo,
  encoding: 'utf8',
}).trim()
const originals = new Map(
  await Promise.all(
    [...sources, test].map(async (path) => [path, await readFile(join(repo, path))]),
  ),
)
const result = {
  sourceBase,
  officialGate: false,
  purpose: 'isolate coverage effects of the incoming RNG test and two changed game sources',
  counterfactualTestRemoval: rngTest,
  environment: {
    TYPE_PAL_COVERAGE: '1',
    TYPE_PAL_COVERAGE_PROFILE: 'fast',
    VITEST_MAX_WORKERS: '2',
    NODE_DISABLE_COMPILE_CACHE: '1',
  },
  runs: [],
}

try {
  const archive = spawn('git', ['archive', sourceBase], {
    cwd: repo,
    stdio: ['ignore', 'pipe', 'inherit'],
  })
  const tar = spawn('tar', ['-x', '-C', temp], { stdio: ['pipe', 'inherit', 'inherit'] })
  archive.stdout.pipe(tar.stdin)
  const codes = await Promise.all(
    [archive, tar].map((child) => new Promise((done) => child.on('close', done))),
  )
  if (codes.some((code) => code !== 0)) throw new Error('current snapshot archive failed')
  const canonical = await realpath(temp)
  for (const path of [
    'node_modules',
    ...coveragePackages.map((pkg) => `${pkg.directory}/node_modules`),
    'data/raw',
    'data/extracted',
  ]) {
    try {
      await access(join(temp, path))
    } catch {
      await access(join(repo, path))
      await symlink(join(repo, path), join(temp, path), 'dir')
    }
  }
  await copyFile(join(repo, test), join(temp, test))
  await rm(join(temp, rngTest))
  const pkg = coveragePackages.find((candidate) => candidate.id === 'game')
  const selection = testSelection(pkg, 'fast')
  for (const phase of ['current-source-without-rng-test', 'parent-sources-without-rng-test']) {
    const sourceHashes = {}
    for (const path of sources) {
      const bytes = phase.startsWith('parent-')
        ? execFileSync('git', ['show', `${parent}:${path}`], { cwd: repo })
        : originals.get(path)
      await writeFile(join(temp, path), bytes)
      sourceHashes[path] = hash(bytes)
    }
    const report = join(temp, 'coverage', phase)
    const testReport = join(temp, `${phase}.json`)
    const args = [
      '--filter',
      pkg.name,
      'exec',
      'vitest',
      'run',
      ...selection.args,
      ...selection.excludes.flatMap((glob) => ['--exclude', glob]),
      '--coverage',
      '--coverage.provider=v8',
      `--coverage.reportsDirectory=${report}`,
      '--coverage.reporter=json-summary',
      '--coverage.reporter=lcov',
      '--reporter=json',
      `--outputFile=${testReport}`,
      ...pkg.include.flatMap((glob) => ['--coverage.include', glob]),
      ...coverageExcludes.flatMap((glob) => ['--coverage.exclude', glob]),
    ]
    const log = createWriteStream(join(evidence, `${phase}.txt`))
    const child = spawn('pnpm', args, {
      cwd: temp,
      env: preciseCoverageEnvironment(result.environment),
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    for (const stream of [child.stdout, child.stderr])
      stream.on('data', (bytes) => log.write(bytes))
    const exitCode = await new Promise((done) => child.on('close', done))
    await new Promise((done) => log.end(done))
    const testBytes = await readFile(testReport)
    const native = JSON.parse(testBytes)
    const assertions = native.testResults.flatMap((file) =>
      file.assertionResults.map((assertion) => ({
        file: relative(canonical, file.name),
        fullName: assertion.fullName,
        status: assertion.status,
        failureMessages: assertion.failureMessages,
      })),
    )
    const summary = JSON.parse(await readFile(join(report, 'coverage-summary.json')))
    for (const [name, bytes] of [
      ['tests.json', testBytes],
      ['summary.json', Buffer.from(JSON.stringify(summary))],
      ['lcov.txt', await readFile(join(report, 'lcov.info'))],
    ])
      await writeFile(join(evidence, `${phase}-${name}.gz`), gzipSync(bytes))
    result.runs.push({
      phase,
      command: ['pnpm', ...args],
      exitCode,
      sourceHashes,
      testSha256: hash(originals.get(test)),
      metrics: summary.total,
      executed: assertions.length,
      failed: assertions.filter((assertion) => assertion.status !== 'passed'),
    })
    console.log(
      JSON.stringify({ phase, exitCode, tests: assertions.length, metrics: summary.total }),
    )
    if (exitCode !== 0 || assertions.some((assertion) => assertion.status !== 'passed'))
      throw new Error(`${phase} diagnostic tests failed`)
  }
} catch (error) {
  result.error = String(error)
  process.exitCode = 1
} finally {
  result.repositoryFilesUnchanged = Object.fromEntries(
    await Promise.all(
      [...originals].map(async ([path, bytes]) => [
        path,
        hash(await readFile(join(repo, path))) === hash(bytes),
      ]),
    ),
  )
  await rm(temp, { recursive: true, force: true })
  result.temporaryDirectoryRemoved = true
  await writeFile(
    join(evidence, 'rng-test-scope-diagnostic-result.json'),
    `${JSON.stringify(result, null, 2)}\n`,
  )
}
