import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import {
  cp,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  realpath,
  rm,
  symlink,
  writeFile,
} from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const packageRoot = join(repo, 'packages/game')
const sourceRel = 'src/core/menu/sell-menu.ts'
const testFiles = [
  'src/core/menu/sell-menu.test.ts',
  'src/core/menu/sell-menu.boundaries.test.ts',
  'src/core/menu/sell-menu.glm-phase1-leaves.test.ts',
]
const sourceFiles = [
  sourceRel,
  'src/core/menu/inventory-menu.ts',
  'src/core/menu/item-select.ts',
  'src/core/menu/primitives.ts',
  'src/core/game-state.ts',
]
const args = ['exec', 'vitest', 'run', ...testFiles, '--reporter=json']

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

function assertions(output, root) {
  const report = JSON.parse(output.stdout)
  const tests = report.testResults.flatMap((file) =>
    file.assertionResults.map((test) => ({
      file: relative(root, file.name),
      fullName: test.fullName,
      status: test.status,
      failureMessages: test.failureMessages,
    })),
  )
  return {
    success: report.success,
    executed: tests.filter((test) => ['passed', 'failed'].includes(test.status)),
    filtered: tests.filter((test) => !['passed', 'failed'].includes(test.status)),
    totalFailed: report.numFailedTests,
    runtimeError: /TypeError|ReferenceError|SyntaxError|Unhandled Error|vitest-pool/.test(
      output.stderr,
    ),
  }
}

const pattern = (name) => `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`

function run(command, commandArgs, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, commandArgs, { cwd, env: process.env })
    const stdout = []
    const stderr = []
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code, signal) =>
      resolveRun({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString(),
        stderr: Buffer.concat(stderr).toString(),
      }),
    )
  })
}

async function copyFixture(root) {
  await cp(join(packageRoot, 'package.json'), join(root, 'package.json'))
  await cp(join(packageRoot, 'vitest.config.ts'), join(root, 'vitest.config.ts'))
  await cp(join(packageRoot, 'vitest.setup.ts'), join(root, 'vitest.setup.ts'))
  await cp(join(packageRoot, 'node_modules'), join(root, 'node_modules'), { recursive: true })
  await symlink(join(repo, 'node_modules/vitest'), join(root, 'node_modules/vitest'), 'dir')
  await symlink(join(repo, 'node_modules/.bin/vitest'), join(root, 'node_modules/.bin/vitest'))
  for (const file of sourceFiles.concat(testFiles)) {
    const target = join(root, file)
    await mkdir(dirname(target), { recursive: true })
    await cp(join(packageRoot, file), target)
  }
}

