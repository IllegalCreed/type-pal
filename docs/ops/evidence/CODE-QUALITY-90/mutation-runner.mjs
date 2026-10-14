import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const packageRoot = join(repo, 'packages/game')
const sourceRel = 'src/core/menu/magic-script.ts'
const testRel = 'src/core/menu/magic-script.test.ts'
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')
const escapePattern = (name) => `^${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`

function run(command, args, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env: process.env })
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
    totalFailed: report.numFailedTests,
    runtimeError: /TypeError|ReferenceError|SyntaxError|Unhandled Error|vitest-pool/.test(
      output.stderr,
    ),
  }
}

async function copyFixture(root) {
  await cp(join(packageRoot, 'package.json'), join(root, 'package.json'))
  await cp(join(packageRoot, 'vitest.config.ts'), join(root, 'vitest.config.ts'))
  await cp(join(packageRoot, 'vitest.setup.ts'), join(root, 'vitest.setup.ts'))
  await cp(join(packageRoot, 'node_modules'), join(root, 'node_modules'), { recursive: true })
  await symlink(join(repo, 'node_modules/vitest'), join(root, 'node_modules/vitest'), 'dir')
  await symlink(join(repo, 'node_modules/.bin/vitest'), join(root, 'node_modules/.bin/vitest'))
  await cp(join(packageRoot, 'src'), join(root, 'src'), { recursive: true })
}

const singleName =
  'runMagicScriptSync - opcode 0x22 OP_REVIVE_PLAYER 单体复活：清 <=999 状态、保留 >999 装备状态，并按 roleId 作用于非顺序队伍'
const allName =
  'runMagicScriptSync - revive applyToAll g_fScriptSuccess applyAll：只清 party 中阵亡角色的 <=999，保留 >999 与 party 外角色状态'

const mutations = [
  {
    id: 'MUT-01',
    description: 'revive no longer clears temporary statuses',
    replace:
      '    const statuses = gs.rgPlayerStatus[roleId]\n    if (statuses)\n      for (let index = 0; index < statuses.length; index++)\n        if ((statuses[index] ?? 0) <= 999) statuses[index] = 0\n',
    with: '    const statuses = gs.rgPlayerStatus[roleId]\n    void statuses\n',
    fullName: singleName,
  },
  {
    id: 'MUT-02',
    description: 'boundary 999 is incorrectly retained',
    replace: 'if ((statuses[index] ?? 0) <= 999) statuses[index] = 0',
    with: 'if ((statuses[index] ?? 0) < 999) statuses[index] = 0',
    fullName: singleName,
  },
  {
    id: 'MUT-03',
    description: 'equipment sentinel 1000 is incorrectly cleared',
    replace: 'if ((statuses[index] ?? 0) <= 999) statuses[index] = 0',
    with: 'if ((statuses[index] ?? 0) <= 1000) statuses[index] = 0',
    fullName: allName,
  },
  {
    id: 'MUT-04',
    description: 'status row is addressed by party position instead of role id',
    replace: 'const statuses = gs.rgPlayerStatus[roleId]',
    with: 'const statuses = gs.rgPlayerStatus[gs.partyMembers.indexOf(roleId)]',
    fullName: singleName,
  },
]

