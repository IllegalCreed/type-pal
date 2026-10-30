import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const packageRoot = join(repo, 'packages/game')
const testFiles = [
  'src/core/menu/in-game-magic-menu.test.ts',
  'src/core/menu/in-game-magic-menu.boundaries.test.ts',
  'src/core/menu/in-game-magic-menu.glm-phase1-leaves.test.ts',
]
const sourceFiles = [
  'src/core/menu/in-game-magic-menu.ts',
  'src/core/menu/magic-select.ts',
  'src/core/menu/primitives.ts',
]
const args = ['exec', 'vitest', 'run', ...testFiles, '--reporter=json']

const hash = (bytes) => createHash('sha256').update(bytes).digest('hex')

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
  const temp = await mkdtemp(join(tmpdir(), 'type-pal-cq89-'))
  const rawRoot = resolve(new URL('./mutation-raw', import.meta.url).pathname)
  await mkdir(rawRoot, { recursive: true })
  const sourceRel = sourceFiles[0]
  const original = await readFile(join(packageRoot, sourceRel))
  const originalSha = hash(original)
  const mutations = [
    {
      id: 'MUT-01',
      description: 'single-target confirm skips target phase',
      replace: "state.phase = 'pick-target'",
      with: "state.phase = 'pick-spell'",
    },
    {
      id: 'MUT-02',
      description: 'target cancel no longer returns to spell phase',
      replace: "if (state.phase === 'pick-target') {\n    state.phase = 'pick-spell'",
      with: "if (state.phase === 'pick-spell') {\n    state.phase = 'pick-spell'",
    },
    {
      id: 'MUT-03',
      description: 'outside picker includes battle-only spells',
      replace: 'const outsideSpells = spells.filter((s) => s.flags.usableOutsideBattle)',
      with: 'const outsideSpells = spells',
    },
  ]
  const results = []
  try {
    await copyFixture(temp)
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
    })
    for (const mutation of mutations) {
      await writeFile(sourcePath, original)
      const before = await readFile(sourcePath, 'utf8')
      const occurrences = before.split(mutation.replace).length - 1
      if (occurrences !== 1)
        throw new Error(`${mutation.id} expected one replacement, got ${occurrences}`)
      await writeFile(sourcePath, before.replace(mutation.replace, mutation.with))
      const mutant = await readFile(sourcePath)
      const mutantRun = await run('pnpm', args, temp)
      await writeFile(
        join(rawRoot, `${mutation.id}-mutant.txt`),
        mutantRun.stdout + mutantRun.stderr,
      )
      await writeFile(sourcePath, original)
      const restoredRun = await run('pnpm', args, temp)
      await writeFile(
        join(rawRoot, `${mutation.id}-restored.txt`),
        restoredRun.stdout + restoredRun.stderr,
      )
      const restored = await readFile(sourcePath)
      const mutantOutput = mutantRun.stdout + mutantRun.stderr
      results.push({
        id: mutation.id,
        description: mutation.description,
        command: `pnpm ${args.join(' ')}`,
        cwd: temp,
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
      if (mutantRun.code === 0 || restoredRun.code !== 0 || hash(restored) !== originalSha) {
        throw new Error(
          `${mutation.id} did not produce red mutant and green byte-identical restore`,
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