async function main() {
  const temp = await mkdtemp(join(tmpdir(), 'type-pal-cq93-'))
  const rawRoot = resolve(new URL('./mutation-raw', import.meta.url).pathname)
  await mkdir(rawRoot, { recursive: true })
  const original = await readFile(join(packageRoot, sourceRel))
  const originalSha = hash(original)
  const mutations = [
    {
      id: 'MUT-01',
      description: 'exhausted inUse boundary incorrectly permits selection',
      replace: 'slot.count - slot.inUse <= 0',
      with: 'slot.count - slot.inUse < 0',
      test: testFiles[1],
      fullName:
        'G07 sellSelectItem 确认门与 confirm 期导航 inUse 耗尽拒绝；少占用正控进 confirm 并返回 No 意图',
    },
    {
      id: 'MUT-02',
      description: 'new selection retains previous Yes intent',
      replace: 's.confirmYes = false // sdlpal PAL_ConfirmMenu nDefault=0=No',
      with: '// keep stale confirmYes',
      test: testFiles[0],
      fullName:
        'sell-menu 全屏状态机(sdlpal PAL_SellMenu → PAL_ItemSelectMenu kItemFlagSellable) sellSelectItem:选中 sellable cursor → 进 confirm，每轮默认 No',
    },
    {
      id: 'MUT-03',
      description: 'refresh loses the selected nonzero cursor while list grows',
      replace: 'else s.grid.cursor = prevCursor',
      with: 'else s.grid.cursor = 0',
      test: testFiles[1],
      fullName:
        'G07 sellSelectItem 确认门与 confirm 期导航 增表刷新：保非零 cursor，不复用 GameState 记忆光标',
    },
  ]
  const results = []
  let removed = false
  try {
    await copyFixture(temp)
    const canonicalRoot = await realpath(temp)
    const sourcePath = join(temp, sourceRel)
    const originalRun = await run('pnpm', args, temp)
    await writeFile(join(rawRoot, 'original.txt'), originalRun.stdout + originalRun.stderr)
    const originalAssertions = assertions(originalRun, canonicalRoot)
    if (
      originalRun.code !== 0 ||
      originalRun.signal ||
      originalAssertions.filtered.length ||
      originalAssertions.runtimeError ||
      !originalAssertions.success
    )
      throw new Error('original test set was not clean green')
    results.push({
      phase: 'original',
      command: `pnpm ${args.join(' ')}`,
      cwd: temp,
      exitCode: originalRun.code,
      signal: originalRun.signal,
      sourceSha256: hash(await readFile(sourcePath)),
      assertions: assertions(originalRun, canonicalRoot),
    })
    for (const mutation of mutations) {
      const selectedArgs = [
        'exec',
        'vitest',
        'run',
        mutation.test,
        '-t',
        pattern(mutation.fullName),
        '--reporter=json',
      ]
      const baselineRun = await run('pnpm', selectedArgs, temp)
      await writeFile(
        join(rawRoot, `${mutation.id}-baseline.txt`),
        baselineRun.stdout + baselineRun.stderr,
      )
      const baselineAssertions = assertions(baselineRun, canonicalRoot)
      await writeFile(sourcePath, original)
      const before = await readFile(sourcePath, 'utf8')
      const occurrences = before.split(mutation.replace).length - 1
      if (occurrences !== 1)
        throw new Error(`${mutation.id} expected one replacement, got ${occurrences}`)
      await writeFile(sourcePath, before.replace(mutation.replace, mutation.with))
      const mutant = await readFile(sourcePath)
      const mutantRun = await run('pnpm', selectedArgs, temp)
      await writeFile(
        join(rawRoot, `${mutation.id}-mutant.txt`),
        mutantRun.stdout + mutantRun.stderr,
      )
      await writeFile(sourcePath, original)
      const restoredRun = await run('pnpm', selectedArgs, temp)
      await writeFile(
        join(rawRoot, `${mutation.id}-restored.txt`),
        restoredRun.stdout + restoredRun.stderr,
      )
      const restored = await readFile(sourcePath)
      const mutantOutput = mutantRun.stdout + mutantRun.stderr
      const mutantAssertions = assertions(mutantRun, canonicalRoot)
      const restoredAssertions = assertions(restoredRun, canonicalRoot)
      const exactSet = (result, status) =>
        result.executed.length === 1 &&
        result.executed[0].file === mutation.test &&
        result.executed[0].fullName === mutation.fullName &&
        result.executed[0].status === status &&
        !result.runtimeError
      const exactBusinessFailure =
        mutantAssertions.totalFailed === 1 &&
        mutantAssertions.executed[0]?.failureMessages.length === 1 &&
        mutantAssertions.executed[0].failureMessages[0].startsWith('AssertionError:')
      results.push({
        id: mutation.id,
        description: mutation.description,
        command: ['pnpm', ...selectedArgs],
        cwd: temp,
        executionIdentity: { file: mutation.test, fullName: mutation.fullName },
        executionIdentityMatched:
          exactSet(baselineAssertions, 'passed') &&
          exactSet(mutantAssertions, 'failed') &&
          exactSet(restoredAssertions, 'passed'),
        baselineAssertions,
        mutantAssertions,
        restoredAssertions,
        exactBusinessFailure,
        testSha256: hash(await readFile(join(temp, mutation.test))),
        baselineExitCode: baselineRun.code,
        baselineSignal: baselineRun.signal,
        rebuiltMutantSha256: hash(
          Buffer.from(original.toString().replace(mutation.replace, mutation.with)),
        ),
        repositorySourceUnchanged:
          hash(await readFile(join(packageRoot, sourceRel))) === originalSha,
        replacementOccurrences: occurrences,
        mutantExitCode: mutantRun.code,
        mutantSignal: mutantRun.signal,
        mutantBusinessAssertion: /AssertionError|expected/.test(mutantOutput),
        mutantRuntimeError: /TypeError|ReferenceError|SyntaxError|Unhandled Error/.test(
          mutantOutput,
        ),
        originalSha256: originalSha,
        mutantSha256: hash(mutant),
        restoredSha256: hash(restored),
        sourceRestoredByteIdentical: hash(restored) === originalSha,
        restoredExitCode: restoredRun.code,
        restoredSignal: restoredRun.signal,
      })
      if (
        mutantRun.code === 0 ||
        restoredRun.code !== 0 ||
        hash(restored) !== originalSha ||
        !/AssertionError|expected/.test(mutantOutput) ||
        /TypeError|ReferenceError|SyntaxError|Unhandled Error/.test(mutantOutput) ||
        baselineRun.code !== 0 ||
        !exactSet(baselineAssertions, 'passed') ||
        !exactSet(mutantAssertions, 'failed') ||
        !exactSet(restoredAssertions, 'passed') ||
        !exactBusinessFailure
      ) {
        throw new Error(
          `${mutation.id} did not produce a business red mutant and green byte-identical restore`,
        )
      }
    }
    await writeFile(join(rawRoot, 'mutation-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await rm(temp, { recursive: true, force: true })
    removed = await lstat(temp).then(
      () => false,
      (error) => {
        if (error.code === 'ENOENT') return true
        throw error
      },
    )
    await writeFile(
      join(rawRoot, 'cleanup.json'),
      `${JSON.stringify({ path: temp, removed, repositorySourceUnchanged: hash(await readFile(join(packageRoot, sourceRel))) === originalSha }, null, 2)}\n`,
    )
  }
  if (!removed) throw new Error('temporary fixture cleanup failed')
}

await main()