async function main() {
  const temp = await mkdtemp(join(tmpdir(), 'type-pal-cq90-'))
  const rawDirectory = process.argv.includes('--legal-script-id')
    ? './mutation-raw-legal-script-id'
    : './mutation-raw'
  const rawRoot = resolve(new URL(rawDirectory, import.meta.url).pathname)
  await mkdir(rawRoot, { recursive: true })
  const original = await readFile(join(packageRoot, sourceRel))
  const originalSha = hash(original)
  const results = []
  const testArgs = ['exec', 'vitest', 'run', testRel, '--reporter=json']
  try {
    await copyFixture(temp)
    const canonicalRoot = await realpath(temp)
    const sourcePath = join(temp, sourceRel)
    const originalRun = await run('pnpm', testArgs, temp)
    await writeFile(join(rawRoot, 'original.txt'), originalRun.stdout + originalRun.stderr)
    if (originalRun.code !== 0) throw new Error('original test set was not green')
    results.push({
      phase: 'original',
      command: `pnpm ${testArgs.join(' ')}`,
      cwd: temp,
      exitCode: originalRun.code,
      assertions: assertions(originalRun, canonicalRoot),
    })
    const missingCleanup = original.toString().replace(mutations[0].replace, mutations[0].with)
    await writeFile(sourcePath, missingCleanup)
    const preFixRun = await run('pnpm', testArgs, temp)
    await writeFile(join(rawRoot, 'pre-fix-reproduction.txt'), preFixRun.stdout + preFixRun.stderr)
    const preFixAssertions = assertions(preFixRun, canonicalRoot)
    const preFixFailed = preFixAssertions.executed.filter((test) => test.status === 'failed')
    if (
      preFixRun.code !== 1 ||
      preFixAssertions.executed.length !== 31 ||
      preFixFailed.length !== 2 ||
      preFixAssertions.runtimeError ||
      !preFixFailed.every((test) => test.failureMessages[0]?.startsWith('AssertionError:'))
    )
      throw new Error('pre-fix reproduction did not produce the expected two business failures')
    results.push({
      phase: 'pre-fix-reproduction',
      command: `pnpm ${testArgs.join(' ')}`,
      exitCode: preFixRun.code,
      assertions: preFixAssertions,
    })
    await writeFile(sourcePath, original)
    for (const mutation of mutations) {
      const selectedArgs = [
        'exec',
        'vitest',
        'run',
        testRel,
        '-t',
        escapePattern(mutation.fullName),
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
      const baseline = assertions(baselineRun, canonicalRoot)
      const mutantAssertions = assertions(mutantRun, canonicalRoot)
      const restoredAssertions = assertions(restoredRun, canonicalRoot)
      const exactSet = (result, status) =>
        result.executed.length === 1 &&
        result.executed[0].file === testRel &&
        result.executed[0].fullName === mutation.fullName &&
        result.executed[0].status === status &&
        !result.runtimeError
      const exactBusinessFailure =
        mutantAssertions.totalFailed === 1 &&
        mutantAssertions.executed[0]?.failureMessages.length === 1 &&
        mutantAssertions.executed[0].failureMessages[0].startsWith('AssertionError:')
      const result = {
        id: mutation.id,
        description: mutation.description,
        command: ['pnpm', ...selectedArgs],
        executionIdentity: { file: testRel, fullName: mutation.fullName },
        executionIdentityMatched:
          exactSet(baseline, 'passed') &&
          exactSet(mutantAssertions, 'failed') &&
          exactSet(restoredAssertions, 'passed'),
        baselineAssertions,
        mutantAssertions,
        restoredAssertions,
        exactBusinessFailure,
        replacementOccurrences: occurrences,
        mutantExitCode: mutantRun.code,
        mutantRuntimeError: mutantAssertions.runtimeError,
        originalSha256: originalSha,
        mutantSha256: hash(mutant),
        restoredSha256: hash(restored),
        sourceRestoredByteIdentical: hash(restored) === originalSha,
        repositorySourceUnchanged:
          hash(await readFile(join(packageRoot, sourceRel))) === originalSha,
        testSha256: hash(await readFile(join(temp, testRel))),
        restoredExitCode: restoredRun.code,
      }
      results.push(result)
      if (
        mutantRun.code === 0 ||
        restoredRun.code !== 0 ||
        !result.executionIdentityMatched ||
        !result.exactBusinessFailure ||
        !result.sourceRestoredByteIdentical ||
        !result.repositorySourceUnchanged
      ) {
        throw new Error(`${mutation.id} did not produce a business red mutant and green restore`)
      }
    }
    await writeFile(join(rawRoot, 'mutation-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await rm(temp, { recursive: true, force: true })
  }
}

await main()
