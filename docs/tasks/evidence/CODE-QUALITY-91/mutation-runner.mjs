import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, relative, resolve } from 'node:path'

const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const packageRoot = join(repo, 'packages/game')
const sourceRel = 'src/core/menu/inventory-action-menu.ts'
const testFiles = [
  'src/core/menu/inventory-action-menu.test.ts',
  'src/core/menu/inventory-action-menu.glm-phase1-leaves.test.ts',
]
const sourceFiles = [sourceRel, 'src/core/menu/primitives.ts', 'src/core/word-lookup.ts']
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
  const temp = await mkdtemp(join(tmpdir(), 'type-pal-cq91-'))
  const rawRoot = resolve(new URL('./mutation-raw', import.meta.url).pathname)
  await mkdir(rawRoot, { recursive: true })
  const original = await readFile(join(packageRoot, sourceRel))
  const originalSha = hash(original)
  const mutations = [
    {
      id: 'MUT-01',
      description: 'equip action loses canonical WORD id 22',
      replace: "{ id: 22, choice: 'equip', fallback: '装备' }",
      with: "{ id: 99, choice: 'equip', fallback: '装备' }",
      test: testFiles[0],
      fullName:
        'InventoryActionMenu(物品 / 装备 / 使用) id = 真 WORD id 22/23(ui.h:80-81 INVMENU_LABEL_EQUIP/USE,非下标)',
    },
    {
      id: 'MUT-02',
      description: 'out-of-range default cursor guard accepts index 5',
      replace: 'if (defaultCursor > 0 && defaultCursor < selection.items.length) {',
      with: 'if (defaultCursor > 0) {',
      test: testFiles[1],
      fullName:
        'L03 InventoryActionMenu 剩余合同 defaultCursor 越上界（≥ 项数）→ 保持建表默认 0（守卫分支）',
    },
    {
      id: 'MUT-03',
      description: 'down movement clamps at use instead of wrapping to equip',
      replace: 'moveSelectionDown(s.selection)',
      with: 's.selection.cursor = Math.min(s.selection.cursor + 1, 1)',
      test: testFiles[1],
      fullName:
        'L03 InventoryActionMenu 剩余合同 Down 两连：use → 环绕回 equip（2 项 SelectionMenu 环绕合同）',
    },
    {
      id: 'MUT-04',
      description: 'labels bypass WORD table and always use fallback text',
      replace: 'getWord(d.id, d.fallback)',
      with: 'd.fallback',
      test: testFiles[1],
      fullName:
        'L03 InventoryActionMenu 剩余合同 词表载入 → label 取 flat[22]/flat[23]（WORD.DAT 单一文案源，同 uigame.c:901-902）',
    },
  ]
  const results = []
  try {
    await copyFixture(temp)
    const canonicalRoot = await realpath(temp)
    const sourcePath = join(temp, sourceRel)
    const originalRun = await run('pnpm', args, temp)
    await writeFile(join(rawRoot, 'original.txt'), originalRun.stdout + originalRun.stderr)
    if (originalRun.code !== 0) throw new Error('original test set was not green')
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
  }
}

await main()
