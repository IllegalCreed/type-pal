import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

const repo = resolve(new URL('../../../../', import.meta.url).pathname)
const packageRoot = join(repo, 'packages/game')
const testFiles = [
  'src/core/menu/__tests__/item-magic-select.test.ts',
  'src/core/menu/magic-select.boundaries.test.ts',
  'src/core/menu/magic-select.glm-phase1-leaves.test.ts',
]
const sourceFiles = [
  'src/core/menu/magic-select.ts',
  'src/core/menu/primitives.ts',
  'src/core/menu/item-select.ts',
]
const commandArgs = ['exec', 'vitest', 'run', ...testFiles, '--reporter=json']

function sha256(bytes) {
  return createHash('sha256').update(bytes).digest('hex')
}

function run(command, args, cwd) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, { cwd, env: process.env })
    const stdout = []
    const stderr = []
    child.stdout.on('data', (chunk) => stdout.push(chunk))
    child.stderr.on('data', (chunk) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', (code, signal) => {
      resolveRun({
        code,
        signal,
        stdout: Buffer.concat(stdout).toString('utf8'),
        stderr: Buffer.concat(stderr).toString('utf8'),
      })
    })
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
    const from = join(packageRoot, file)
    const to = join(root, file)
    await mkdir(dirname(to), { recursive: true })
    await cp(from, to, { recursive: false })
  }
}

async function main() {
  const root = await mkdtemp(join(tmpdir(), 'type-pal-cq88-'))
  const rawRoot = resolve(new URL('./mutation-raw', import.meta.url).pathname)
  await mkdir(rawRoot, { recursive: true })
  const original = await readFile(join(packageRoot, sourceFiles[0]))
  const originalSha = sha256(original)
  const mutations = [
    {
      id: 'MUT-01',
      description: 'reverse object-id sort',
      replace: '.sort((a, b) => a - b)',
      with: '.sort((a, b) => b - a)',
    },
    {
      id: 'MUT-02',
      description: 'disable exact-MP spell',
      replace: 'cfg.currentMp < mpCost',
      with: 'cfg.currentMp <= mpCost',
    },
    {
      id: 'MUT-03',
      description: 'resolve spell by magicNumber instead of object id',
      replace: 's.id === spellId',
      with: 's.magicNumber === spellId',
    },
  ]
  const results = []
  try {
    await copyFixture(root)
    const sourcePath = join(root, sourceFiles[0])
    const originalRun = await run('pnpm', commandArgs, root)
    await writeFile(join(rawRoot, 'original.txt'), originalRun.stdout + originalRun.stderr)
    results.push({
      phase: 'original',
      command: `pnpm ${commandArgs.join(' ')}`,
      cwd: root,
      exitCode: originalRun.code,
      signal: originalRun.signal,
      sourceSha256: sha256(await readFile(sourcePath)),
    })
    if (originalRun.code !== 0) throw new Error('original test set was not green')

    for (const mutation of mutations) {
      await writeFile(sourcePath, original)
      const before = await readFile(sourcePath, 'utf8')
      const occurrences = before.split(mutation.replace).length - 1
      if (occurrences !== 1)
        throw new Error(`${mutation.id} expected one replacement, got ${occurrences}`)
      await writeFile(sourcePath, before.replace(mutation.replace, mutation.with))
      const mutant = await readFile(sourcePath)
      const mutantRun = await run('pnpm', commandArgs, root)
      await writeFile(
        join(rawRoot, `${mutation.id}-mutant.txt`),
        mutantRun.stdout + mutantRun.stderr,
      )
      await writeFile(sourcePath, original)
      const restoredRun = await run('pnpm', commandArgs, root)
      await writeFile(
        join(rawRoot, `${mutation.id}-restored.txt`),
        restoredRun.stdout + restoredRun.stderr,
      )
      const restored = await readFile(sourcePath)
      results.push({
        id: mutation.id,
        description: mutation.description,
        command: `pnpm ${commandArgs.join(' ')}`,
        cwd: root,
        replacementOccurrences: occurrences,
        mutantExitCode: mutantRun.code,
        mutantSignal: mutantRun.signal,
        mutantBusinessAssertion: /AssertionError|expected/.test(
          mutantRun.stdout + mutantRun.stderr,
        ),
        mutantRuntimeError: /TypeError|ReferenceError|SyntaxError|Unhandled Error/.test(
          mutantRun.stdout + mutantRun.stderr,
        ),
        originalSha256: originalSha,
        mutantSha256: sha256(mutant),
        restoredSha256: sha256(restored),
        sourceRestoredByteIdentical: sha256(restored) === originalSha,
        restoredExitCode: restoredRun.code,
        restoredSignal: restoredRun.signal,
      })
      if (mutantRun.code === 0 || restoredRun.code !== 0 || sha256(restored) !== originalSha) {
        throw new Error(
          `${mutation.id} did not produce red mutant and green byte-identical restore`,
        )
      }
    }
    await writeFile(join(rawRoot, 'mutation-results.json'), `${JSON.stringify(results, null, 2)}\n`)
    console.log(JSON.stringify(results, null, 2))
  } finally {
    await rm(root, { recursive: true, force: true })
  }
}

await main()
